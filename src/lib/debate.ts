import type { ChatMessage } from '@/lib/llm';
import { chat } from '@/lib/llm';
import { prisma } from '@/lib/db';
import { parseJson, estimateTokens } from '@/lib/utils';
import { avatarMeta } from '@/lib/avatars';
import { DEBATE_LANGUAGE_KEYS, STANCE_LABEL } from '@/lib/constants';
import {
  buildHistoryMessages,
  buildJudgmentPrompt,
  buildSpeakerSystem,
  buildStancePrompt,
  buildSummaryPrompt,
  type DebateStage,
  type Stance,
  type StanceBriefFigure,
} from '@/lib/prompt';
import { getDebateLimits, getLlmConfig } from '@/lib/settings';

export type TurnAction =
  | { type: 'NEXT_ROUND' }
  | { type: 'SPECIFY'; participantId: string }
  | { type: 'USER_INTERJECT'; content: string; asModerator?: boolean };

export interface ParticipantInput {
  kind: 'FIGURE' | 'PERSONA';
  figureId: string;
  personaId?: string | null;
}

export interface StancePlan {
  motion: string;
  stances: { stance: Stance; claim: string | null }[];
}

function normalizeStance(value: unknown): Stance | null {
  const raw = String(value ?? '').trim().toUpperCase();
  return raw === 'PRO' || raw === 'CON' || raw === 'MID' ? raw : null;
}

/** 解析设席官返回的命题与阵营；模型写得歪（代码块、缺项、阵营不全）也能救回来 */
function parseStancePayload(raw: string, briefs: StanceBriefFigure[], topic: string): StancePlan | null {
  let data: { motion?: unknown; stances?: { name?: unknown; stance?: unknown; claim?: unknown }[] };
  try {
    const text = raw.trim().replace(/^```(?:json)?/i, '').replace(/```\s*$/, '');
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    data = JSON.parse(text.slice(start, end + 1));
  } catch (err) {
    console.error('[debate.stance] 命题解析失败：', (err as Error).message);
    return null;
  }

  const motion = String(data.motion ?? '').trim() || topic.trim();
  const list = Array.isArray(data.stances) ? data.stances : [];
  const byName = new Map(list.map((item) => [String(item?.name ?? '').trim(), item]));

  const stances = briefs.map((brief, index) => {
    const hit = byName.get(brief.name) ?? list[index];
    return {
      stance: normalizeStance(hit?.stance) ?? (index % 2 === 0 ? 'PRO' : 'CON'),
      claim: String(hit?.claim ?? '').trim() || null,
    };
  });

  // 无对立则不成辩：强令一正一反
  if (!stances.some((s) => s.stance === 'PRO')) stances[0] = { ...stances[0], stance: 'PRO' };
  if (stances.length > 1 && !stances.some((s) => s.stance === 'CON')) stances[1] = { ...stances[1], stance: 'CON' };

  return { motion, stances };
}

/**
 * 依各人生平推演命题与阵营。模型不可用或未配置时按座次强弱交替兜底，绝不阻塞开辩。
 */
export async function inferStances(
  topic: string,
  background: string | null,
  briefs: StanceBriefFigure[],
  userId: string,
): Promise<StancePlan> {
  const fallback = (): StancePlan => ({
    motion: topic.trim(),
    stances: briefs.map((_, i) => ({ stance: (i % 2 === 0 ? 'PRO' : 'CON') as Stance, claim: null })),
  });

  const config = await getLlmConfig(userId);
  if (!config.apiKey || !config.baseUrl || !config.model) return fallback();

  try {
    const raw = await chat(buildStancePrompt(topic, background, briefs), {
      ...config,
      temperature: Math.min(config.temperature, 0.7),
      maxTokens: Math.min(Math.max(config.maxTokens, 500), 900),
    });
    return parseStancePayload(raw, briefs, topic) ?? fallback();
  } catch (err) {
    console.error('[debate.stance]', (err as Error).message);
    return fallback();
  }
}

interface ResolvedRow {
  figure: {
    id: string;
    name: string;
    dynasty: string;
    category: string;
    inkColor: string;
    avatarUrl: string | null;
    enabled: boolean;
    roles: string;
    thoughts: string;
    personalityTraits: string;
    expertise: string;
  };
  personaId: string | null;
  displayName: string;
  kind: 'FIGURE' | 'PERSONA';
  stanceShift: string | null;
}

/** 选角解析：本体与分身统一成一份档案行，供建场与立阵共用 */
async function resolveRows(
  participants: ParticipantInput[],
  userId: string,
): Promise<{ ok: true; rows: ResolvedRow[] } | { ok: false; error: string }> {
  const rows: ResolvedRow[] = [];

  for (const item of participants) {
    if (item.kind === 'PERSONA' && item.personaId) {
      const persona = await prisma.persona.findFirst({
        where: { id: item.personaId, userId },
        include: { figure: true },
      });
      if (!persona) return { ok: false, error: '所选分身不存在或不属于此账号' };
      rows.push({
        figure: persona.figure,
        personaId: persona.id,
        displayName: persona.name,
        kind: 'PERSONA',
        stanceShift: persona.stanceShift,
      });
    } else {
      const figure = await prisma.figure.findUnique({ where: { id: item.figureId } });
      if (!figure || !figure.enabled) return { ok: false, error: '所选人物不可用' };
      rows.push({ figure, personaId: null, displayName: figure.name, kind: 'FIGURE', stanceShift: null });
    }
  }

  return { ok: true, rows };
}

function toStanceBriefs(rows: ResolvedRow[]): StanceBriefFigure[] {
  return rows.map((row) => ({
    name: row.displayName,
    dynasty: row.figure.dynasty,
    roles: parseJson<string[]>(row.figure.roles, []),
    thoughts: row.figure.thoughts,
    personalityTraits: parseJson<string[]>(row.figure.personalityTraits, []),
    expertise: parseJson<string[]>(row.figure.expertise, []),
    stanceShift: row.stanceShift,
  }));
}

/** 开辩前的「立阵」预览：只推演命题与阵营，不落库 */
export async function previewStancePlan(
  topic: string,
  background: string | null,
  participants: ParticipantInput[],
  userId: string,
): Promise<
  | { ok: true; motion: string; stances: { name: string; stance: Stance; claim: string }[] }
  | { ok: false; error: string }
> {
  const title = topic.trim();
  if (!title) return { ok: false, error: '请先立一个话题' };

  const resolved = await resolveRows(participants, userId);
  if (!resolved.ok) return { ok: false, error: resolved.error };

  const plan = await inferStances(title, background?.trim() || null, toStanceBriefs(resolved.rows), userId);

  return {
    ok: true,
    motion: plan.motion,
    stances: resolved.rows.map((row, index) => ({
      name: row.displayName,
      stance: plan.stances[index]?.stance ?? 'PRO',
      claim: plan.stances[index]?.claim ?? '',
    })),
  };
}

export async function createDebateSession(
  input: {
    topic: string;
    background?: string | null;
    participants: ParticipantInput[];
    roundLimit: number;
    allowJudgment: boolean;
    language?: string;
    /** 前端「立阵」后传来的命题与阵营；缺省则由服务端推演 */
    motion?: string | null;
    stances?: (string | null)[];
    claims?: (string | null)[];
  },
  userId: string,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const limits = await getDebateLimits(userId);
  const topic = input.topic.trim();
  if (!topic) return { ok: false, error: '请先立一个话题' };
  if (topic.length > 120) return { ok: false, error: '话题过长，请控制在一百二十字内' };
  if (input.participants.length < 1) return { ok: false, error: '请至少选择一位人物' };
  if (input.participants.length > limits.maxParticipants)
    return { ok: false, error: `本场至多 ${limits.maxParticipants} 位人物（后台可调整上限）` };

  const roundLimit = Math.min(Math.max(input.roundLimit || limits.roundDefault, limits.roundMin), limits.roundMax);
  const language = DEBATE_LANGUAGE_KEYS.includes(input.language ?? '')
    ? (input.language as string)
    : limits.languageDefault;

  const resolved = await resolveRows(input.participants, userId);
  if (!resolved.ok) return { ok: false, error: resolved.error };
  const rows = resolved.rows;

  // 命题与阵营：前端已「立阵」则照用，否则依各人生平推演
  const provided = input.stances ?? [];
  const useProvided = provided.length === rows.length && provided.some((s) => normalizeStance(s) !== null);
  const plan: StancePlan = useProvided
    ? {
        motion: input.motion?.trim() || topic,
        stances: rows.map((_, index) => ({
          stance: normalizeStance(provided[index]) ?? (index % 2 === 0 ? 'PRO' : 'CON'),
          claim: input.claims?.[index]?.trim() || null,
        })),
      }
    : await inferStances(topic, input.background?.trim() || null, toStanceBriefs(rows), userId);

  const session = await prisma.debateSession.create({
    data: {
      userId,
      topic,
      background: input.background?.trim() || null,
      maxParticipants: limits.maxParticipants,
      roundLimit,
      language,
      allowJudgment: input.allowJudgment,
      motion: plan.motion,
      participants: {
        create: rows.map((row, index) => ({
          kind: row.kind,
          figureId: row.figure.id,
          personaId: row.personaId,
          displayName: row.displayName,
          dynastyLabel: row.figure.dynasty,
          categoryLabel: row.figure.category,
          inkColor: row.figure.inkColor,
          sealChar: avatarMeta(row.figure.name, row.figure.dynasty, row.figure.category, row.figure.inkColor).char,
          avatarUrl: row.figure.avatarUrl,
          orderIndex: index,
          stance: plan.stances[index]?.stance ?? null,
          stanceClaim: plan.stances[index]?.claim ?? null,
        })),
      },
    },
  });

  return { ok: true, id: session.id };
}

/** 会话读取的唯一入口：带上 userId，跨账号访问一律查不到 */
export async function loadSession(sessionId: string, userId: string) {
  return prisma.debateSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      participants: { orderBy: { orderIndex: 'asc' } },
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });
}

export type LoadedSession = NonNullable<Awaited<ReturnType<typeof loadSession>>>;

/**
 * 对阵次序：主张方与反对方交错（甲一→乙一→甲二→乙二），而非依座次顺次轮转。
 * 顺次轮转下每个人只对着「下家」说话，交锋退化成一条首尾相接的链；交错之后，
 * 每个人的下一位必是异阵营，质询与驳论才有固定对象。
 */
export function speakingOrder<T extends { id: string; orderIndex: number; stance: string | null }>(
  participants: T[],
): T[] {
  const sorted = [...participants].sort((a, b) => a.orderIndex - b.orderIndex);
  let pro = sorted.filter((p) => p.stance === 'PRO');
  let con = sorted.filter((p) => p.stance !== 'PRO');

  // 无人主张或无人反对（含旧会话未分阵营）：按座次奇偶拆作两队，仍能交错
  if (pro.length === 0 || con.length === 0) {
    pro = sorted.filter((_, i) => i % 2 === 0);
    con = sorted.filter((_, i) => i % 2 === 1);
  }

  const out: T[] = [];
  for (let i = 0; i < Math.max(pro.length, con.length); i += 1) {
    if (pro[i]) out.push(pro[i]);
    if (con[i]) out.push(con[i]);
  }
  return out;
}

/** 本回合属于哪个环节：立论 / 驳论 / 质询 / 应质 / 结辩 */
export function stageFor(
  session: LoadedSession,
  participantId: string,
  round: number,
  phase: 'NORMAL' | 'CLOSING',
): DebateStage {
  if (phase === 'CLOSING') return 'CLOSING';
  if (round <= 1) return 'OPENING';

  // 质询排在倒数第二轮：一问一答成对，问者之后必有其异阵营作答
  const queryRound = session.roundLimit >= 3 && round === session.roundLimit - 1;
  if (queryRound) {
    const order = speakingOrder(session.participants);
    const seq = order.findIndex((p) => p.id === participantId);
    const hasAnswerer = seq < order.length - 1;
    if (seq % 2 === 0) return hasAnswerer ? 'QUERY' : 'REBUTTAL';
    return 'ANSWER';
  }
  return 'REBUTTAL';
}

/**
 * 轮次状态：一轮 = 同席者各发言一次（次序为对阵次序）。
 * completedRounds 为已完成的整轮数，activeRound 为当前进行中的轮次（从 1 起）。
 */
export function roundStatus(session: LoadedSession) {
  const sorted = speakingOrder(session.participants);
  const total = sorted.length;
  const normal = session.messages.filter((m) => m.phase === 'NORMAL' && m.participantId);
  const completedRounds = total > 0 ? Math.floor(normal.length / total) : 0;
  const activeRound = completedRounds + 1;
  const spokeIds = new Set(normal.filter((m) => m.round === activeRound).map((m) => m.participantId as string));
  const pending = sorted.filter((p) => !spokeIds.has(p.id));
  const closingPending = sorted.filter((p) => !p.closingDone);

  return { sorted, total, completedRounds, activeRound, spokeIds, pending, closingPending };
}

/** 计算当前应处的轮次，并挑出下一位发言人（单次发言场景，如点名） */
export function resolveNextSpeaker(session: LoadedSession) {
  const { sorted, activeRound, pending, closingPending } = roundStatus(session);

  if (session.phase === 'CLOSING') {
    const next = closingPending[0] ?? sorted[0];
    return {
      participant: next,
      round: Math.max(1, session.currentRound || activeRound),
      phase: 'CLOSING' as const,
    };
  }

  const next = pending[0] ?? sorted[0];
  return { participant: next, round: activeRound, phase: 'NORMAL' as const };
}

export interface TurnPlanItem {
  participantId: string;
  round: number;
  phase: 'NORMAL' | 'CLOSING';
}

/** 一次「推进」应完成的发言序列：常规轮为本人未发言者，结辩阶段为未结辩者 */
export function planRound(session: LoadedSession): TurnPlanItem[] {
  if (session.phase === 'ENDED') return [];
  const { activeRound, pending, closingPending } = roundStatus(session);

  if (session.phase === 'CLOSING') {
    return closingPending.map((p) => ({
      participantId: p.id,
      round: Math.max(1, session.currentRound || activeRound),
      phase: 'CLOSING' as const,
    }));
  }

  return pending.map((p) => ({ participantId: p.id, round: activeRound, phase: 'NORMAL' as const }));
}

export async function buildTurnMessages(
  session: LoadedSession,
  participantId: string,
  phase: 'NORMAL' | 'CLOSING',
  round: number,
  userId: string,
): Promise<{ system: string; history: ChatMessage[] }> {
  const limits = await getDebateLimits(userId);
  const participant = session.participants.find((p) => p.id === participantId);
  if (!participant) throw new Error('参与者不存在');

  const figure = await prisma.figure.findUnique({ where: { id: participant.figureId } });
  if (!figure) throw new Error('人物本体缺失');

  const persona = participant.personaId
    ? await prisma.persona.findFirst({ where: { id: participant.personaId, userId } })
    : null;

  const others = session.participants
    .filter((p) => p.id !== participantId)
    .map((p) => ({ name: p.displayName, dynasty: p.dynastyLabel ?? '' }));

  // 阵营：同阵者为援，异阵营者为敌；未定阵营者一律视作可驳之人
  const stance = (participant.stance as Stance | null) ?? null;
  const opponents = session.participants
    .filter((p) => p.id !== participantId)
    .filter((p) => (stance && p.stance ? p.stance !== stance : true))
    .map((p) => p.displayName);
  const allies = stance
    ? session.participants.filter((p) => p.id !== participantId && p.stance === stance).map((p) => p.displayName)
    : [];

  const stage = stageFor(session, participantId, round, phase);

  // 应质环节：把上一手抛来的质问原样递给本人，逼其正面作答
  const last = [...session.messages].reverse().find((m) => m.participantId && m.roleType !== 'SYSTEM');
  const pending =
    stage === 'ANSWER' && last && last.participantId !== participantId && last.round === round
      ? { question: last.content, from: last.speakerName }
      : null;

  const spokenThisRound = session.messages.filter((m) => m.phase === 'NORMAL' && m.round === round && m.participantId);
  const firstOfStage = spokenThisRound.length === 0;

  const system = buildSpeakerSystem(
    {
      name: figure.name,
      courtesy: figure.courtesy,
      dynasty: figure.dynasty,
      category: figure.category,
      roles: parseJson<string[]>(figure.roles, []),
      birthYear: figure.birthYear,
      deathYear: figure.deathYear,
      birthplace: figure.birthplace,
      biography: figure.biography,
      thoughts: figure.thoughts,
      personalityTraits: parseJson<string[]>(figure.personalityTraits, []),
      speakingStyle: parseJson<{ selfAddress: string; tone: string; catchphrases: string[] }>(figure.speakingStyle, {
        selfAddress: figure.name,
        tone: '',
        catchphrases: [],
      }),
      quotes: parseJson<{ text: string; source: string }[]>(figure.quotes, []),
      expertise: parseJson<string[]>(figure.expertise, []),
      taboos: parseJson<string[]>(figure.taboos, []),
    },
    persona
      ? {
          name: persona.name,
          personalityOverride: persona.personalityOverride,
          toneStyle: persona.toneStyle,
          knowledgeFocus: parseJson<string[]>(persona.knowledgeFocus, []),
          stanceShift: persona.stanceShift,
          extraPrompt: persona.extraPrompt,
          strictness: persona.strictness,
        }
      : null,
    {
      topic: session.topic,
      background: session.background,
      motion: session.motion,
      round,
      totalRounds: session.roundLimit,
      stage,
      maxChars: phase === 'CLOSING' ? limits.closingMaxChars : limits.speechMaxChars,
      others,
      opponents,
      allies,
      stance,
      stanceClaim: participant.stanceClaim,
      pendingQuestion: pending?.question ?? null,
      pendingFrom: pending?.from ?? null,
      firstOfStage,
      language: session.language,
    },
  );

  const history = buildHistoryMessages(
    session.messages.map((m) => ({
      participantId: m.participantId,
      speakerName: m.speakerName,
      roleType: m.roleType,
      content: m.content,
      phase: m.phase,
    })),
    participantId,
  );

  return { system, history };
}

export async function persistMessage(input: {
  sessionId: string;
  participantId: string | null;
  roleType: string;
  speakerName: string;
  round: number;
  phase: string;
  content: string;
  truncated?: boolean;
}) {
  const tokens = estimateTokens(input.content);
  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        sessionId: input.sessionId,
        participantId: input.participantId,
        roleType: input.roleType,
        speakerName: input.speakerName,
        round: input.round,
        phase: input.phase,
        content: input.content,
        truncated: input.truncated ?? false,
        tokens,
      },
    }),
    prisma.debateSession.update({
      where: { id: input.sessionId },
      data: { messageCount: { increment: 1 }, tokenUsed: { increment: tokens } },
    }),
  ]);
  return message;
}

/** 单次发言后的阶段推进与终止判定，返回是否已结束 */
export async function advanceSession(sessionId: string, spokeParticipantId: string | null, userId: string) {
  const limits = await getDebateLimits(userId);
  const session = await loadSession(sessionId, userId);
  if (!session) throw new Error('会话不存在');

  if (session.phase === 'NORMAL') {
    // 一轮 = 同席各发言一次；roundStatus 统一给出已完成的整轮数与进行中的轮次
    const { completedRounds, activeRound } = roundStatus(session);

    await prisma.debateSession.update({ where: { id: sessionId }, data: { currentRound: activeRound } });

    const capHit = session.messageCount >= limits.messageCap || session.tokenUsed >= limits.tokenBudget;
    if (completedRounds >= session.roundLimit || capHit) {
      await prisma.debateSession.update({
        where: { id: sessionId },
        data: { phase: 'CLOSING' },
      });
      await prisma.debateParticipant.updateMany({
        where: { sessionId },
        data: { closingDone: false },
      });
      return { phase: 'CLOSING' as const, ended: false, reason: capHit ? 'cap' : 'rounds' };
    }
    return { phase: 'NORMAL' as const, ended: false };
  }

  if (session.phase === 'CLOSING' && spokeParticipantId) {
    await prisma.debateParticipant.update({
      where: { id: spokeParticipantId },
      data: { closingDone: true },
    });

    const fresh = await loadSession(sessionId, userId);
    const allDone = fresh?.participants.every((p) => p.closingDone || p.id === spokeParticipantId) ?? false;
    if (allDone) {
      await finalizeSession(sessionId, userId);
      return { phase: 'ENDED' as const, ended: true };
    }
    return { phase: 'CLOSING' as const, ended: false };
  }

  return { phase: session.phase as 'NORMAL' | 'CLOSING' | 'ENDED', ended: session.phase === 'ENDED' };
}

/** 结束收尾：生成辩要综述与（可选的）判官评点 */
export async function finalizeSession(sessionId: string, userId: string) {
  const session = await loadSession(sessionId, userId);
  if (!session) return;

  const transcript = session.messages
    .filter((m) => m.roleType !== 'SYSTEM')
    .map((m) => ({
      speakerName: m.speakerName,
      round: m.round,
      phase: m.phase,
      content: m.content,
    }));

  // 辩要与评点是一次性长输出，另给充裕的超时，不受发言用的短超时限制
  const llm = await getLlmConfig(userId);
  const config = { ...llm, timeoutMs: Math.max(llm.timeoutMs, 60000) };
  const style = session.language === 'auto' ? 'classic' : session.language;
  let summary = '';
  let judgment = '';

  try {
    summary = await chat(buildSummaryPrompt(session.topic, session.background, transcript, style), {
      ...config,
      maxTokens: Math.max(400, Math.min(config.maxTokens, 900)),
    });
  } catch (err) {
    summary = `（辩要未能生成：${(err as Error).message}）`;
  }

  if (session.allowJudgment) {
    try {
      judgment = await chat(buildJudgmentPrompt(session.topic, transcript, style), {
        ...config,
        maxTokens: Math.max(400, Math.min(config.maxTokens, 900)),
      });
    } catch (err) {
      judgment = `（判官评点未能生成：${(err as Error).message}）`;
    }
  }

  await prisma.debateSession.update({
    where: { id: sessionId },
    data: { phase: 'ENDED', status: 'ENDED', busy: false, summary, judgment: judgment || null },
  });
}

/** 续一场：追加轮数并回到进行中，受续场次数上限约束 */
export async function extendSession(sessionId: string, userId: string) {
  const limits = await getDebateLimits(userId);
  const session = await loadSession(sessionId, userId);
  if (!session) return { ok: false as const, error: '会话不存在' };
  if (session.status !== 'ENDED') return { ok: false as const, error: '本场尚未结束，无需续场' };
  if (session.extensionCount >= limits.extendCap)
    return { ok: false as const, error: `已续 ${limits.extendCap} 场，此辩当止` };

  const add = Math.max(1, Math.min(limits.roundDefault, limits.roundMax));
  await prisma.debateSession.update({
    where: { id: sessionId },
    data: {
      phase: 'NORMAL',
      status: 'ACTIVE',
      busy: false,
      roundLimit: session.roundLimit + add,
      extensionCount: { increment: 1 },
      judgment: null,
    },
  });
  await prisma.debateParticipant.updateMany({ where: { sessionId }, data: { closingDone: false } });

  return { ok: true as const, added: add };
}

export function buildExportMarkdown(session: LoadedSession) {
  const lines: string[] = [];
  lines.push(`# ${session.topic}`);
  lines.push('');
  if (session.motion) lines.push(`> 命题：${session.motion}`);
  lines.push(
    `> 参与者：${session.participants
      .map((p) => `${p.displayName}（${p.dynastyLabel ?? ''}${p.stance ? `·${STANCE_LABEL[p.stance] ?? p.stance}方` : ''}）`)
      .join('、')}`,
  );
  lines.push(`> 轮数：${session.roundLimit}　发言：${session.messages.length} 条　时间：${session.createdAt.toLocaleString('zh-CN')}`);
  if (session.background) lines.push(`> 背景：${session.background}`);
  lines.push('');

  let lastRound = -1;
  let lastPhase = '';
  for (const message of session.messages) {
    if (message.roleType === 'SYSTEM') continue;
    const isNewBlock = message.phase !== lastPhase || (message.phase === 'NORMAL' && message.round !== lastRound);
    if (isNewBlock) {
      lastPhase = message.phase;
      lastRound = message.round;
      lines.push('---\n');
      lines.push(message.phase === 'CLOSING' ? '### 结辩' : `### 第 ${message.round} 轮`);
      lines.push('');
    }
    const label =
      message.roleType === 'USER' ? '我' : message.roleType === 'MODERATOR' ? '主持' : message.speakerName;
    lines.push(`**${label}**：${message.content}`);
    lines.push('');
  }

  if (session.summary) {
    lines.push('---\n');
    lines.push('### 辩要\n');
    lines.push(session.summary);
    lines.push('');
  }
  if (session.judgment) {
    lines.push('### 判官评点\n');
    lines.push(session.judgment);
    lines.push('');
  }

  return lines.join('\n');
}
