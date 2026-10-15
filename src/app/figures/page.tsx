import { FigureGallery } from '@/components/figures/FigureGallery';
import { listFigureCards } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function FiguresPage({
  searchParams,
}: {
  searchParams: Promise<{ dynasty?: string; category?: string; q?: string }>;
}) {
  const params = await searchParams;
  const figures = await listFigureCards({});

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-wide text-ink">人物库</h1>
          <p className="mt-1 text-sm text-ink-mute">
            先秦以迄二十世纪上半叶，按朝代与类型检阅。档案取自正史、本集与身后人所核实之言论，为不可变之官方本体。
          </p>
        </div>
      </div>

      <FigureGallery
        figures={figures}
        initialFilters={{
          dynasty: params.dynasty ?? '',
          category: params.category ?? '',
          q: params.q ?? '',
        }}
      />
    </div>
  );
}
