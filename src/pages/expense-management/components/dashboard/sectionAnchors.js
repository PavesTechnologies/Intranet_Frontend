// Anchors for the employee dashboard sections the summary banner links to, and a helper that scrolls to one.
// The target gets a short highlight ring and keyboard focus, so it is obvious where the click landed.

export const SECTION = {
  journey: "em-report-journey",
  needsYou: "em-needs-you",
  advance: "em-advance-ledger",
  reimbursement: "em-reimbursement-ledger",
};

// Props for a section that can be scrolled to: id, focusable without joining the tab order, and a small top margin.
export const anchorProps = (id) => ({ id, tabIndex: -1, "data-anchor": id });
export const ANCHOR_CLASS = "scroll-mt-4 outline-none transition-shadow duration-500";

const HIGHLIGHT = ["ring-2", "ring-[#0A0082]/30", "ring-offset-2"];

export function scrollToSection(id) {
  const el = typeof document !== "undefined" ? document.getElementById(id) : null;
  if (!el) return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView?.({ behavior: reduce ? "auto" : "smooth", block: "start" });
  el.focus?.({ preventScroll: true });
  el.classList.add(...HIGHLIGHT);
  window.setTimeout(() => el.classList.remove(...HIGHLIGHT), 1600);
}
