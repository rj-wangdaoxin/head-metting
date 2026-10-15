'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { removeSession } from '@/lib/actions/debate';

export function HistoryActions({
  id,
  ended,
  canExtend,
}: {
  id: string;
  ended: boolean;
  canExtend: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const extend = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/debate/${id}/extend`, { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!data.ok) setError(data.error ?? '续场失败');
      else router.push(`/debate/${id}`);
    });
  };

  const remove = () => {
    startTransition(async () => {
      await removeSession(id);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {ended && canExtend ? (
        <button type="button" onClick={extend} disabled={pending} className="text-xs text-cinnabar hover:underline">
          续一场
        </button>
      ) : null}
      {confirming ? (
        <span className="flex items-center gap-1.5 text-xs">
          <button type="button" onClick={remove} className="text-cinnabar hover:underline">
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
          className="text-xs text-ink/40 hover:text-cinnabar"
        >
          删除
        </button>
      )}
      {error ? <span className="text-xs text-cinnabar">{error}</span> : null}
    </div>
  );
}
