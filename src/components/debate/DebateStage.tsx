'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Download, Gavel, Hand, ScrollText, Square, StepForward } from 'lucide-react';
import { SpeechBubble } from '@/components/debate/SpeechBubble';
import { InkSeal } from '@/components/ink/InkSeal';
import { CloudDivider } from '@/components/ink/CloudDivider';
import { ScrollCard } from '@/components/ink/ScrollCard';
import { DEBATE_LANGUAGE_LABEL, PHASE_LABEL, STAGE_LABEL, STANCE_LABEL } from '@/lib/constants';
import type { DebateMessageView, ParticipantView } from '@/lib/types';
import { cn } from '@/lib/utils';

export interface StageSession {
  id: string;
  topic: string;
  background: string | null;
  motion: string | null;
  roundLimit: number;
  language: string;
  currentRound: number;
  phase: string;
  status: string;
  extensionCount: number;
  allowJudgment: boolean;
  messageCount: number;
  summary: string | null;
  judgment: string | null;
  participants: ParticipantView[];
  messages: DebateMessageView[];
}

interface Props {
  session: StageSession;
  limits: { extendCap: number; roundDefault: number; messageCap: number; tokenBudget: number };
}

interface StreamState {
  participantId: string;
  speakerName: string;
  sealChar: string;
  inkColor: string;
  dynasty: string | null;
  round: number;
  phase: string;
  stage: string | null;
  roleType: string;
  text: string;
}

export function DebateStage({ session, limits }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<DebateMessageView[]>(session.messages);
  const [participants, setParticipants] = useState<ParticipantView[]>(session.participants);
  const [phase, setPhase] = useState(session.phase);
  const [status, setStatus] = useState(session.status);
  const [currentRound, setCurrentRound] = useState(session.currentRound);
  const [roundLimit, setRoundLimit] = useState(session.roundLimit);
  const [extensionCount, setExtensionCount] = useState(session.extensionCount);
  const [summary, setSummary] = useState(session.summary);
  const [judgment, setJudgment] = useState(session.judgment);
  const [stream, setStream] = useState<StreamState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [asModerator, setAsModerator] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const textRef = useRef('');
  const streamRef = useRef<StreamState | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const ended = status === 'ENDED';
  const scrollDown = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);

  const participantOf = (id: string | null) => participants.find((p) => p.id === id) ?? null;

  const applyDone = (payload: {
    phase: string;
    ended: boolean;
    session?: {
      phase: string;
      status: string;
      currentRound: number;
      roundLimit: number;
      extensionCount: number;
      summary: string | null;
      judgment: string | null;
    } | null;
  }) => {
    if (payload.session) {
      setPhase(payload.session.phase);
      setStatus(payload.session.status);
      setCurrentRound(payload.session.currentRound);
      setRoundLimit(payload.session.roundLimit);
      setExtensionCount(payload.session.extensionCount);
      if (payload.session.summary) setSummary(payload.session.summary);
      if (payload.session.judgment) setJudgment(payload.session.judgment);
    }
  };

  const runTurn = async (action: { type: string; participantId?: string }) => {
    if (busy || ended) return;
    setBusy(true);
    setError(null);
    textRef.current = '';
    streamRef.current = null;
    setStream(null);
    const controller = new AbortController();
    abortRef.current = controller;

    /** 把当前流式段落固化为一条消息（整轮推进时依次固化每位发言） */
    const commitStream = (truncated: boolean) => {
      const meta = streamRef.current;
      const content = textRef.current.trim();
      streamRef.current = null;
      textRef.current = '';
      setStream(null);
      if (!meta || !content) return;
      setMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}-${meta.participantId}`,
          participantId: meta.participantId,
          roleType: meta.roleType,
          speakerName: meta.speakerName,
          round: meta.round,
          phase: meta.phase,
          stage: meta.stage,
          content,
          truncated,
        },
      ]);
      // 结辩阶段：该位已陈词，侧栏与按钮的「余几人」随之更新
      if (meta.phase === 'CLOSING') {
        setParticipants((prev) =>
          prev.map((p) => (p.id === meta.participantId ? { ...p, closingDone: true } : p)),
        );
      }
      scrollDown();
    };

    try {
      const res = await fetch(`/api/debate/${session.id}/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setError(err.error ?? `请求失败（${res.status}）`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? '';

        for (const chunk of chunks) {
          const line = chunk.split('\n').find((l) => l.trim().startsWith('data:'));
          if (!line) continue;
          let evt: Record<string, unknown>;
          try {
            evt = JSON.parse(line.slice(line.indexOf('data:') + 5).trim());
          } catch {
            continue;
          }

          if (evt.type === 'meta') {
            const participant = participantOf(evt.participantId as string);
            const snapshot: StreamState = {
              participantId: evt.participantId as string,
              speakerName: (evt.speakerName as string) || participant?.displayName || '',
              sealChar: (evt.sealChar as string) || participant?.sealChar || '言',
              inkColor: (evt.inkColor as string) || participant?.inkColor || '#2B2B28',
              dynasty: (evt.dynasty as string) ?? participant?.dynastyLabel ?? null,
              round: Number(evt.round ?? 1) || 1,
              phase: (evt.phase as string) || 'NORMAL',
              stage: (evt.stage as string) ?? null,
              roleType: (evt.kind as string) === 'PERSONA' || participant?.kind === 'PERSONA' ? 'PERSONA' : 'FIGURE',
              text: '',
            };
            streamRef.current = snapshot;
            textRef.current = '';
            setStream(snapshot);
            scrollDown();
          } else if (evt.type === 'delta') {
            textRef.current += evt.text as string;
            if (streamRef.current) streamRef.current.text = textRef.current;
            setStream((prev) => (prev ? { ...prev, text: textRef.current } : prev));
            scrollDown();
          } else if (evt.type === 'segment') {
            commitStream(Boolean(evt.truncated));
          } else if (evt.type === 'error') {
            setError(evt.message as string);
          } else if (evt.type === 'done') {
            commitStream(false);
            applyDone({
              phase: evt.phase as string,
              ended: Boolean(evt.ended),
              session: evt.session as never,
            });
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setError((err as Error).message);
    } finally {
      // 中断时收不到 segment 事件，就地固化已生成的部分
      commitStream(true);
      setBusy(false);
      setStream(null);
      abortRef.current = null;
      scrollDown();
    }
  };

  const interject = async () => {
    const content = draft.trim();
    if (!content || busy || ended) return;
    setDraft('');
    await fetch(`/api/debate/${session.id}/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: { type: 'USER_INTERJECT', content, asModerator } }),
    });
    setMessages((prev) => [
      ...prev,
      {
        id: `u-${Date.now()}`,
        participantId: null,
        roleType: asModerator ? 'MODERATOR' : 'USER',
        speakerName: asModerator ? '主持' : '我',
        round: Math.max(1, currentRound),
        phase: phase === 'CLOSING' ? 'CLOSING' : 'NORMAL',
        content,
        truncated: false,
      },
    ]);
    scrollDown();
  };

  const endNow = async () => {
    if (busy || ended) return;
    setBusy(true);
    const res = await fetch(`/api/debate/${session.id}/summary`, { method: 'POST' });
    const data = (await res.json().catch(() => ({}))) as { summary?: string; judgment?: string };
    setStatus('ENDED');
    setPhase('ENDED');
    setSummary(data.summary ?? null);
    setJudgment(data.judgment ?? null);
    setBusy(false);
    scrollDown();
  };

  const extend = async () => {
    const res = await fetch(`/api/debate/${session.id}/extend`, { method: 'POST' });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; added?: number; error?: string };
    if (!data.ok) {
      setError(data.error ?? '续场失败');
      return;
    }
    setStatus('ACTIVE');
    setPhase('NORMAL');
    setRoundLimit((prev) => prev + (data.added ?? 1));
    setExtensionCount((prev) => prev + 1);
    setJudgment(null);
    setParticipants((prev) => prev.map((p) => ({ ...p, closingDone: false })));
    router.refresh();
  };

  /** 按阵营分队，对阵关系一眼可见 */
  const sides = useMemo(() => {
    const pick = (stance: string | null) => participants.filter((p) => p.stance === stance);
    return [
      { key: 'PRO', label: '主张方', tone: 'text-cinnabar', list: pick('PRO') },
      { key: 'CON', label: '反对方', tone: 'text-indigo', list: pick('CON') },
      { key: 'MID', label: '折中方', tone: 'text-gold', list: pick('MID') },
      { key: 'NONE', label: '未分阵营', tone: 'text-ink-mute', list: pick(null) },
    ].filter((group) => group.list.length > 0);
  }, [participants]);

  /** 本轮进度：一轮 = 同席按座次各发言一次 */
  const roundInfo = useMemo(() => {
    const total = participants.length;
    const normal = messages.filter((m) => m.phase === 'NORMAL' && m.participantId);
    const completed = total > 0 ? Math.floor(normal.length / total) : 0;
    const activeRound = completed + 1;
    const spoke = new Set(
      normal.filter((m) => m.round === activeRound).map((m) => m.participantId as string),
    );
    const pending = participants
      .filter((p) => !spoke.has(p.id))
      .sort((a, b) => a.orderIndex - b.orderIndex);
    const closingPending = participants.filter((p) => !p.closingDone);
    return { total, completed, activeRound, spokeCount: spoke.size, pending, closingPending };
  }, [messages, participants]);

  const groups = useMemo(() => {
    const list = [...messages];
    const result: { key: string; title: string; items: DebateMessageView[] }[] = [];
    for (const message of list) {
      const key = message.phase === 'CLOSING' ? 'closing' : `round-${message.round}`;
      const title = message.phase === 'CLOSING' ? '结辩' : `第 ${message.round} 轮`;
      const last = result[result.length - 1];
      if (last && last.key === key) last.items.push(message);
      else result.push({ key, title, items: [message] });
    }
    return result;
  }, [messages]);

  /** 服务端旧录不带环节，据轮次与本轮次序补出 */
  const deriveStage = (round: number, phase: string, seq: number, total: number) => {
    if (phase === 'CLOSING') return 'CLOSING';
    if (round <= 1) return 'OPENING';
    if (roundLimit >= 3 && round === roundLimit - 1) {
      if (seq % 2 === 0) return seq < total - 1 ? 'QUERY' : 'REBUTTAL';
      return 'ANSWER';
    }
    return 'REBUTTAL';
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[190px,1fr,300px]">
      <aside className="space-y-3">
        <ScrollCard className="p-3">
          <p className="ink-label mb-3">对阵</p>
          <div className="space-y-3">
            {sides.map((side) => (
              <div key={side.key}>
                <p className={`mb-1.5 text-[11px] ${side.tone}`}>{side.label}</p>
                <div className="space-y-2">
                  {side.list.map((p) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <InkSeal char={p.sealChar} color={p.inkColor} size={30} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-serif text-sm text-ink">{p.displayName}</p>
                        <p className="truncate text-[11px] text-ink-mute" title={p.stanceClaim ?? undefined}>
                          {p.stanceClaim || p.dynastyLabel}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={busy || ended}
                        onClick={() => runTurn({ type: 'SPECIFY', participantId: p.id })}
                        className="rounded-sm border border-paper-line px-1.5 py-0.5 text-[11px] text-ink-mute transition-colors hover:border-cinnabar/50 hover:text-cinnabar disabled:cursor-not-allowed disabled:opacity-40"
                        title="点名发言"
                      >
                        @
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollCard>
      </aside>

      <section className="min-w-0">
        <ScrollCard className="flex h-[calc(100vh-13rem)] min-h-[420px] flex-col p-0">
          <div className="thin-scrollbar flex-1 space-y-6 overflow-y-auto px-5 py-5">
            <CloudDivider label="开 场" />
            <div className="rounded-sm border border-dashed border-paper-line bg-paper-deep/50 px-4 py-3">
              <p className="font-serif text-base text-ink">{session.topic}</p>
              {session.background ? (
                <p className="mt-1 text-xs leading-6 text-ink-mute">{session.background}</p>
              ) : null}
              {session.motion ? (
                <p className="mt-2 border-l-2 border-cinnabar/50 pl-2 text-sm leading-6 text-cinnabar">
                  命题：{session.motion}
                </p>
              ) : null}
            </div>

            {groups.map((group) => (
              <div key={group.key} className="space-y-4">
                <CloudDivider label={group.title === '结辩' ? '结 辩' : `第 ${group.title.replace(/\D/g, '')} 轮`} />
                {group.items.map((message, index) => {
                  const participant = participantOf(message.participantId);
                  // 服务端旧录不带环节，依轮次与本轮次序补出
                  const seq = group.items.slice(0, index).filter((m) => m.participantId).length;
                  const stageKey =
                    message.stage ?? deriveStage(message.round, message.phase, seq, participants.length);
                  return (
                    <SpeechBubble
                      key={message.id}
                      speakerName={message.speakerName}
                      label={message.roleType === 'USER' ? '我' : message.roleType === 'MODERATOR' ? '主持' : message.speakerName}
                      content={message.content}
                      inkColor={participant?.inkColor ?? '#2B2B28'}
                      sealChar={participant?.sealChar ?? '言'}
                      dynasty={participant?.dynastyLabel}
                      stageLabel={participant ? STAGE_LABEL[stageKey] ?? null : null}
                      stance={participant?.stance ?? null}
                      closing={message.phase === 'CLOSING'}
                      truncated={message.truncated}
                    />
                  );
                })}
              </div>
            ))}

            {stream ? (
              <SpeechBubble
                speakerName={stream.speakerName}
                label={stream.speakerName}
                content={stream.text || '（凝神构思……）'}
                inkColor={stream.inkColor}
                sealChar={stream.sealChar}
                dynasty={stream.dynasty}
                stageLabel={stream.stage ? STAGE_LABEL[stream.stage] ?? null : null}
                stance={participantOf(stream.participantId)?.stance ?? null}
                streaming
                closing={stream.phase === 'CLOSING'}
              />
            ) : null}

            {summary ? (
              <div>
                <CloudDivider label="辩 要" />
                <div className="scroll-card border-l-2 border-gold/60 bg-gold/5 px-4 py-3 text-[15px] leading-7 text-ink-soft text-justify-cn">
                  {summary}
                </div>
              </div>
            ) : null}

            {judgment ? (
              <div>
                <CloudDivider label="判 官 评 点" />
                <div className="scroll-card border-l-2 border-indigo/60 bg-indigo/5 px-4 py-3 text-[15px] leading-7 text-ink-soft text-justify-cn">
                  {judgment}
                </div>
              </div>
            ) : null}

            <div ref={bottomRef} />
          </div>

          <div className="border-t border-paper-line bg-paper-card/80 px-4 py-3">
            {error ? (
              <p className="mb-2 rounded-sm bg-cinnabar/10 px-3 py-1.5 text-xs text-cinnabar">{error}</p>
            ) : null}

            {ended ? (
              <div className="flex flex-wrap items-center gap-2">
                <a href={`/api/debate/${session.id}/export`} className="ink-btn-ghost">
                  <Download size={14} /> 导出辩录
                </a>
                {extensionCount < limits.extendCap ? (
                  <button type="button" onClick={extend} className="ink-btn-ghost">
                    <StepForward size={14} /> 续一场（余 {limits.extendCap - extensionCount} 次）
                  </button>
                ) : (
                  <span className="text-xs text-ink-mute">续场已尽，此辩封存。</span>
                )}
                <Link href="/debate" className="ink-btn-primary ml-auto">
                  另立话题
                </Link>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => runTurn({ type: 'NEXT_ROUND' })}
                  disabled={busy || (phase === 'CLOSING' && roundInfo.closingPending.length === 0)}
                  className="ink-btn-seal"
                >
                  {busy ? <Square size={14} /> : <StepForward size={14} />}
                  {busy
                    ? '发言中……'
                    : phase === 'CLOSING'
                      ? `完成结辩（余 ${roundInfo.closingPending.length} 人）`
                      : roundInfo.pending.length >= roundInfo.total
                        ? '推进下一轮'
                        : `推进本轮（余 ${roundInfo.pending.length} 人）`}
                </button>

                {busy ? (
                  <button
                    type="button"
                    onClick={() => abortRef.current?.abort()}
                    className="ink-btn-ghost text-cinnabar"
                  >
                    <Square size={14} /> 中断
                  </button>
                ) : null}

                <div className="flex min-w-[220px] flex-1 items-center gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        interject();
                      }
                    }}
                    placeholder={asModerator ? '以主持身份下达指令……' : '插一句话，或追问某人……'}
                    className="ink-input h-9 py-1"
                  />
                  <button
                    type="button"
                    onClick={() => setAsModerator((v) => !v)}
                    title="切换身份"
                    className={cn(
                      'rounded-sm border px-2 py-1.5 text-xs transition-colors',
                      asModerator
                        ? 'border-indigo bg-indigo/10 text-indigo'
                        : 'border-paper-line text-ink-mute hover:border-ink/30',
                    )}
                  >
                    {asModerator ? <Gavel size={14} /> : <Hand size={14} />}
                  </button>
                  <button type="button" onClick={interject} disabled={!draft.trim()} className="ink-btn-ghost">
                    发言
                  </button>
                </div>

                <button type="button" onClick={endNow} disabled={busy} className="ink-btn-ghost">
                  <ScrollText size={14} /> 收束成辩要
                </button>
              </div>
            )}
          </div>
        </ScrollCard>
      </section>

      <aside className="space-y-3">
        <ScrollCard className="p-4">
          <p className="ink-label mb-2">本场</p>
          <div className="space-y-2 text-xs text-ink-mute">
            <p>
              阶段：
              <span
                className={cn(
                  'ml-1 rounded-sm px-1.5 py-0.5',
                  ended ? 'bg-ink/10 text-ink' : phase === 'CLOSING' ? 'bg-gold/15 text-gold' : 'bg-cinnabar/10 text-cinnabar',
                )}
              >
                {PHASE_LABEL[phase] ?? phase}
              </span>
            </p>
            <p>
              轮次：第 {Math.min(roundInfo.activeRound, roundLimit)} / {roundLimit} 轮
              {extensionCount > 0 ? `（已续 ${extensionCount} 场）` : ''}
            </p>
            <p>
              本轮：{Math.min(roundInfo.spokeCount, roundInfo.total)} / {roundInfo.total} 人已发言
            </p>
            <p>
              待发言：
              {phase === 'CLOSING'
                ? roundInfo.closingPending.map((p) => p.displayName).join('、') || '已全部结辩'
                : roundInfo.pending.map((p) => p.displayName).join('、') || '本轮已毕'}
            </p>
            <p>语体：{DEBATE_LANGUAGE_LABEL[session.language] ?? '半文半白'}</p>
            <p>
              发言：{messages.length} / {limits.messageCap} 条
            </p>
            <p>判官评点：{session.allowJudgment ? '结束后生成' : '不生成'}</p>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-paper-line">
            <div
              className="h-full bg-cinnabar/70 transition-all duration-500"
              style={{
                width: `${Math.min(100, (Math.min(roundInfo.activeRound - 1, roundLimit) / Math.max(1, roundLimit)) * 100)}%`,
              }}
            />
          </div>
          <p className="mt-2 text-[11px] leading-5 text-ink/50">
            一轮指同席各发言一次：点「推进本轮」即按座次依次发言。轮满自动结辩，各作短陈；发言条数或耗用额度触顶亦强制收束。
          </p>
        </ScrollCard>

        <ScrollCard className="p-4">
          <p className="ink-label mb-2">用法</p>
          <ul className="space-y-1.5 text-[11px] leading-5 text-ink-mute">
            <li>· 点「推进本轮」：本轮未发言者按座次依次发言，全轮一次走完。</li>
            <li>· 点左侧「@」可指定某人立即发言（只生成一位）。</li>
            <li>· 下方输入框可插话；切为主持可下达指令。</li>
            <li>· 发言中可「中断」，已生成部分照存。</li>
          </ul>
        </ScrollCard>
      </aside>
    </div>
  );
}
