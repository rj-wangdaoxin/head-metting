import { cn } from '@/lib/utils';

/** 竖排标题：碑刻感，常用于页面主标题侧栏 */
export function VerticalTitle({
  text,
  sub,
  className,
}: {
  text: string;
  sub?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start gap-2', className)}>
      <span className="vertical-text font-serif text-xl font-bold tracking-widest text-ink">{text}</span>
      {sub ? (
        <span className="vertical-text mt-1 font-serif text-[11px] tracking-[0.3em] text-cinnabar/80">{sub}</span>
      ) : null}
    </div>
  );
}
