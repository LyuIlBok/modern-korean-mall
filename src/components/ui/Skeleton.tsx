export default function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-charcoal/5 rounded-sm ${className}`} />
  );
}
