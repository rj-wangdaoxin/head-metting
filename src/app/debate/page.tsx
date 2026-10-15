import { NewDebateForm } from '@/components/debate/NewDebateForm';
import { requireUser } from '@/lib/auth';
import { getCastOptions } from '@/lib/queries';
import { getDebateLimits } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function DebatePage({
  searchParams,
}: {
  searchParams: Promise<{ figure?: string }>;
}) {
  const user = await requireUser();
  const { figure } = await searchParams;
  const [cast, limits] = await Promise.all([getCastOptions(user.id), getDebateLimits(user.id)]);

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-bold tracking-wide text-ink">设席开辩</h1>
        <p className="mt-1 text-sm text-ink-mute">
          立一话题，请数位古人同席。所言须合其时代与其人本色；轮次有度，辩毕结词定论。
        </p>
      </div>

      <NewDebateForm
        figures={cast.figures}
        personas={cast.personas}
        limits={limits}
        preselectFigureId={figure}
      />
    </div>
  );
}
