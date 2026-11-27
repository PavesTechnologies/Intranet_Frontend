/**
 * Card shell shared by every Finance dashboard section: icon (or brand
 * indicator bar), title, optional subtitle and right-aligned header action.
 *   icon        — optional lucide icon shown in a brand-tinted chip
 *   accent      — Tailwind bg-* class for the indicator bar when no icon is given
 *   linkLabel   — optional header link text (rendered with a trailing arrow)
 *   onLinkClick — handler for that link
 */
export default function FinanceSectionCard({
  title,
  subtitle,
  icon: Icon,
  action,
  linkLabel,
  onLinkClick,
  children,
  accent = "bg-[#0A0082]",
  className = "",
}) {
  const headerAction =
    action ??
    (linkLabel && onLinkClick ? (
      <button
        type="button"
        onClick={onLinkClick}
        className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#0A0082] transition hover:bg-[#0A0082]/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/40"
      >
        {linkLabel} →
      </button>
    ) : linkLabel ? (
      <span className="shrink-0 text-xs font-medium text-slate-400">{linkLabel}</span>
    ) : null);

  return (
    <section
      className={`flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-4 ${className}`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-3">
          {Icon ? (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0A0082]/[0.06] text-[#0A0082]">
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
          ) : (
            <span className={`h-5 w-1 shrink-0 rounded-full ${accent}`} aria-hidden="true" />
          )}
          <div className="min-w-0">
            <h2 className="font-heading text-[15px] font-semibold leading-tight text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {headerAction}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}
