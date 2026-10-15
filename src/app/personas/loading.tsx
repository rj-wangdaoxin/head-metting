import { PageSkeleton } from '@/components/ink/Skeleton';

export default function Loading() {
  return <PageSkeleton variant="grid" maxWidth="max-w-[1200px]" cols="sm:grid-cols-2 lg:grid-cols-3" count={6} />;
}
