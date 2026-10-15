import { prisma } from '@/lib/db';
import { DEFAULT_SETTINGS, SETTING_KEYS } from '@/lib/constants';

export type SettingsMap = Record<string, string>;

/**
 * 平台兜底配置：部署方以环境变量注入一套共用模型参数。
 * 访客自己不填密钥也能直接开辩；一旦自己填了，便以他自己的为准。
 */
function platformFallback(): SettingsMap {
  const picked: Record<string, string | undefined> = {
    [SETTING_KEYS.LLM_BASE_URL]: process.env.LLM_BASE_URL,
    [SETTING_KEYS.LLM_API_KEY]: process.env.LLM_API_KEY,
    [SETTING_KEYS.LLM_MODEL]: process.env.LLM_MODEL,
    [SETTING_KEYS.LLM_TEMPERATURE]: process.env.LLM_TEMPERATURE,
    [SETTING_KEYS.LLM_MAX_TOKENS]: process.env.LLM_MAX_TOKENS,
    [SETTING_KEYS.LLM_TIMEOUT]: process.env.LLM_TIMEOUT_MS,
  };

  const out: SettingsMap = {};
  for (const [key, value] of Object.entries(picked)) {
    const trimmed = (value ?? '').trim();
    if (trimmed) out[key] = trimmed;
  }
  return out;
}

/** 平台共用模型是否可用；密钥只回传脱敏形态，绝不进页面 */
export function platformModel() {
  const map = platformFallback();
  const apiKey = map[SETTING_KEYS.LLM_API_KEY] ?? '';
  const baseUrl = map[SETTING_KEYS.LLM_BASE_URL] ?? '';
  const model = map[SETTING_KEYS.LLM_MODEL] ?? '';
  return { enabled: Boolean(apiKey && baseUrl && model), baseUrl, model, keyHint: maskApiKey(apiKey) };
}

/** 账号自己的配置（不含平台兜底）：后台展示用，避免把平台密钥下发到浏览器 */
export async function getOwnSettings(userId: string): Promise<SettingsMap> {
  const rows = await prisma.setting.findMany({ where: { userId } });
  const map: SettingsMap = { ...DEFAULT_SETTINGS };
  for (const row of rows) map[row.key] = row.value;
  return map;
}

/** 模型密钥与辩论配额现按账号各自保存，取用一律带上 userId；缺省项由平台兜底补上 */
export async function getSettings(userId: string): Promise<SettingsMap> {
  const map = await getOwnSettings(userId);
  const fallback = platformFallback();
  for (const [key, value] of Object.entries(fallback)) {
    if (!map[key]) map[key] = value;
  }
  return map;
}

export async function getSetting(userId: string, key: string): Promise<string> {
  const row = await prisma.setting.findUnique({ where: { userId_key: { userId, key } } });
  return row?.value ?? DEFAULT_SETTINGS[key] ?? platformFallback()[key] ?? '';
}

export async function updateSettings(userId: string, patch: SettingsMap): Promise<void> {
  for (const [key, value] of Object.entries(patch)) {
    await prisma.setting.upsert({
      where: { userId_key: { userId, key } },
      create: { userId, key, value },
      update: { value },
    });
  }
}

export async function getNumberSetting(userId: string, key: string, fallback: number): Promise<number> {
  const raw = await getSetting(userId, key);
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

export async function getBoolSetting(userId: string, key: string, fallback: boolean): Promise<boolean> {
  const raw = await getSetting(userId, key);
  if (!raw) return fallback;
  return raw === 'true';
}

export async function getLlmConfig(userId: string) {
  const settings = await getSettings(userId);
  return {
    baseUrl: settings[SETTING_KEYS.LLM_BASE_URL] || '',
    apiKey: settings[SETTING_KEYS.LLM_API_KEY] || '',
    model: settings[SETTING_KEYS.LLM_MODEL] || '',
    temperature: Number(settings[SETTING_KEYS.LLM_TEMPERATURE] ?? 0.9),
    maxTokens: Number(settings[SETTING_KEYS.LLM_MAX_TOKENS] ?? 1200),
    timeoutMs: Number(settings[SETTING_KEYS.LLM_TIMEOUT] ?? 120000),
  };
}

export async function getDebateLimits(userId: string) {
  const settings = await getSettings(userId);
  return {
    maxParticipants: Number(settings[SETTING_KEYS.DEBATE_MAX_PARTICIPANTS] ?? 3),
    roundMin: Number(settings[SETTING_KEYS.DEBATE_ROUND_MIN] ?? 1),
    roundMax: Number(settings[SETTING_KEYS.DEBATE_ROUND_MAX] ?? 10),
    roundDefault: Number(settings[SETTING_KEYS.DEBATE_ROUND_DEFAULT] ?? 3),
    speechMaxChars: Number(settings[SETTING_KEYS.DEBATE_SPEECH_MAX_CHARS] ?? 420),
    closingMaxChars: Number(settings[SETTING_KEYS.DEBATE_CLOSING_MAX_CHARS] ?? 200),
    messageCap: Number(settings[SETTING_KEYS.DEBATE_MESSAGE_CAP] ?? 60),
    tokenBudget: Number(settings[SETTING_KEYS.DEBATE_TOKEN_BUDGET] ?? 60000),
    extendCap: Number(settings[SETTING_KEYS.DEBATE_EXTEND_CAP] ?? 3),
    judgmentDefault: settings[SETTING_KEYS.DEBATE_JUDGMENT_DEFAULT] !== 'false',
    languageDefault: settings[SETTING_KEYS.DEBATE_LANGUAGE_DEFAULT] || 'classic',
  };
}

export function maskApiKey(key: string) {
  if (!key) return '';
  if (key.length <= 8) return '•'.repeat(key.length);
  return `${key.slice(0, 4)}${'•'.repeat(8)}${key.slice(-4)}`;
}
