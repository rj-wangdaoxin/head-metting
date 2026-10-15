'use client';

import { useEffect, useRef, useState } from 'react';
import { CATEGORIES, DYNASTIES } from '@/lib/constants';
import { cn } from '@/lib/utils';

export type FigureFilters = { dynasty: string; category: string; q: string };

function Chip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-sm border px-2.5 py-1 text-xs transition-all duration-200 active:scale-[0.97]',
        active
          ? 'border-cinnabar bg-cinnabar/10 font-medium text-cinnabar'
          : 'border-paper-line bg-white/50 text-ink-mute hover:border-ink/30 hover:text-ink',
      )}
    >
      {label}
    </button>
  );
}

/** 受控筛选栏：筛选结果由父组件即时计算，点击后立刻高亮，无需等待导航 */
export function FilterBar({
  total,
  shown,
  filters,
  onChange,
}: {
  total: number;
  shown: number;
  filters: FigureFilters;
  onChange: (next: FigureFilters) => void;
}) {
  const [keyword, setKeyword] = useState(filters.q);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setKeyword(filters.q);
  }, [filters.q]);

  const onKeyword = (value: string) => {
    setKeyword(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange({ ...filters, q: value }), 260);
  };

  const toggle = (key: 'dynasty' | 'category', value: string) =>
    onChange({ ...filters, [key]: filters[key] === value ? '' : value });

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    setKeyword('');
    onChange({ dynasty: '', category: '', q: '' });
  };

  const hasFilter = Boolean(filters.dynasty || filters.category || filters.q);

  return (
    <div className="scroll-card mb-6 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="ink-label mr-1">朝代</span>
        <Chip active={!filters.dynasty} label="不限" onClick={() => onChange({ ...filters, dynasty: '' })} />
        {DYNASTIES.map((d) => (
          <Chip
            key={d.key}
            active={filters.dynasty === d.key}
            label={d.key}
            onClick={() => toggle('dynasty', d.key)}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="ink-label mr-1">类型</span>
        <Chip active={!filters.category} label="不限" onClick={() => onChange({ ...filters, category: '' })} />
        {CATEGORIES.map((c) => (
          <Chip
            key={c.key}
            active={filters.category === c.key}
            label={c.key}
            onClick={() => toggle('category', c.key)}
          />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-paper-line pt-3">
        <div className="relative flex-1 min-w-[220px]">
          <input
            value={keyword}
            onChange={(e) => onKeyword(e.target.value)}
            placeholder="检索姓名、字号、思想、专长……"
            className="ink-input pl-8"
          />
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-serif text-xs text-ink/40">
            检
          </span>
        </div>
        <span className="text-xs text-ink-mute">
          共 {shown} / {total} 位
        </span>
        {hasFilter && (
          <button type="button" onClick={clear} className="text-xs text-cinnabar hover:underline">
            清除筛选
          </button>
        )}
      </div>
    </div>
  );
}
