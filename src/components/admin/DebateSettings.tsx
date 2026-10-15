'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ScrollCard } from '@/components/ink/ScrollCard';
import { saveSettings } from '@/lib/actions/admin';
import { DEBATE_LANGUAGES, SETTING_KEYS } from '@/lib/constants';

const FIELDS: { key: string; label: string; min: number; max: number; hint: string }[] = [
  { key: SETTING_KEYS.DEBATE_MAX_PARTICIPANTS, label: '单场最多参与人数', min: 1, max: 8, hint: '选角面板的人数上限' },
  { key: SETTING_KEYS.DEBATE_ROUND_MIN, label: '轮数下限', min: 1, max: 10, hint: '新建辩论时可选的最小轮数' },
  { key: SETTING_KEYS.DEBATE_ROUND_MAX, label: '轮数上限', min: 1, max: 20, hint: '新建辩论时可选的最大轮数' },
  { key: SETTING_KEYS.DEBATE_ROUND_DEFAULT, label: '默认轮数', min: 1, max: 10, hint: '新建辩论时的初始轮数' },
  { key: SETTING_KEYS.DEBATE_SPEECH_MAX_CHARS, label: '常规发言字数上限', min: 100, max: 1200, hint: '每轮每人发言的字数约束' },
  { key: SETTING_KEYS.DEBATE_CLOSING_MAX_CHARS, label: '结辩字数上限', min: 60, max: 600, hint: '结辩陈词的字数约束' },
  { key: SETTING_KEYS.DEBATE_MESSAGE_CAP, label: '单场发言条数上限', min: 10, max: 300, hint: '触顶即强制结辩收束' },
  { key: SETTING_KEYS.DEBATE_TOKEN_BUDGET, label: '单场耗用额度上限', min: 5000, max: 400000, hint: '按估算 token 计，触顶即强制收束' },
  { key: SETTING_KEYS.DEBATE_EXTEND_CAP, label: '续场次数上限', min: 0, max: 10, hint: '辩论结束后可「续一场」的次数' },
];

export function DebateSettings({ initial }: { initial: Record<string, string> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const field of FIELDS) map[field.key] = initial[field.key] ?? '';
    return map;
  });
  const [judgmentDefault, setJudgmentDefault] = useState(initial[SETTING_KEYS.DEBATE_JUDGMENT_DEFAULT] !== 'false');
  const [languageDefault, setLanguageDefault] = useState(
    initial[SETTING_KEYS.DEBATE_LANGUAGE_DEFAULT] || 'classic',
  );
  const [message, setMessage] = useState<string | null>(null);

  const save = () => {
    setMessage(null);
    startTransition(async () => {
      await saveSettings({
        ...form,
        [SETTING_KEYS.DEBATE_JUDGMENT_DEFAULT]: String(judgmentDefault),
        [SETTING_KEYS.DEBATE_LANGUAGE_DEFAULT]: languageDefault,
      });
      router.refresh();
      setMessage('辩论配置已保存');
    });
  };

  return (
    <ScrollCard className="p-5">
      <h2 className="mb-4 font-serif text-base font-bold text-ink">论辩规则</h2>

      <div className="grid gap-4 md:grid-cols-2">
        {FIELDS.map((field) => (
          <label key={field.key} className="block">
            <span className="ink-label">{field.label}</span>
            <input
              type="number"
              min={field.min}
              max={field.max}
              value={form[field.key]}
              onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
              className="ink-input mt-2"
            />
            <span className="mt-1 block text-[11px] text-ink/50">{field.hint}</span>
          </label>
        ))}
      </div>

      <label className="mt-4 block">
        <span className="ink-label">新建辩论的默认语体</span>
        <select
          value={languageDefault}
          onChange={(e) => setLanguageDefault(e.target.value)}
          className="ink-input mt-2 cursor-pointer"
        >
          {DEBATE_LANGUAGES.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}——{item.hint}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-[11px] text-ink/50">
          语体只定文白与句式，人物的自称、称谓与口癖仍照其档案。
        </span>
      </label>

      <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
        <input
          type="checkbox"
          checked={judgmentDefault}
          onChange={(e) => setJudgmentDefault(e.target.checked)}
          className="h-3.5 w-3.5 accent-cinnabar"
        />
        新建辩论时默认开启「判官评点」
      </label>

      {message ? <p className="mt-4 rounded-sm bg-moss/10 px-3 py-2 text-sm text-moss">{message}</p> : null}

      <button type="button" onClick={save} disabled={pending} className="ink-btn-seal mt-5">
        {pending ? '保存中……' : '保存配置'}
      </button>
    </ScrollCard>
  );
}
