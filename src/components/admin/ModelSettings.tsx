'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ScrollCard } from '@/components/ink/ScrollCard';
import { saveSettings } from '@/lib/actions/admin';
import { SETTING_KEYS } from '@/lib/constants';

export interface PlatformModelInfo {
  enabled: boolean;
  baseUrl: string;
  model: string;
  keyHint: string;
}

export function ModelSettings({
  initial,
  platform,
}: {
  initial: Record<string, string>;
  platform: PlatformModelInfo;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    baseUrl: initial[SETTING_KEYS.LLM_BASE_URL] ?? '',
    apiKey: initial[SETTING_KEYS.LLM_API_KEY] ?? '',
    model: initial[SETTING_KEYS.LLM_MODEL] ?? '',
    temperature: initial[SETTING_KEYS.LLM_TEMPERATURE] ?? '0.9',
    maxTokens: initial[SETTING_KEYS.LLM_MAX_TOKENS] ?? '1200',
    timeoutMs: initial[SETTING_KEYS.LLM_TIMEOUT] ?? '120000',
  });
  const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const set = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const save = () => {
    setMessage(null);
    startTransition(async () => {
      await saveSettings({
        [SETTING_KEYS.LLM_BASE_URL]: form.baseUrl.trim(),
        [SETTING_KEYS.LLM_API_KEY]: form.apiKey.trim(),
        [SETTING_KEYS.LLM_MODEL]: form.model.trim(),
        [SETTING_KEYS.LLM_TEMPERATURE]: form.temperature,
        [SETTING_KEYS.LLM_MAX_TOKENS]: form.maxTokens,
        [SETTING_KEYS.LLM_TIMEOUT]: form.timeoutMs,
      });
      router.refresh();
      setMessage({ tone: 'ok', text: '模型配置已保存' });
    });
  };

  const test = async () => {
    setTesting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: form.baseUrl.trim(),
          apiKey: form.apiKey.trim(),
          model: form.model.trim(),
          timeoutMs: Number(form.timeoutMs),
        }),
      });
      const data = (await res.json()) as { ok: boolean; message: string };
      setMessage({ tone: data.ok ? 'ok' : 'err', text: data.message });
    } catch (err) {
      setMessage({ tone: 'err', text: (err as Error).message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <ScrollCard className="p-5">
      <h2 className="mb-4 font-serif text-base font-bold text-ink">模型接口</h2>

      {platform.enabled ? (
        <div className="mb-4 rounded-sm border-l-2 border-moss/60 bg-moss/5 px-3 py-2 text-[12px] leading-6 text-ink-soft">
          本站已备好共用模型：{platform.model}（{platform.baseUrl}），密钥 {platform.keyHint}。
          下面三项留空即用共用模型；填了则以你自己填的为准。
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block md:col-span-2">
          <span className="ink-label">接口地址 base_url</span>
          <input
            value={form.baseUrl}
            onChange={(e) => set('baseUrl', e.target.value)}
            placeholder={platform.baseUrl || 'https://api.deepseek.com/v1'}
            className="ink-input mt-2"
          />
          <span className="mt-1 block text-[11px] text-ink/50">
            兼容 OpenAI 的 /chat/completions 接口；程序会自动补上路径。
          </span>
        </label>

        <label className="block">
          <span className="ink-label">密钥 api_key</span>
          <input
            type="password"
            value={form.apiKey}
            onChange={(e) => set('apiKey', e.target.value)}
            placeholder={platform.enabled ? `留空即用共用密钥（${platform.keyHint}）` : 'sk-……'}
            className="ink-input mt-2"
          />
          <span className="mt-1 block text-[11px] text-ink/50">留空则沿用平台共用密钥。</span>
        </label>

        <label className="block">
          <span className="ink-label">模型 model</span>
          <input
            value={form.model}
            onChange={(e) => set('model', e.target.value)}
            placeholder={platform.model || 'deepseek-chat'}
            className="ink-input mt-2"
          />
        </label>

        <label className="block">
          <span className="ink-label">温度 temperature</span>
          <input
            type="number"
            step="0.1"
            min={0}
            max={2}
            value={form.temperature}
            onChange={(e) => set('temperature', e.target.value)}
            className="ink-input mt-2"
          />
        </label>

        <label className="block">
          <span className="ink-label">单次上限 max_tokens</span>
          <input
            type="number"
            min={200}
            max={8000}
            value={form.maxTokens}
            onChange={(e) => set('maxTokens', e.target.value)}
            className="ink-input mt-2"
          />
        </label>

        <label className="block">
          <span className="ink-label">超时（毫秒）</span>
          <input
            type="number"
            min={10000}
            step={1000}
            value={form.timeoutMs}
            onChange={(e) => set('timeoutMs', e.target.value)}
            className="ink-input mt-2"
          />
        </label>
      </div>

      {message ? (
        <p
          className={`mt-4 rounded-sm px-3 py-2 text-sm ${
            message.tone === 'ok' ? 'bg-moss/10 text-moss' : 'bg-cinnabar/10 text-cinnabar'
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <div className="mt-5 flex gap-3">
        <button type="button" onClick={save} disabled={pending} className="ink-btn-seal">
          {pending ? '保存中……' : '保存配置'}
        </button>
        <button type="button" onClick={test} disabled={testing} className="ink-btn-ghost">
          {testing ? '测试中……' : '连接测试'}
        </button>
      </div>
    </ScrollCard>
  );
}
