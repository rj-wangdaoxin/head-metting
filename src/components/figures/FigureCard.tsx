import Link from 'next/link';
import { FigureAvatar } from '@/components/figures/FigureAvatar';
import { ScrollCard } from '@/components/ink/ScrollCard';
import type { FigureCardView } from '@/lib/queries';
import { formatLifespan, truncate } from '@/lib/utils';

export function FigureCard({ figure }: { figure: FigureCardView }) {
  return (
    <Link href={`/figures/${figure.slug}`} className="group block">
      <ScrollCard hoverable className="h-full p-4">
        <div className="flex items-start gap-3">
          <FigureAvatar
            name={figure.name}
            dynasty={figure.dynasty}
            category={figure.category}
            inkColor={figure.inkColor}
            avatarUrl={figure.avatarUrl}
            avatarKind={figure.avatarKind}
            size={56}
            className="transition-transform duration-300 group-hover:rotate-[-3deg]"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5">
              <h3 className="font-serif text-lg font-bold leading-none text-ink">{figure.name}</h3>
              {figure.courtesy ? (
                <span className="truncate text-[11px] text-ink-mute">字{figure.courtesy}</span>
              ) : null}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span
                className="rounded-sm px-1.5 py-0.5"
                style={{ background: `${figure.inkColor}14`, color: figure.inkColor }}
              >
                {figure.dynasty}
              </span>
              <span className="rounded-sm bg-ink/5 px-1.5 py-0.5 text-ink-mute">{figure.category}</span>
              <span className="text-ink/45">{formatLifespan(figure.birthYear, figure.deathYear)}</span>
            </div>
          </div>
        </div>

        <p className="mt-3 line-clamp-2 text-justify-cn text-[13px] leading-6 text-ink-mute">
          {truncate(figure.thoughts, 78)}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {figure.personalityTraits.slice(0, 3).map((trait) => (
            <span
              key={trait}
              className="rounded-sm border border-paper-line px-1.5 py-0.5 text-[11px] text-ink-mute"
            >
              {trait}
            </span>
          ))}
        </div>
      </ScrollCard>
    </Link>
  );
}
