'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CastPicker } from '@/components/debate/CastPicker';
import { CloudDivider } from '@/components/ink/CloudDivider';
import { ScrollCard } from '@/components/ink/ScrollCard';
import { previewStances, startDebate } from '@/lib/actions/debate';
import { DEBATE_LANGUAGES, STANCE_KEYS, STANCE_LABEL } from '@/lib/constants';
import type { CastOption } from '@/lib/types';

interface Limits {
  maxParticipants: number;
  roundMin: number;
  roundMax: number;
  roundDefault: number;
  judgmentDefault: boolean;
  languageDefault: string;
}

const TOPIC_HINTS = [
  '治国当以德化，还是以法度？',
  '士人出处：兼济天下，抑或独善其身？',
  '用兵之道，先谋而后战，还是因敌而变？',
  '变法更张，利在当下还是患在后世？',
  '文章之事，当载道还是当写心？',
];

export function NewDebateForm({
  figures,
  personas,
  limits,
  preselectFigureId,
}: {
  figures: CastOption[];
  personas: CastOption[];
  limits: Limits;
  preselectFigureId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [inferring, startInfer] = useTransition();
  const [motion, setMotion] = useState('');
  const [stanceMap, setStanceMap] = useState<Record<string, { stance: string; claim: string }>>({});
  const [topic, setTopic] = useState('');
  const [background, setBackground] = useState('');
  const [rounds, setRounds] = useState(limits.roundDefault);
  const [language, setLanguage] = useState(limits.languageDefault || 'classic');
  const [allowJudgment, setAllowJudgment] = useState(limits.judgmentDefault);
  const [error, setError] = useState<string | null>(null);

  const preset = preselectFigureId ? figures.filter((f) => f.id === preselectFigureId) : [];
  const [selected, setSelected] = useState<CastOption[]>(preset);

  /** 依各人生平推演命题与阵营，推得的结果仍可在下方逐条改 */
  const infer = () => {
    setError(null);
    if (!topic.trim()) {
      setError('先立一个话题，再推演阵营');
      return;
    }
    if (selected.length === 0) {
      setError('先选人物，再推演阵营');
      return;
    }

    startInfer(async () => {
      const result = await previewStances({
        topic,
        background,
        participants: selected.map((item) => ({
          kind: item.kind,
          figureId: item.figureId,
          personaId: item.personaId,
        })),
      });
      if (!result.ok) {
        setError(result.error ?? '推演失败');
        return;
      }
      setMotion(result.motion);
      const next: Record<string, { stance: string; claim: string }> = {};
      result.stances.forEach((item, index) => {
        const target = selected[index];
        if (target) next[target.id] = { stance: item.stance, claim: item.claim };
      });
      setStanceMap(next);
    });
  };

  const submit = () => {
    setError(null);
    if (!topic.trim()) {
      setError('请先立一个话题');
      return;
    }
    if (selected.length === 0) {
      setError('请至少选一位人物');
      return;
    }

    startTransition(async () => {
      const result = await startDebate({
        topic,
        background,
        roundLimit: rounds,
        language,
        allowJudgment,
        participants: selected.map((item) => ({
          kind: item.kind,
          figureId: item.figureId,
          personaId: item.personaId,
        })),
        motion: motion.trim() || null,
        stances: selected.map((item) => stanceMap[item.id]?.stance ?? null),
        claims: selected.map((item) => stanceMap[item.id]?.claim?.trim() || null),
      });
      if (!result.ok || !result.id) {
        setError(result.error ?? '发起失败');
        return;
      }
      router.push(`/debate/${result.id}`);
    });
  };

  return (
    <ScrollCard className="p-6">
      <label className="block">
        <span className="ink-label">话题</span>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          maxLength={120}
          placeholder="如：治国当以德化，还是以法度？"
          className="ink-input mt-2"
        />
      </label>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {TOPIC_HINTS.map((hint) => (
          <button
            key={hint}
            type="button"
            onClick={() => setTopic(hint)}
            className="rounded-sm border border-paper-line px-2 py-0.5 text-[11px] text-ink-mute transition-colors hover:border-cinnabar/50 hover:text-cinnabar"
          >
            {hint}
          </button>
        ))}
      </div>

      <label className="mt-4 block">
        <span className="ink-label">背景（可不填）</span>
        <textarea
          value={background}
          onChange={(e) => setBackground(e.target.value)}
          rows={2}
          maxLength={400}
          placeholder="补充时代、情境或具体争点，人物将据此发言"
          className="ink-input mt-2 resize-y"
        />
      </label>

      <CloudDivider className="my-6" />

      <CastPicker
        figures={figures}
        personas={personas}
        selected={selected}
        max={limits.maxParticipants}
        onChange={setSelected}
      />

      <CloudDivider className="my-6" />

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="ink-label">立阵</span>
            <p className="mt-1 text-xs text-ink-mute">
              将话题炼成一句是非题，并依各人生平分阵营；有对立才有交锋，不立阵则由服务端临场推演。
            </p>
          </div>
          <button
            type="button"
            onClick={infer}
            disabled={inferring}
            className="ink-btn-ghost shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {inferring ? '推演中……' : '依生平推演阵营'}
          </button>
        </div>

        <label className="mt-3 block">
          <span className="ink-label">命题（可改）</span>
          <input
            value={motion}
            onChange={(e) => setMotion(e.target.value)}
            maxLength={60}
            placeholder="如：治国当以德化，不当以法度"
            className="ink-input mt-2"
          />
        </label>

        {selected.length > 0 ? (
          <div className="mt-3 space-y-2">
            {selected.map((item) => {
              const cur = stanceMap[item.id];
              return (
                <div key={item.id} className="rounded-sm border border-paper-line px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-serif text-sm text-ink">{item.displayName}</span>
                    <div className="flex gap-1">
                      {STANCE_KEYS.map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() =>
                            setStanceMap((prev) => ({
                              ...prev,
                              [item.id]: { stance: key, claim: prev[item.id]?.claim ?? '' },
                            }))
                          }
                          className={
                            cur?.stance === key
                              ? 'rounded-sm border border-cinnabar bg-cinnabar/10 px-2.5 py-0.5 text-xs text-cinnabar'
                              : 'rounded-sm border border-paper-line px-2.5 py-0.5 text-xs text-ink-mute transition-colors hover:border-cinnabar/50 hover:text-cinnabar'
                          }
                        >
                          {STANCE_LABEL[key]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    value={cur?.claim ?? ''}
                    onChange={(e) =>
                      setStanceMap((prev) => ({
                        ...prev,
                        [item.id]: { stance: prev[item.id]?.stance ?? 'PRO', claim: e.target.value },
                      }))
                    }
                    maxLength={60}
                    placeholder="其主张：一句可争的判断（可留白，由其临场自陈）"
                    className="ink-input mt-2 text-xs"
                  />
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      <CloudDivider className="my-6" />

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <span className="ink-label">论辩轮数</span>
          <div className="mt-3 flex items-center gap-4">
            <input
              type="range"
              min={limits.roundMin}
              max={limits.roundMax}
              step={1}
              value={rounds}
              onChange={(e) => setRounds(Number(e.target.value))}
              className="h-1.5 w-48 cursor-pointer appearance-none rounded-full bg-paper-line accent-cinnabar"
            />
            <span className="text-sm text-ink-soft">{rounds} 轮</span>
          </div>
          <p className="mt-2 text-xs text-ink-mute">
            首轮立论，其后驳论（指名、引其言、破其一处），倒数第二轮质询（一问一答），轮满则结辩。
            三人以上且轮数不少于三轮时，方有质询一节。
          </p>
        </div>

        <div>
          <span className="ink-label">言谈语体</span>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {DEBATE_LANGUAGES.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setLanguage(item.key)}
                title={item.hint}
                className={
                  language === item.key
                    ? 'rounded-sm border border-cinnabar bg-cinnabar/10 px-2.5 py-1 text-xs text-cinnabar'
                    : 'rounded-sm border border-paper-line px-2.5 py-1 text-xs text-ink-mute transition-colors hover:border-cinnabar/50 hover:text-cinnabar'
                }
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-mute">
            {DEBATE_LANGUAGES.find((item) => item.key === language)?.hint ?? ''}
          </p>
        </div>

        <div className="md:col-span-2">
          <span className="ink-label">辩后评点</span>
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={allowJudgment}
              onChange={(e) => setAllowJudgment(e.target.checked)}
              className="h-3.5 w-3.5 accent-cinnabar"
            />
            结束时由判官作中立评点
          </label>
          <p className="mt-2 text-xs text-ink-mute">评点不扮演任何人物，只论论证与史实。</p>
        </div>
      </div>

      {error ? (
        <p className="mt-5 rounded-sm bg-cinnabar/10 px-3 py-2 text-sm text-cinnabar">{error}</p>
      ) : null}

      <div className="mt-6 flex items-center gap-3">
        <button type="button" onClick={submit} disabled={pending} className="ink-btn-seal">
          {pending ? '设席中……' : '设席开辩'}
        </button>
        <span className="text-xs text-ink-mute">
          至多 {limits.maxParticipants} 位人物，轮数 {limits.roundMin}–{limits.roundMax}
        </span>
      </div>
    </ScrollCard>
  );
}
