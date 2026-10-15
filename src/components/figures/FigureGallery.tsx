'use client';

import { useEffect, useMemo, useState } from 'react';
import { FigureCard } from '@/components/figures/FigureCard';
import { FilterBar, type FigureFilters } from '@/components/figures/FilterBar';
import { CloudDivider } from '@/components/ink/CloudDivider';
import type { FigureCardView } from '@/lib/queries';

/**
 * 人物库画廊：全量卡片数据一次性下发，筛选在客户端即时完成，
 * 不经过路由导航，因此不会出现等待导航而卡住的情况。
 */
export function FigureGallery({
  figures,
  initialFilters,
}: {
  figures: FigureCardView[];
  initialFilters: FigureFilters;
}) {
  const [filters, setFilters] = useState<FigureFilters>(initialFilters);

  // 地址栏同步：用 history.replaceState 而非路由跳转，刷新与分享链接仍保留筛选
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.dynasty) params.set('dynasty', filters.dynasty);
    if (filters.category) params.set('category', filters.category);
    if (filters.q) params.set('q', filters.q);
    const query = params.toString();
    window.history.replaceState(
      null,
      '',
      query ? `${window.location.pathname}?${query}` : window.location.pathname,
    );
  }, [filters]);

  const results = useMemo(() => {
    const keyword = filters.q.trim();
    return figures.filter((figure) => {
      if (filters.dynasty && figure.dynasty !== filters.dynasty) return false;
      if (filters.category && figure.category !== filters.category) return false;
      if (!keyword) return true;
      const haystack = `${figure.name} ${figure.courtesy ?? ''} ${figure.biography} ${figure.thoughts} ${figure.expertise.join('')} ${figure.personalityTraits.join('')}`;
      return haystack.includes(keyword);
    });
  }, [figures, filters]);

  return (
    <>
      <FilterBar total={figures.length} shown={results.length} filters={filters} onChange={setFilters} />

      {results.length === 0 ? (
        <div className="scroll-card p-12 text-center">
          <p className="font-serif text-lg text-ink-mute">此筛选之下，未见其人。</p>
          <p className="mt-2 text-sm text-ink/50">试放宽朝代或类型，或另换关键字。</p>
        </div>
      ) : (
        <>
          <CloudDivider className="mb-6" label={`得 ${results.length} 人`} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((figure) => (
              <FigureCard key={figure.id} figure={figure} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
