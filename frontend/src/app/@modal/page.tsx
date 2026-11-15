/**
 * Soft-navigating to `/` from inside a modal must clear the slot; without a
 * match here it would keep showing the last modal over the home page.
 */
export default function ModalHome() {
  return null;
}
