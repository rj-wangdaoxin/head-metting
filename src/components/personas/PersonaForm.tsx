'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CloudDivider } from '@/components/ink/CloudDivider';
import { ScrollCard } from '@/components/ink/ScrollCard';
import { KNOWLEDGE_FOCUS, STRICTNESS_HINT, TONE_STYLES } from '@/lib/constants';
import { createPersona, updatePersona } from '@/lib/actions/personas';
import { cn } from '@/lib/utils';

export interface FigureOption {
  id: string;
  name: string;
  courtesy: string | null;
  dynasty: string;
  category: string;
  inkColor: string;
}

export interface PersonaInitial {
  figureId: string;
  name: string;
  personalityOverride: string;
  toneStyle: string;
  knowledgeFocus: string[];
  stanceShift: string;
  extraPrompt: string;
  strictness: number;
}

interface Props {
  figures: FigureOption[];
  initial: PersonaInitial;
  mode: 'create' | 'edit';
  personaId?: string;
}

export function PersonaForm({ figures, initial, mode, personaId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PersonaInitial>(initial);

  const set = <K extends keyof PersonaInitial>(key: K, value: PersonaInitial[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleFocus = (item: string) =>
    setForm((prev) => ({
      ...prev,
      knowledgeFocus: prev.knowledgeFocus.includes(item)
        ? prev.knowledgeFocus.filter((i) => i !== item)
        : [...prev.knowledgeFocus, item],
    }));

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result =
        mode === 'create' ? await createPersona(form) : await updatePersona(personaId as string, form);
      if (!result.ok) {
        setError(result.error ?? '保存失败');
        return;
      }
      router.push('/personas');
      router.refresh();
    });
  };

  const grouped = figures.reduce<Record<string, FigureOption[]>>((acc, f) => {
    acc[f.dynasty] = acc[f.dynasty] ?? [];
    acc[f.dynasty].push(f);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-[900px] px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-wide text-ink">
            {mode === 'create' ? '创建分身' : '调整分身'}
          </h1>
          <p className="mt-1 text-sm text-ink-mute">
            本体之史实不可改，此处所调者，惟性情、语气与侧重之差。
          </p>
        </div>
        <Link href="/personas" className="text-sm text-ink-mute hover:text-cinnabar">
          返回分身列
        </Link>
      </div>

      <ScrollCard className="p-6">
        <label className="mb-2 block">
          <span className="ink-label">本体</span>
          <select
            value={form.figureId}
            onChange={(e) => set('figureId', e.target.value)}
            disabled={mode === 'edit'}
            className="ink-input mt-2 disabled:bg-paper-deep disabled:text-ink-mute"
          >
            <option value="">请选择人物本体</option>
            {Object.entries(grouped).map(([dynasty, items]) => (
              <optgroup key={dynasty} label={dynasty}>
                {items.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}（{f.category}）
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <CloudDivider className="my-6" label="差 异 层" />

        <label className="mb-4 block">
          <span className="ink-label">分身名</span>
          <input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            maxLength={24}
            placeholder="如：东坡·醉客"
            className="ink-input mt-2"
          />
        </label>

        <label className="mb-4 block">
          <span className="ink-label">性格倾向</span>
          <textarea
            value={form.personalityOverride}
            onChange={(e) => set('personalityOverride', e.target.value)}
            rows={2}
            placeholder="例：更旷达疏狂，少几分沉郁，多几分谐谑"
            className="ink-input mt-2 resize-y"
          />
        </label>

        <div className="mb-4">
          <span className="ink-label">语气风格</span>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => set('toneStyle', '')}
              className={cn(
                'rounded-sm border px-2.5 py-1 text-xs transition-colors',
                !form.toneStyle
                  ? 'border-cinnabar bg-cinnabar/10 text-cinnabar'
                  : 'border-paper-line bg-white/50 text-ink-mute hover:border-ink/30',
              )}
            >
              承本体
            </button>
            {TONE_STYLES.map((tone) => (
              <button
                key={tone}
                type="button"
                onClick={() => set('toneStyle', tone)}
                className={cn(
                  'rounded-sm border px-2.5 py-1 text-xs transition-colors',
                  form.toneStyle === tone
                    ? 'border-cinnabar bg-cinnabar/10 text-cinnabar'
                    : 'border-paper-line bg-white/50 text-ink-mute hover:border-ink/30',
                )}
              >
                {tone}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <span className="ink-label">知识侧重</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {KNOWLEDGE_FOCUS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => toggleFocus(item)}
                className={cn(
                  'rounded-sm border px-2.5 py-1 text-xs transition-colors',
                  form.knowledgeFocus.includes(item)
                    ? 'border-indigo bg-indigo/10 text-indigo'
                    : 'border-paper-line bg-white/50 text-ink-mute hover:border-ink/30',
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <label className="mb-4 block">
          <span className="ink-label">立场偏移</span>
          <textarea
            value={form.stanceShift}
            onChange={(e) => set('stanceShift', e.target.value)}
            rows={2}
            placeholder="例：于变法一事，由异议转为主张缓行"
            className="ink-input mt-2 resize-y"
          />
        </label>

        <label className="mb-4 block">
          <span className="ink-label">额外设定</span>
          <textarea
            value={form.extraPrompt}
            onChange={(e) => set('extraPrompt', e.target.value)}
            rows={3}
            placeholder="例：嗜酒，言必引庄子；不喜与人争胜，好以寓言作答"
            className="ink-input mt-2 resize-y"
          />
        </label>

        <div className="mb-2">
          <span className="ink-label">人设约束强度</span>
          <div className="mt-3 flex items-center gap-4">
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={form.strictness}
              onChange={(e) => set('strictness', Number(e.target.value))}
              className="h-1.5 w-56 cursor-pointer appearance-none rounded-full bg-paper-line accent-cinnabar"
            />
            <span className="text-sm text-ink-soft">
              {form.strictness} · {STRICTNESS_HINT[form.strictness]}
            </span>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-sm bg-cinnabar/10 px-3 py-2 text-sm text-cinnabar">{error}</p>
        ) : null}

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={submit} disabled={pending} className="ink-btn-seal">
            {pending ? '保存中……' : mode === 'create' ? '立此分身' : '保存改动'}
          </button>
          <Link href="/personas" className="ink-btn-ghost">
            取消
          </Link>
        </div>
      </ScrollCard>
    </div>
  );
}
