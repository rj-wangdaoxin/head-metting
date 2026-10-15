import { PageSkeleton } from '@/components/ink/Skeleton';

export default function Loading() {
  return <PageSkeleton variant="grid" count={8} />;
}
