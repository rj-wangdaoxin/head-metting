'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Copy, Pencil, Trash2 } from 'lucide-react';
import { FigureAvatar } from '@/components/figures/FigureAvatar';
import { ScrollCard } from '@/components/ink/ScrollCard';
import { deletePersona, duplicatePersona } from '@/lib/actions/personas';
import { STRICTNESS_HINT } from '@/lib/constants';
import type { PersonaView } from '@/lib/queries';
import { cn } from '@/lib/utils';

export function PersonaCard({ persona }: { persona: PersonaView }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const onDelete = () => {
    startTransition(async () => {
      await deletePersona(persona.id);
      router.refresh();
    });
  };

  const onDuplicate = () => {
    startTransition(async () => {
      await duplicatePersona(persona.id);
      router.refresh();
    });
  };

  return (
    <ScrollCard hoverable className={cn('flex h-full flex-col p-4', pending && 'opacity-60')}>
      <div className="flex items-start gap-3">
        <FigureAvatar
          name={persona.figure.name}
          dynasty={persona.figure.dynasty}
          category={persona.figure.category}
          inkColor={persona.figure.inkColor}
          avatarUrl={persona.figure.avatarUrl}
          avatarKind={persona.figure.avatarKind}
          size={48}
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-serif text-base font-bold text-ink">{persona.name}</h3>
          <p className="mt-0.5 text-[11px] text-ink-mute">
            本体：{persona.figure.name} · {persona.figure.dynasty} · {persona.figure.category}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
        {persona.toneStyle ? (
          <span className="rounded-sm bg-cinnabar/10 px-1.5 py-0.5 text-cinnabar">{persona.toneStyle}</span>
        ) : null}
        <span className="rounded-sm bg-indigo/10 px-1.5 py-0.5 text-indigo">
          约束 {persona.strictness}
        </span>
        {persona.knowledgeFocus.slice(0, 3).map((item) => (
          <span key={item} className="rounded-sm bg-moss/10 px-1.5 py-0.5 text-moss">
            {item}
          </span>
        ))}
      </div>

      <div className="mt-3 space-y-1 text-xs leading-5 text-ink-mute">
        {persona.personalityOverride ? <p>性情：{persona.personalityOverride}</p> : null}
        {persona.stanceShift ? <p>立场：{persona.stanceShift}</p> : null}
        {persona.extraPrompt ? <p>设定：{persona.extraPrompt}</p> : null}
        {!persona.personalityOverride && !persona.stanceShift && !persona.extraPrompt ? (
          <p className="text-ink/40">尚未设定差异，言行一如本体（{STRICTNESS_HINT[persona.strictness]}）。</p>
        ) : null}
      </div>

      <div className="mt-auto flex items-center gap-2 pt-4">
        <Link href={`/personas/${persona.id}/edit`} className="ink-btn-ghost px-2.5 py-1 text-xs">
          <Pencil size={13} /> 调整
        </Link>
        <button type="button" onClick={onDuplicate} disabled={pending} className="ink-btn-ghost px-2.5 py-1 text-xs">
          <Copy size={13} /> 复制
        </button>
        {confirming ? (
          <span className="flex items-center gap-1.5 text-xs">
            <button type="button" onClick={onDelete} className="text-cinnabar hover:underline">
              确认删除
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="text-ink-mute hover:underline">
              取消
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={pending}
            className="ml-auto text-ink/40 transition-colors hover:text-cinnabar"
            title="删除分身"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </ScrollCard>
  );
}
