import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

/**
 * The one card shell every dashboard block uses, so headers, padding and
 * radius stay identical across the page instead of drifting per section.
 */
export function Panel({
  title,
  icon: Icon,
  tone = "bg-muted text-muted-foreground",
  action,
  headerAction,
  soon = false,
  children,
  className = "",
}: {
  title: string;
  icon?: LucideIcon;
  /** Tailwind classes for the icon chip, e.g. "bg-saffron/10 text-saffron". */
  tone?: string;
  action?: { label: string; href: string };
  headerAction?: React.ReactNode;
  soon?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`min-w-0 overflow-hidden rounded-xl border border-border bg-card ${className}`}>
      <header className="flex items-center gap-3 border-b border-border px-5 py-4">
        {Icon && (
          <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${tone}`}>
            <Icon className="size-[18px]" strokeWidth={1.8} />
          </span>
        )}

        <h2 className="min-w-0 flex-1 truncate text-[15px] font-bold text-foreground">
          {title}
        </h2>

        {soon && (
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Coming soon
          </span>
        )}

        {headerAction}

        {action && !soon && (
          <Link
            href={action.href}
            className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-saffron transition-opacity hover:opacity-80"
          >
            {action.label}
            <ArrowUpRight className="size-3.5" strokeWidth={2} />
          </Link>
        )}
      </header>

      <div className="p-5">{children}</div>
    </section>
  );
}
