import { PageSkeleton } from '@/components/ink/Skeleton';

export default function Loading() {
  return <PageSkeleton variant="list" maxWidth="max-w-[1400px]" count={4} />;
}
