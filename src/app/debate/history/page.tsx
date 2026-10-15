import Link from 'next/link';
import { HistoryActions } from '@/components/debate/HistoryActions';
import { InkSeal } from '@/components/ink/InkSeal';
import { ScrollCard } from '@/components/ink/ScrollCard';
import { prisma } from '@/lib/db';
import { getDebateLimits } from '@/lib/settings';
import { requireUser } from '@/lib/auth';
import { PHASE_LABEL } from '@/lib/constants';
import { formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function DebateHistoryPage() {
  const user = await requireUser();
  const [sessions, limits] = await Promise.all([
    prisma.debateSession.findMany({
      where: { userId: user.id },
      include: { participants: { orderBy: { orderIndex: 'asc' } }, messages: true },
      orderBy: { updatedAt: 'desc' },
      take: 60,
    }),
    getDebateLimits(user.id),
  ]);

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-wide text-ink">辩录</h1>
          <p className="mt-1 text-sm text-ink-mute">历场论辩存档：可回看、可续场（未至上限）、可导出。</p>
        </div>
        <Link href="/debate" className="ink-btn-seal">
          另立话题
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="scroll-card p-12 text-center">
          <p className="font-serif text-lg text-ink-mute">尚无辩录。</p>
          <p className="mt-2 text-sm text-ink/50">往「论辩」页设席开辩，辩毕即存于此。</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <ScrollCard key={session.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/debate/${session.id}`}
                    className="font-serif text-base font-bold text-ink transition-colors hover:text-cinnabar"
                  >
                    {session.topic}
                  </Link>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-ink-mute">
                    <span
                      className={
                        session.status === 'ENDED'
                          ? 'rounded-sm bg-ink/10 px-1.5 py-0.5 text-ink'
                          : session.phase === 'CLOSING'
                            ? 'rounded-sm bg-gold/15 px-1.5 py-0.5 text-gold'
                            : 'rounded-sm bg-cinnabar/10 px-1.5 py-0.5 text-cinnabar'
                      }
                    >
                      {PHASE_LABEL[session.phase] ?? session.phase}
                    </span>
                    <span>{session.participants.length} 人 · {session.messages.length} 条 · {session.roundLimit} 轮</span>
                    {session.extensionCount > 0 ? <span>已续 {session.extensionCount} 场</span> : null}
                    <span>{formatDateTime(session.updatedAt)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {session.participants.map((p) => (
                      <span key={p.id} className="flex items-center gap-1">
                        <InkSeal char={p.sealChar} color={p.inkColor} size={22} />
                        <span className="text-xs text-ink-soft">{p.displayName}</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-3 text-xs">
                    <Link href={`/debate/${session.id}`} className="text-cinnabar hover:underline">
                      回看
                    </Link>
                    <a href={`/api/debate/${session.id}/export`} className="text-ink-mute hover:underline">
                      导出
                    </a>
                  </div>
                  <HistoryActions
                    id={session.id}
                    ended={session.status === 'ENDED'}
                    canExtend={session.extensionCount < limits.extendCap}
                  />
                </div>
              </div>
            </ScrollCard>
          ))}
        </div>
      )}
    </div>
  );
}
