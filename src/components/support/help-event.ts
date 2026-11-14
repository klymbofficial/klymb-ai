/**
 * Opens Kamran (the support bot) from a button elsewhere on the page, such as
 * the homepage's "Chat with us". The panel opens beside `anchor`, and focus
 * goes back to it when the panel is closed with Escape.
 */
export const HELP_EVENT = "klymb:open-help";

export interface HelpEventDetail {
  anchor?: HTMLElement | null;
}

export function openHelp(anchor?: HTMLElement | null) {
  window.dispatchEvent(new CustomEvent<HelpEventDetail>(HELP_EVENT, { detail: { anchor } }));
}
