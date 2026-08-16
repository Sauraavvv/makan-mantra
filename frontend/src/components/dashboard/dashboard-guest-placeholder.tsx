/**
 * What a signed-out visitor gets in place of a page that belongs to an account.
 *
 * It renders the shape of a dashboard page and none of its content — there is
 * nothing here to read, which is the point: `DashboardGuestGate` blurs whatever
 * sits under it, and a blur is a curtain, not a lock. Anything real rendered
 * here would still be in the page's markup.
 */
export function DashboardGuestPlaceholder() {
  return (
    <div aria-hidden="true" className="space-y-5">
      <div className="space-y-2">
        <div className="h-8 w-56 rounded-lg bg-muted" />
        <div className="h-4 w-80 max-w-full rounded bg-muted/70" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((tile) => (
          <div key={tile} className="h-24 rounded-2xl border border-border bg-background" />
        ))}
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-background p-5">
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-16 rounded-xl bg-muted/60" />
        ))}
      </div>
    </div>
  );
}
