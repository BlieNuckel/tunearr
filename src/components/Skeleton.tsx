interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className = "h-4 w-full" }: SkeletonProps) {
  return (
    <div
      className={`rounded bg-gray-200 dark:bg-gray-700 animate-shimmer ${className}`}
    />
  );
}
