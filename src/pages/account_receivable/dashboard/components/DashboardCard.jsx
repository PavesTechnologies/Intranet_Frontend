import { useId } from "react";

/**
 * Section shell for every dashboard panel: a labelled <section> with an h2,
 * optional description and right-aligned actions.
 */
export default function DashboardCard({
  title,
  description,
  icon: Icon,
  actions,
  footer,
  children,
  className = "",
  bodyClassName = "p-4 sm:p-5",
}) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className={`flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <header className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="min-w-0">
          <h2
            id={headingId}
            className="flex items-center gap-2 text-sm font-semibold text-slate-900 [text-wrap:balance]"
          >
            {Icon ? <Icon className="h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true" /> : null}
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500 [text-wrap:pretty]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </header>

      <div className={`min-w-0 flex-1 ${bodyClassName}`}>{children}</div>

      {footer ? (
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-500 sm:px-5">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}
