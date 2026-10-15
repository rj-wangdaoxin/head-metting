import type { ChatMessage } from '@/lib/llm';
import { STAGE_LABEL, STANCE_LABEL, STRICTNESS_HINT } from '@/lib/constants';

export interface SpeakerFigure {
  name: string;
  courtesy: string | null;
  dynasty: string;
  category: string;
  roles: string[];
  birthYear: number | null;
  deathYear: number | null;
  birthplace: string | null;
  biography: string;
  thoughts: string;
  personalityTraits: string[];
  speakingStyle: { selfAddress: string; tone: string; catchphrases: string[] };
  quotes: { text: string; source: string }[];
  expertise: string[];
  taboos: string[];
}

export interface SpeakerPersona {
  name: string;
  personalityOverride: string | null;
  toneStyle: string | null;
  knowledgeFocus: string[];
  stanceShift: string | null;
  extraPrompt: string | null;
  strictness: number;
}

/** 辩论会的五个环节，各有硬任务，不再笼统按「轮」发言 */
export type DebateStage = 'OPENING' | 'REBUTTAL' | 'QUERY' | 'ANSWER' | 'CLOSING';

export type Stance = 'PRO' | 'CON' | 'MID';

/**
 * 篇幅区间：上限只是天花板，不是目标长度。
 * 各环节的常态区间不同——驳论宜短促，立论宜展开，质询只消一两问。
 */
export function stageCharBounds(stage: DebateStage, maxChars: number) {
  const hard = Math.max(30, Math.round(maxChars));
  const at = (ratio: number) => Math.max(20, Math.round(maxChars * ratio));
  switch (stage) {
    case 'OPENING':
      return { lo: at(0.45), hi: at(0.8), hard };
    case 'REBUTTAL':
      return { lo: at(0.25), hi: at(0.55), hard };
    case 'QUERY':
      return { lo: 15, hi: Math.max(30, Math.min(80, at(0.2))), hard: Math.max(40, Math.min(110, at(0.3))) };
    case 'ANSWER':
      return { lo: at(0.35), hi: at(0.7), hard };
    case 'CLOSING':
      return { lo: at(0.5), hi: hard, hard };
  }
}

export interface DebateBrief {
  topic: string;
  background?: string | null;
  motion?: string | null;
  round: number;
  totalRounds: number;
  stage: DebateStage;
  maxChars: number;
  others: { name: string; dynasty: string }[];
  opponents: string[];
  allies: string[];
  stance?: Stance | null;
  stanceClaim?: string | null;
  /** 上一手抛来的质问，本回合须先正面作答 */
  pendingQuestion?: string | null;
  pendingFrom?: string | null;
  /** 是否本轮首位发言者——首位面前无人可驳，只立己论 */
  firstOfStage?: boolean;
  language?: string;
}

/** 三种语体的具体写法要求 */
const STYLE_RULES: Record<string, string> = {
  wenyan:
    '语体：通篇文言。句式简古，以单句短句为主；可引其本人之语与常典，但不作长篇引证，不堆砌生僻典故。',
  classic:
    '语体：半文半白——以文言为骨、以浅近为气。句子宜短，多用常见字，句末可自然带「的、了、也、罢了」等虚字；务使今人一读即懂，不生造现代词、不堆砌生僻典、不用「赋能」「底层逻辑」一类今语。',
  plain:
    '语体：现代白话，明白如话，以说清道理为要；但不得使用当代网络流行语、科技术语、外语词与 AI 相关措辞，其自称、称谓与身份分寸仍须保留。',
};

/** auto：按时代与本人语体取舍——先秦秦汉多文言，近世转浅近 */
export function resolveLanguage(language: string | null | undefined, dynasty: string): 'wenyan' | 'classic' | 'plain' {
  if (language === 'wenyan' || language === 'classic' || language === 'plain') return language;
  // 民国以来的人物本人即用白话立言，随人物时应还原为白话
  if (dynasty === '近现代') return 'plain';
  return ['先秦', '秦汉'].includes(dynasty) ? 'wenyan' : 'classic';
}

const NARRATIVE_STYLE: Record<string, string> = {
  wenyan: '以文言书写',
  classic: '以半文半白的雅正笔调书写',
  plain: '以白话书写，明白条畅',
};

export const SPEECH_RULES = `【论辩通则】
一、时代一致：不得提及你卒年之后的人物、事件、制度与器物；不得出现现代词汇、外语词、网络用语、AI 或模型自称；不得预知后世对你的评价。
二、语体一致：使用你的自称与习惯用语，贴合你的身份与时代；可引本人著述与可靠典故，但不作长篇引文。
三、阵营一致：既已定立场，便须守到底；纵对方论据确凿，亦可有分寸地让步一二，然不得改旗易帜、不得倒向对方。
四、交锋铁律（凡席上已有他人发言，必守）：
　其一，点名：直呼其名，不得泛称「有人」「对方」；
　其二，引其言：引他一句具体主张，照其原意，不得曲解、不得夸大；
　其三，破其一处：指其破绽之所在——或事实有误、或推理不成、或例证不当、或偷换概念、或避重就轻；只说「所言甚是」一类附和，算不得交锋；
　其四，立己证：驳完之后补一条对方难驳的依据，不可只破不立。
　不得复述对方原话超过一句，不得自说自话，不得以邀约、寒暄、客套开场。
五、篇幅：字数依内容而定，见本场环节之限；一击即中则三五十字亦足，须展开则尽言。严禁以空话、堆典、重复充塞篇幅，切勿每番都写满上限。
六、输出：只输出发言正文，不加小标题、不加「某某曰」前缀、不写括号里的动作或心理、不使用 Markdown 标记。`;

/** 各环节的硬任务；对立阵营以名点出，交锋才有具体对象 */
function stageRule(brief: DebateBrief, sideLine: string): string {
  const { lo, hi, hard } = stageCharBounds(brief.stage, brief.maxChars);
  const len = `篇幅：通常 ${lo}–${hi} 字，最多不过 ${hard} 字；宁短勿冗。`;
  const head = `【当前环节·${STAGE_LABEL[brief.stage]}｜第 ${brief.round} 轮 / 共 ${brief.totalRounds} 轮】`;

  switch (brief.stage) {
    case 'OPENING':
      return `${head}
一、断：就命题给出明确判断——是或否、当或不当，不得模棱两可、不得各打五十大板；
二、据：举一条你最硬的依据（亲历之事、本朝制度、典籍之言或史事），说清它何以支撑你的判断；
三、争：${
        brief.firstOfStage
          ? '你是本轮首个发言者，尚无交锋对象，径立己论即可。'
          : '先一句点明你与何人、在何处分歧（指名 + 其主张之要），再立己论；不可把前人的话当作无物。'
      }
${len}`;

    case 'REBUTTAL':
      return `${head}
一、点名：直取对方阵营中人（${sideLine}）；
二、引其言：引他最近一句主张，照其原意；
三、破其一处：指其破绽——事实有误／推理不成／例证不当／偷换概念／避重就轻，择其一，说清何以不成立；
四、立己证：补一条对方难驳的依据，末了一句收束。
驳人要快，三两句见血；切勿铺陈身世、切勿重述己方全论。${len}`;

    case 'QUERY':
      return `${head}
本回合你只发问，不作论证。向对方阵营（${sideLine}）提一个最难回避的质问：
须直取其立论最薄弱的一环，或逼其自相矛盾，或逼其承认后果之不堪；
一到两句为限，末了点名「某某，请答」；不许自答，不许夹带己论，不许两问并作一问。${len}`;

    case 'ANSWER':
      return `${head}
${brief.pendingFrom ? `${brief.pendingFrom}向你质问：${brief.pendingQuestion ?? ''}` : '对方抛来一问，须先答之。'}
一、先正面作答：给一个是或否的判断，再说明理由；绕开不答、反诘了事，皆算失守；
二、后指其失：若其设问本身有破绽（前提不实、两难虚设），可于答后指出，然不可只驳不答；
三、答毕可反提一问，或补一句己论。${len}`;

    case 'CLOSING':
      return `${head}
论辩已历 ${brief.totalRounds} 轮，现为结辩：
一、认账：先认下对方最有力的一击（指名道姓），说明你何以仍不折服，或何以让步；
二、收束：将己方主张收为一句定论，不再开新论；
三、打的：向对方留最后一问或一句断语，语气从容而不失锋芒。${len}`;
  }
}

export function buildSpeakerSystem(
  figure: SpeakerFigure,
  persona: SpeakerPersona | null,
  brief: DebateBrief,
): string {
  const sideLine =
    brief.opponents.length > 0
      ? brief.opponents.join('、')
      : brief.others.map((o) => o.name).join('、') || '同席者';
  const yearLine = [
    figure.birthYear ? `生于${figure.birthYear < 0 ? `公元前${-figure.birthYear}` : figure.birthYear}年` : null,
    figure.deathYear ? `卒于${figure.deathYear < 0 ? `公元前${-figure.deathYear}` : figure.deathYear}年` : null,
    figure.birthplace ? `籍贯${figure.birthplace}` : null,
  ]
    .filter(Boolean)
    .join('，');

  const facts = `【身份档案·不可变】
姓名：${figure.name}${figure.courtesy ? `，字${figure.courtesy}` : ''}。${figure.dynasty}人，身份：${figure.roles.join('、')}${figure.category ? `（${figure.category}）` : ''}。
${yearLine ? `生卒籍贯：${yearLine}。` : ''}
生平：${figure.biography}
核心思想：${figure.thoughts}
性情：${figure.personalityTraits.join('、')}
言语习惯：自称「${figure.speakingStyle.selfAddress}」；${figure.speakingStyle.tone}；习惯用语：${figure.speakingStyle.catchphrases.map((c) => `「${c}」`).join('')}
所长：${figure.expertise.join('、')}
可引之语：${figure.quotes.map((q) => `「${q.text}」（${q.source}）`).join(' ')}
立言之禁：${figure.taboos.join('；')}`;

  const personaLayer = persona
    ? `【分身差异层·可调】
分身名：${persona.name}
${persona.personalityOverride ? `性格倾向：${persona.personalityOverride}\n` : ''}${persona.toneStyle ? `语气风格：${persona.toneStyle}\n` : ''}${persona.knowledgeFocus.length ? `知识侧重：${persona.knowledgeFocus.join('、')}\n` : ''}${persona.stanceShift ? `立场偏移：${persona.stanceShift}\n` : ''}${persona.extraPrompt ? `额外设定：${persona.extraPrompt}\n` : ''}约束强度：${persona.strictness}（${STRICTNESS_HINT[persona.strictness]}）
差异层不得与身份档案冲突；若冲突，以身份档案为准。`
    : '';

  const motion = brief.motion?.trim() || brief.topic;
  const sideBlock = brief.stance
    ? `【本场命题】${motion}\n【你的阵营】${STANCE_LABEL[brief.stance]}方${
        brief.allies.length ? `；与你同阵者：${brief.allies.join('、')}` : ''
      }；你的对手：${sideLine}\n【你的主张】${brief.stanceClaim?.trim() || '依你生平与思想，就命题给出你的判断'}`
    : `【本场命题】${motion}\n【你的阵营】未分阵营：据你的生平与思想立言，不必迎合；同席者皆可为你的论敌。`;

  const phaseRule = stageRule(brief, sideLine);

  const styleKey = resolveLanguage(brief.language, figure.dynasty);

  return `你是${figure.name}${persona ? `的分身「${persona.name}」` : ''}。以下档案为本台所存之不可变史料，你必须据此立言，不得偏离。

${facts}

${personaLayer}

${SPEECH_RULES}

【本场语体】${STYLE_RULES[styleKey]}
（语体只定文白与句式；你的自称、口癖、尊称与身份分寸仍照档案，不得因此改作今人口吻。）

${sideBlock}

${phaseRule}

【今日话题】${brief.topic}${brief.background ? `\n背景：${brief.background}` : ''}
【同席者】${brief.others.map((o) => `${o.name}（${o.dynasty}）`).join('、') || '无'}
【面对者】向你提问或主持者，可称「足下」「阁下」或依你的身份称呼之。`;
}

/** 按角色视角裁剪历史：他人发言以「某某曰」形式进入 user 轮 */
export function buildHistoryMessages(
  history: { participantId: string | null; speakerName: string; roleType: string; content: string; phase: string }[],
  selfParticipantId: string,
  keep = 12,
): ChatMessage[] {
  const recent = history.slice(-keep);
  const omitted = history.length - recent.length;
  const messages: ChatMessage[] = [];

  if (omitted > 0) {
    messages.push({
      role: 'user',
      content: `（此前${omitted}次发言已略去，以下为最近的交锋。若需引用更早的论点，请依你所记得的立场作答。）`,
    });
  }

  for (const item of recent) {
    if (item.roleType === 'USER' || item.roleType === 'MODERATOR') {
      messages.push({ role: 'user', content: `【${item.roleType === 'MODERATOR' ? '主持' : '问者'}】${item.content}` });
      continue;
    }
    if (item.participantId === selfParticipantId) {
      messages.push({ role: 'assistant', content: item.content });
      continue;
    }
    messages.push({ role: 'user', content: `【${item.speakerName}】${item.content}` });
  }

  return messages;
}

export function buildOpeningInstruction(topic: string, background?: string | null, stage: DebateStage = 'OPENING') {
  const charge: Record<DebateStage, string> = {
    OPENING: '请立论：就命题断其是非，举一条最硬的依据，不得模棱两可。',
    REBUTTAL: '请驳：指名、引其言、破其一处，再补己证。',
    QUERY: '请发问：只问不答，一句质问点名令答。',
    ANSWER: '请正面作答，再可反诘。',
    CLOSING: '请结辩：认下对方最有力的一击，收为一句定论。',
  };
  return `话题既立：${topic}。${background ? `背景：${background}。` : ''}${charge[stage]}`;
}

export function buildSummaryPrompt(
  topic: string,
  background: string | null,
  transcript: { speakerName: string; round: number; phase: string; content: string }[],
  language = 'classic',
) {
  const body = transcript
    .map((m) => `［${m.phase === 'CLOSING' ? '结辩' : `第${m.round}轮`}］${m.speakerName}：${m.content}`)
    .join('\n');
  const style = NARRATIVE_STYLE[language] ?? NARRATIVE_STYLE.classic;

  return [
    {
      role: 'system' as const,
      content: `你是这场跨朝代论辩的记室。请${style}，写一段「辩要」：先述命题与交锋焦点（谁与谁在哪一处相持不下），再分列各家主张（每人一两句，注明其依据），末了点出未能解决的分歧。控制在三百字内，不评价胜负，不作现代术语，不虚构发言，不使用 Markdown 标记。`,
    },
    {
      role: 'user' as const,
      content: `话题：${topic}${background ? `\n背景：${background}` : ''}\n\n全场发言：\n${body}\n\n请作辩要。`,
    },
  ];
}

export interface StanceBriefFigure {
  name: string;
  dynasty: string;
  roles: string[];
  thoughts: string;
  personalityTraits: string[];
  expertise: string[];
  stanceShift?: string | null;
}

/**
 * 开辩前的「立阵」：把开放式话题炼成可争议的是非题，并按各人生平指派阵营与主张。
 * 有对立才有交锋——这一步是辩论会与座谈会的分水岭。
 */
export function buildStancePrompt(
  topic: string,
  background: string | null,
  figures: StanceBriefFigure[],
): { role: 'system' | 'user'; content: string }[] {
  const roster = figures
    .map(
      (f, i) =>
        `${i + 1}. ${f.name}（${f.dynasty}·${f.roles.join('、')}）\n　思想：${f.thoughts}\n　性情：${f.personalityTraits.join('、')}\n　所长：${f.expertise.join('、')}${
          f.stanceShift ? `\n　立场偏移：${f.stanceShift}` : ''
        }`,
    )
    .join('\n');

  return [
    {
      role: 'system',
      content: `你是辩论会的设席官。给定话题与在场人物，你要做两件事：
一、把话题炼成一句**可争议的是非题**（命题），使人只能答「当」或「不当」、「是」或「否」，不得是开放式议题。命题三十字内，用文言或半文半白。
二、为每位人物指派阵营与主张：
　PRO = 主张命题成立；CON = 反对命题成立；MID = 以为两皆未尽，别有出路。
　主张须是该人物在此命题下、据其生平思想真会说的一句话，二十至四十字，须有具体凭据（制度、史事、典籍、亲历），不得是空泛表态。
铁律：在场诸人中**至少一人 PRO、至少一人 CON**（二人时一正一反；三人以上可容一个 MID）；若话题本身褒贬不明，则就其中最可争处设立正反。
只输出 JSON，形如：{"motion":"……","stances":[{"name":"商鞅","stance":"PRO","claim":"……"}]}，不要解释、不要用代码块包裹。`,
    },
    {
      role: 'user',
      content: `话题：${topic}${background ? `\n背景：${background}` : ''}\n\n在场人物：\n${roster}\n\n请立命题、分阵营。`,
    },
  ];
}

export function buildJudgmentPrompt(
  topic: string,
  transcript: { speakerName: string; round: number; phase: string; content: string }[],
  language = 'classic',
) {
  const body = transcript
    .map((m) => `［${m.phase === 'CLOSING' ? '结辩' : `第${m.round}轮`}］${m.speakerName}：${m.content}`)
    .join('\n');
  const style = NARRATIVE_STYLE[language] ?? NARRATIVE_STYLE.classic;

  return [
    {
      role: 'system' as const,
      content: `你是一位博通经史的「判官」，只作中立评点，不扮演任何在场人物。请${style}，从四个角度评这场论辩：一、谁最贴合其历史本色与身份（言必有据、不越时代）；二、谁的论证最扎实（举证、推理、回应是否到位）；三、**交锋得失**：谁直面了对方的质问与反驳（点名道姓、引其原话、指其破绽），谁避而不答、顾左右而言他、或以「所言甚是」一类客套敷衍——回避两次以上者，当指名道姓点出；四、谁偏离了史实或自身的立场。末了给一句总评，并可判其胜负（谁占上风、或未分轩轾）。条理分明，三百五十字内，不涉现代术语，不虚构发言，不使用 Markdown 标记。`,
    },
    {
      role: 'user' as const,
      content: `话题：${topic}\n\n全场发言：\n${body}\n\n请作判官评点。`,
    },
  ];
}
