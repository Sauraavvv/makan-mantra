/**
 * Tells the explore page's section nav to get out of the way.
 *
 * The review sidebar and that nav are separate components under a server
 * component, so neither can hold the other's state and there is no parent to
 * lift it into. A custom event is how the rest of the site already does this —
 * see `auth-modal` — and it keeps the two from having to know about each other
 * beyond "something opened".
 *
 * The event carries the state rather than being a toggle, so a listener that
 * mounts late, or one that misses a message, cannot end up inverted.
 */
const CHANGE_EVENT = "mm-review-panel";

export function publishReviewPanel(open: boolean) {
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { open } }));
}

export function subscribeReviewPanel(listener: (open: boolean) => void) {
  const handle = (event: Event) => {
    listener(Boolean((event as CustomEvent<{ open?: boolean }>).detail?.open));
  };

  window.addEventListener(CHANGE_EVENT, handle);
  return () => window.removeEventListener(CHANGE_EVENT, handle);
}
