import { PageSkeleton } from '@/components/ink/Skeleton';

export default function Loading() {
  return <PageSkeleton variant="panel" maxWidth="max-w-[1000px]" count={3} />;
}
