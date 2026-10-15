import { cn } from '@/lib/utils';

/** 云纹分隔线：中间一枚小印，两侧渐隐墨线 */
export function CloudDivider({ className, label }: { className?: string; label?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-paper-line" />
      {label ? (
        <span className="font-serif text-xs tracking-[0.3em] text-ink-mute">{label}</span>
      ) : (
        <span className="h-1.5 w-1.5 rotate-45 border border-cinnabar/60 bg-cinnabar/20" />
      )}
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-paper-line" />
    </div>
  );
}
