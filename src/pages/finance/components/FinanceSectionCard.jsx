/**
 * Card shell shared by every Finance dashboard section: colored indicator bar,
 * title, optional right-aligned header link/action.
 *   accent     — Tailwind bg-* class for the indicator bar
 *   linkLabel  — optional header link text (rendered with a trailing arrow)
 *   onLinkClick — handler for that link
 */
export default function FinanceSectionCard({
  title,
  subtitle,
  action,
  linkLabel,
  onLinkClick,
  children,
  accent = "bg-[#263383]",
  className = "",
}) {
  const headerAction =
    action ??
    (linkLabel && onLinkClick ? (
      <button type="button" onClick={onLinkClick} className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline">
        {linkLabel} →
      </button>
    ) : linkLabel ? (
      <span className="shrink-0 text-xs font-medium text-blue-600">{linkLabel} →</span>
    ) : null);

  return (
    <section className={`flex min-w-0 flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={`h-5 w-1 shrink-0 rounded-full ${accent}`} aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-gray-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
          </div>
        </div>
        {headerAction}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}
