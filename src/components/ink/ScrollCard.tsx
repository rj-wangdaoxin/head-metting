import { cn } from '@/lib/utils';

interface ScrollCardProps {
  className?: string;
  children: React.ReactNode;
  /** 悬停是否浮起 */
  hoverable?: boolean;
}

/** 卷轴纸卡：宣纸底 + 细墨边 + 卷轴阴影 */
export function ScrollCard({ className, children, hoverable = false }: ScrollCardProps) {
  return (
    <div
      className={cn(
        'scroll-card',
        hoverable && 'hover:-translate-y-1 hover:border-ink/25 hover:shadow-scrollHover',
        className,
      )}
    >
      {children}
    </div>
  );
}
