import { cn } from "@/lib/utils";

export function DotPattern({
  className,
  width = 32,
  height = 32,
  cx = 1,
  cy = 1,
  cr = 1,
}: {
  className?: string;
  width?: number;
  height?: number;
  cx?: number;
  cy?: number;
  cr?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 h-full w-full fill-white/25", className)}
    >
      <defs>
        <pattern id="auth-dot-pattern" width={width} height={height} patternUnits="userSpaceOnUse">
          <circle cx={cx} cy={cy} r={cr} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#auth-dot-pattern)" />
    </svg>
  );
}
