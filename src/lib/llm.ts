export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
}

export class LlmError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'LlmError';
    this.status = status;
  }
}

function endpoint(baseUrl: string) {
  const trimmed = (baseUrl || '').trim().replace(/\/+$/, '');
  if (!trimmed) throw new LlmError('尚未配置模型接口地址（base_url）');
  if (trimmed.endsWith('/chat/completions')) return trimmed;
  return `${trimmed}/chat/completions`;
}

function buildInit(config: LlmConfig, messages: ChatMessage[], stream: boolean, signal?: AbortSignal) {
  if (!config.apiKey) throw new LlmError('尚未配置模型密钥（api_key），请先在后台填写');
  if (!config.model) throw new LlmError('尚未配置模型名称（model）');

  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream,
    }),
    signal,
  } as const;
}

function linkSignals(signals: (AbortSignal | undefined)[], timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('模型响应超时')), timeoutMs || 120000);
  for (const signal of signals) {
    if (!signal) continue;
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }
  const clear = () => clearTimeout(timer);
  return { controller, clear };
}

async function readError(res: Response) {
  let detail = '';
  try {
    const text = await res.text();
    detail = text.slice(0, 300);
  } catch {
    detail = '';
  }
  return new LlmError(`模型服务返回 ${res.status}${detail ? `：${detail}` : ''}`, res.status);
}

/** 流式对话：逐段产出文本增量 */
export async function* streamChat(
  messages: ChatMessage[],
  config: LlmConfig,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const { controller, clear } = linkSignals([signal], config.timeoutMs);
  let res: Response;
  try {
    res = await fetch(endpoint(config.baseUrl), buildInit(config, messages, true, controller.signal));
  } catch (err) {
    clear();
    if (controller.signal.aborted) throw new LlmError('生成已中止');
    throw new LlmError(`无法连接模型服务：${(err as Error).message}`);
  }

  if (!res.ok || !res.body) {
    clear();
    throw await readError(res);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const json = JSON.parse(payload);
          const delta = json?.choices?.[0]?.delta?.content ?? json?.choices?.[0]?.message?.content ?? '';
          if (delta) yield delta as string;
        } catch {
          // 忽略无法解析的心跳行
        }
      }
    }
  } catch (err) {
    if (controller.signal.aborted) throw new LlmError('生成已中止');
    throw err;
  } finally {
    clear();
    reader.cancel().catch(() => undefined);
  }
}

/** 一次性对话：用于辩要综述与判官评点 */
export async function chat(messages: ChatMessage[], config: LlmConfig): Promise<string> {
  const { controller, clear } = linkSignals([], config.timeoutMs);
  try {
    const res = await fetch(endpoint(config.baseUrl), buildInit(config, messages, false, controller.signal));
    if (!res.ok) throw await readError(res);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return json.choices?.[0]?.message?.content?.trim() ?? '';
  } catch (err) {
    if (err instanceof LlmError) throw err;
    if (controller.signal.aborted) throw new LlmError('生成超时');
    throw new LlmError(`无法连接模型服务：${(err as Error).message}`);
  } finally {
    clear();
  }
}

/** 连通性测试：仅验证鉴权与模型可用，不消耗长文本 */
export async function testConnection(config: LlmConfig): Promise<{ ok: boolean; message: string }> {
  try {
    const text = await chat(
      [
        { role: 'system', content: '你是一个连通性测试助手。' },
        { role: 'user', content: '请回复二字：可用' },
      ],
      { ...config, maxTokens: 16, timeoutMs: Math.min(config.timeoutMs, 30000) },
    );
    return { ok: true, message: text ? `连通正常，模型回复：${text.slice(0, 20)}` : '连通正常，但回复为空' };
  } catch (err) {
    const error = err as LlmError;
    return { ok: false, message: error.message };
  }
}
