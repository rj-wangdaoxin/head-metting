export const DYNASTIES = [
  { key: '先秦', order: 1 },
  { key: '秦汉', order: 2 },
  { key: '三国两晋南北朝', order: 3 },
  { key: '隋唐', order: 4 },
  { key: '宋', order: 5 },
  { key: '元', order: 6 },
  { key: '明', order: 7 },
  { key: '清', order: 8 },
  { key: '近现代', order: 9 },
] as const;

export const DYNASTY_KEYS = DYNASTIES.map((d) => d.key);
export const DYNASTY_ORDER: Record<string, number> = Object.fromEntries(
  DYNASTIES.map((d) => [d.key, d.order]),
);

export const CATEGORIES = [
  { key: '帝王', symbol: '玺' },
  { key: '文官', symbol: '笏' },
  { key: '武将', symbol: '戈' },
  { key: '谋士', symbol: '筹' },
  { key: '诗人', symbol: '诗' },
  { key: '词人', symbol: '词' },
  { key: '作家', symbol: '文' },
  { key: '思想家', symbol: '道' },
  { key: '史家', symbol: '史' },
  { key: '其他', symbol: '墨' },
] as const;

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);
export const CATEGORY_SYMBOL: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.symbol]),
);

/** 朝代水墨主色（用于印章、头像底、气泡描边） */
export const DYNASTY_COLOR: Record<string, string> = {
  先秦: '#6B5B3E',
  秦汉: '#3F3A33',
  三国两晋南北朝: '#35566B',
  隋唐: '#8A5A2B',
  宋: '#4E7A51',
  元: '#5A4A6B',
  明: '#9E3B2E',
  清: '#7A5C8A',
  近现代: '#3E5A6B',
};

/** 辩论发言气泡配色轮转（水墨五色） */
export const SPEAKER_COLORS = ['#9E3B2E', '#35566B', '#4E7A51', '#B8860B', '#6B5B3E', '#5A4A6B'];

/** 论辩语体：auto 随人物时代与本人语体自动取舍 */
export const DEBATE_LANGUAGES = [
  { key: 'auto', label: '随人物', hint: '按时代与本人语体：先秦秦汉多文言，民国以来转白话，其余半文半白' },
  { key: 'wenyan', label: '文言', hint: '通篇文言，句式简古，不为长篇引证' },
  { key: 'classic', label: '半文半白', hint: '骨文言而气平易，今人一读即懂（默认）' },
  { key: 'plain', label: '白话', hint: '现代白话，明白如话，仍守其身份与称谓' },
] as const;

export type DebateLanguage = (typeof DEBATE_LANGUAGES)[number]['key'];

export const DEBATE_LANGUAGE_KEYS: string[] = DEBATE_LANGUAGES.map((l) => l.key);
export const DEBATE_LANGUAGE_LABEL: Record<string, string> = Object.fromEntries(
  DEBATE_LANGUAGES.map((l) => [l.key, l.label]),
);

export const TONE_STYLES = ['文言', '半文半白', '激昂', '冷峻', '诙谐', '平实'] as const;

export const KNOWLEDGE_FOCUS = [
  '兵法',
  '权谋',
  '经世',
  '诗赋',
  '史学',
  '经学',
  '刑名',
  '农桑',
  '礼制',
  '心性',
] as const;

export const STRICTNESS_HINT: Record<number, string> = {
  1: '宽松：允许适度发挥与联想',
  2: '较宽松：以人物立场为主，细节可放宽',
  3: '标准：严格遵循史实与人设',
  4: '严格：一字一句须贴合其时代语境',
  5: '极严：仅用其本人著述与可靠典故立言',
};

/** 辩论会的五个环节 */
export const STAGE_LABEL: Record<string, string> = {
  OPENING: '立论',
  REBUTTAL: '驳论',
  QUERY: '质询',
  ANSWER: '应质',
  CLOSING: '结辩',
};

/** 三方阵营 */
export const STANCE_LABEL: Record<string, string> = {
  PRO: '主张',
  CON: '反对',
  MID: '折中',
};

export const STANCE_KEYS = ['PRO', 'CON', 'MID'] as const;

export const ROLE_TYPE_LABEL: Record<string, string> = {
  FIGURE: '本体',
  PERSONA: '分身',
  USER: '我',
  MODERATOR: '主持',
  SYSTEM: '系统',
};

export const PHASE_LABEL: Record<string, string> = {
  NORMAL: '论辩',
  CLOSING: '结辩',
  ENDED: '已毕',
};

export const SETTING_KEYS = {
  LLM_BASE_URL: 'llm.baseUrl',
  LLM_API_KEY: 'llm.apiKey',
  LLM_MODEL: 'llm.model',
  LLM_TEMPERATURE: 'llm.temperature',
  LLM_MAX_TOKENS: 'llm.maxTokens',
  LLM_TIMEOUT: 'llm.timeoutMs',
  DEBATE_MAX_PARTICIPANTS: 'debate.maxParticipants',
  DEBATE_ROUND_MIN: 'debate.roundMin',
  DEBATE_ROUND_MAX: 'debate.roundMax',
  DEBATE_ROUND_DEFAULT: 'debate.roundDefault',
  DEBATE_SPEECH_MAX_CHARS: 'debate.speechMaxChars',
  DEBATE_CLOSING_MAX_CHARS: 'debate.closingMaxChars',
  DEBATE_MESSAGE_CAP: 'debate.messageCap',
  DEBATE_TOKEN_BUDGET: 'debate.tokenBudget',
  DEBATE_EXTEND_CAP: 'debate.extendCap',
  DEBATE_JUDGMENT_DEFAULT: 'debate.judgmentDefault',
  DEBATE_LANGUAGE_DEFAULT: 'debate.languageDefault',
} as const;

export const DEFAULT_SETTINGS: Record<string, string> = {
  [SETTING_KEYS.LLM_BASE_URL]: 'https://api.deepseek.com/v1',
  [SETTING_KEYS.LLM_API_KEY]: '',
  [SETTING_KEYS.LLM_MODEL]: 'deepseek-chat',
  [SETTING_KEYS.LLM_TEMPERATURE]: '0.9',
  [SETTING_KEYS.LLM_MAX_TOKENS]: '1200',
  [SETTING_KEYS.LLM_TIMEOUT]: '120000',
  [SETTING_KEYS.DEBATE_MAX_PARTICIPANTS]: '3',
  [SETTING_KEYS.DEBATE_ROUND_MIN]: '1',
  [SETTING_KEYS.DEBATE_ROUND_MAX]: '10',
  [SETTING_KEYS.DEBATE_ROUND_DEFAULT]: '3',
  [SETTING_KEYS.DEBATE_SPEECH_MAX_CHARS]: '420',
  [SETTING_KEYS.DEBATE_CLOSING_MAX_CHARS]: '200',
  [SETTING_KEYS.DEBATE_MESSAGE_CAP]: '60',
  [SETTING_KEYS.DEBATE_TOKEN_BUDGET]: '60000',
  [SETTING_KEYS.DEBATE_EXTEND_CAP]: '3',
  [SETTING_KEYS.DEBATE_JUDGMENT_DEFAULT]: 'true',
  [SETTING_KEYS.DEBATE_LANGUAGE_DEFAULT]: 'auto',
};
