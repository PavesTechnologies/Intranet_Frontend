import { useEffect, useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";

/**
 * Invoice Details card with a dropdown-style header: clicking anywhere on the header (except
 * the `actions` area) opens/closes the body. Collapsed unless `defaultOpen`.
 *
 * `anchorId` — when an in-page link to `#anchorId` is clicked (e.g. InvoicePaymentPanel's
 * "Verify TDS" link), or the page loads with that hash, the card opens so the link lands on
 * visible content instead of a closed card.
 *
 * `footer` renders outside the collapsible body and is always mounted — used for the panels'
 * modals, so a dialog is never torn down mid-flow if the card is collapsed.
 *
 * @param {{
 *   title: import("react").ReactNode,
 *   subtitle?: import("react").ReactNode,
 *   icon?: import("react").ReactNode,
 *   badge?: import("react").ReactNode,
 *   actions?: import("react").ReactNode,
 *   defaultOpen?: boolean,
 *   anchorId?: string,
 *   bodyClassName?: string,
 *   footer?: import("react").ReactNode,
 *   children: import("react").ReactNode,
 * }} props
 */
export default function CollapsiblePanel({
  title,
  subtitle,
  icon,
  badge,
  actions,
  defaultOpen = false,
  anchorId,
  bodyClassName = "",
  footer,
  children,
}) {
  const [open, setOpen] = useState(() => defaultOpen || (anchorId != null && typeof window !== "undefined" && window.location.hash === `#${anchorId}`));
  const bodyId = useId();

  useEffect(() => {
    if (!anchorId) return undefined;
    const openOnAnchorClick = (event) => {
      if (event.target instanceof Element && event.target.closest(`a[href="#${anchorId}"]`)) setOpen(true);
    };
    const openOnHash = () => {
      if (window.location.hash === `#${anchorId}`) setOpen(true);
    };
    document.addEventListener("click", openOnAnchorClick, true);
    window.addEventListener("hashchange", openOnHash);
    return () => {
      document.removeEventListener("click", openOnAnchorClick, true);
      window.removeEventListener("hashchange", openOnHash);
    };
  }, [anchorId]);

  const toggle = () => setOpen((current) => !current);

  return (
    <PageCard>
      <div className="flex cursor-pointer items-center gap-3 rounded-xl p-4 hover:bg-gray-50/70" onClick={toggle}>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            toggle();
          }}
          aria-expanded={open}
          aria-controls={open ? bodyId : undefined}
          className="min-w-0 flex-1 rounded text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/40"
        >
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            {icon}
            {title}
          </h3>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </button>
        {(badge || actions) && (
          // Badges/actions sit outside the toggle: clicking e.g. "Re-check" must not collapse the card.
          <div className="flex shrink-0 items-center gap-2 text-xs text-gray-500" onClick={(event) => event.stopPropagation()}>
            {badge}
            {actions}
          </div>
        )}
        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </div>

      {open && (
        <PageCardContent className="border-t border-gray-100">
          <div id={bodyId} className={bodyClassName}>
            {children}
          </div>
        </PageCardContent>
      )}
      {footer}
    </PageCard>
  );
}
