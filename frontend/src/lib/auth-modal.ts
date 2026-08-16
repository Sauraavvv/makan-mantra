/**
 * Asks the header to open its sign-in modal, from anywhere on the page.
 *
 * The header also opens on a `?auth=login` URL, but it reads that once when it
 * mounts — which is the right place for a visitor arriving from a redirect, and
 * no use at all to a button on a page the header is already on. Reading the
 * parameter live instead would mean `useSearchParams` in the header, and the
 * header is on every page, so that would pull the whole site out of the
 * prerender for the sake of one modal.
 */
export type AuthModalMode = "login" | "register" | "verify";

const OPEN_EVENT = "mm-open-auth";

export function openAuthModal(mode: AuthModalMode = "login") {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { mode } }));
}

export function subscribeAuthModal(listener: (mode: AuthModalMode) => void) {
  const handle = (event: Event) => {
    const mode = (event as CustomEvent<{ mode?: AuthModalMode }>).detail?.mode;
    listener(mode ?? "login");
  };

  window.addEventListener(OPEN_EVENT, handle);
  return () => window.removeEventListener(OPEN_EVENT, handle);
}
