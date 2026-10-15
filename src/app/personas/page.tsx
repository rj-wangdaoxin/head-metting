import Link from 'next/link';
import { PersonaCard } from '@/components/personas/PersonaCard';
import { CloudDivider } from '@/components/ink/CloudDivider';
import { listPersonas } from '@/lib/queries';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function PersonasPage() {
  const user = await requireUser();
  const personas = await listPersonas(user.id);

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-wide text-ink">我的分身</h1>
          <p className="mt-1 text-sm text-ink-mute">
            以官方本体为骨，叠加性情、语气与侧重之差；本体史实始终不可改。
          </p>
        </div>
        <Link href="/personas/new" className="ink-btn-seal">
          新建分身
        </Link>
      </div>

      {personas.length === 0 ? (
        <div className="scroll-card p-12 text-center">
          <p className="font-serif text-lg text-ink-mute">尚无分身。</p>
          <p className="mt-2 text-sm text-ink/50">
            可自
            <Link href="/figures" className="mx-1 text-cinnabar hover:underline">
              人物库
            </Link>
            择一本体，立你的第一个分身。
          </p>
        </div>
      ) : (
        <>
          <CloudDivider className="mb-6" label={`共 ${personas.length} 个分身`} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {personas.map((persona) => (
              <PersonaCard key={persona.id} persona={persona} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
