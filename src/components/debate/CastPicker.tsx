'use client';

import { useMemo, useState } from 'react';
import { FigureAvatar } from '@/components/figures/FigureAvatar';
import { InkSeal } from '@/components/ink/InkSeal';
import type { CastOption } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  figures: CastOption[];
  personas: CastOption[];
  selected: CastOption[];
  max: number;
  onChange: (next: CastOption[]) => void;
}

export function CastPicker({ figures, personas, selected, max, onChange }: Props) {
  const [tab, setTab] = useState<'FIGURE' | 'PERSONA'>('FIGURE');
  const [keyword, setKeyword] = useState('');

  const source = tab === 'FIGURE' ? figures : personas;
  const filtered = useMemo(() => {
    const k = keyword.trim();
    if (!k) return source;
    return source.filter(
      (item) =>
        item.displayName.includes(k) ||
        item.dynasty.includes(k) ||
        item.category.includes(k) ||
        (item.baseName ?? '').includes(k),
    );
  }, [source, keyword]);

  const toggle = (item: CastOption) => {
    const exists = selected.some((s) => s.id === item.id && s.kind === item.kind);
    if (exists) {
      onChange(selected.filter((s) => !(s.id === item.id && s.kind === item.kind)));
      return;
    }
    if (selected.length >= max) return;
    onChange([...selected, item]);
  };

  const isSelected = (item: CastOption) => selected.some((s) => s.id === item.id && s.kind === item.kind);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="ink-label">选角</span>
        <span className="text-xs text-ink-mute">
          已选 {selected.length} / {max}
        </span>
        <div className="ml-2 flex rounded-sm border border-paper-line bg-white/60 p-0.5">
          {(
            [
              ['FIGURE', '官方本体'],
              ['PERSONA', '我的分身'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'rounded-sm px-3 py-1 text-xs transition-colors',
                tab === key ? 'bg-ink text-paper' : 'text-ink-mute hover:text-ink',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="检索人物"
          className="ink-input ml-auto h-8 w-40 py-1 text-xs"
        />
      </div>

      {selected.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2 rounded-sm border border-dashed border-paper-line bg-paper-deep/60 p-3">
          {selected.map((item, index) => (
            <span
              key={`${item.kind}-${item.id}`}
              className="flex items-center gap-2 rounded-sm bg-white px-2 py-1 text-xs shadow-scroll"
            >
              <InkSeal char={item.sealChar} color={item.inkColor} size={22} />
              <span className="font-serif text-ink">
                {index + 1}. {item.displayName}
              </span>
              <span className="text-ink-mute">{item.dynasty}</span>
              <button
                type="button"
                onClick={() => toggle(item)}
                className="text-ink/40 transition-colors hover:text-cinnabar"
                title="移出本场"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="thin-scrollbar grid max-h-72 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((item) => {
          const active = isSelected(item);
          const full = selected.length >= max && !active;
          return (
            <button
              key={`${item.kind}-${item.id}`}
              type="button"
              onClick={() => toggle(item)}
              disabled={full}
              className={cn(
                'flex items-center gap-2 rounded-sm border p-2 text-left transition-all duration-200',
                active
                  ? 'border-cinnabar bg-cinnabar/5'
                  : 'border-paper-line bg-white/60 hover:border-ink/30 hover:bg-white',
                full && 'cursor-not-allowed opacity-40',
              )}
            >
              <FigureAvatar
                name={item.baseName ?? item.displayName}
                dynasty={item.dynasty}
                category={item.category}
                inkColor={item.inkColor}
                avatarUrl={item.avatarUrl}
                avatarKind={item.avatarKind}
                size={34}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-serif text-sm text-ink">{item.displayName}</span>
                <span className="block truncate text-[11px] text-ink-mute">
                  {item.dynasty} · {item.category}
                  {item.baseName ? ` · 本${item.baseName}` : ''}
                </span>
              </span>
            </button>
          );
        })}
        {filtered.length === 0 ? (
          <p className="col-span-full py-6 text-center text-sm text-ink-mute">
            {tab === 'PERSONA' && personas.length === 0
              ? '尚无分身，可先往「分身」页创建。'
              : '未见其人，换个关键字试试。'}
          </p>
        ) : null}
      </div>
    </div>
  );
}
