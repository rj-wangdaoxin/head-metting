import { cn } from '@/lib/utils';

/** 骨架条 */
export function SkeletonBar({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-sm bg-paper-deep', className)} />;
}

function GridItem() {
  return (
    <div className="scroll-card p-4">
      <div className="flex items-start gap-3">
        <SkeletonBar className="h-14 w-14" />
        <div className="flex-1 space-y-2 pt-1">
          <SkeletonBar className="h-4 w-20" />
          <SkeletonBar className="h-3 w-28" />
        </div>
      </div>
      <SkeletonBar className="mt-3 h-3 w-full" />
      <SkeletonBar className="mt-2 h-3 w-4/5" />
      <div className="mt-3 flex gap-1.5">
        <SkeletonBar className="h-4 w-12" />
        <SkeletonBar className="h-4 w-14" />
      </div>
    </div>
  );
}

function ListItem() {
  return (
    <div className="scroll-card flex items-center gap-4 p-4">
      <SkeletonBar className="h-12 w-12" />
      <div className="flex-1 space-y-2">
        <SkeletonBar className="h-4 w-1/3" />
        <SkeletonBar className="h-3 w-1/2" />
      </div>
      <SkeletonBar className="h-6 w-16" />
    </div>
  );
}

function PanelItem() {
  return (
    <div className="scroll-card space-y-3 p-5">
      <SkeletonBar className="h-5 w-32" />
      <SkeletonBar className="h-3 w-full" />
      <SkeletonBar className="h-3 w-3/4" />
      <SkeletonBar className="h-9 w-full" />
    </div>
  );
}

/**
 * 路由级加载骨架：动态页面渲染前先出纸面骨架，点击导航即可见反馈。
 */
export function PageSkeleton({
  variant = 'grid',
  maxWidth = 'max-w-[1400px]',
  cols = 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  count,
}: {
  variant?: 'grid' | 'list' | 'panel';
  maxWidth?: string;
  cols?: string;
  count?: number;
}) {
  const n = count ?? (variant === 'list' ? 5 : variant === 'panel' ? 3 : 8);

  return (
    <div className={cn('mx-auto animate-pulse px-6 py-10', maxWidth)}>
      <SkeletonBar className="h-7 w-28" />
      <SkeletonBar className="mt-3 h-4 w-72" />

      <div className={cn('mt-6', variant === 'grid' && 'grid gap-4', variant === 'grid' && cols)}>
        {variant === 'grid'
          ? Array.from({ length: n }, (_, i) => <GridItem key={i} />)
          : null}
      </div>

      {variant !== 'grid' ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: n }, (_, i) =>
            variant === 'list' ? <ListItem key={i} /> : <PanelItem key={i} />,
          )}
        </div>
      ) : null}
    </div>
  );
}
