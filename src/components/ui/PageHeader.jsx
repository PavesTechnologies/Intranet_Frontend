import { ChevronRight } from "lucide-react";
import { Fonts } from "../Fonts/Fonts";

// `breadcrumbs` is optional: an array of { label, href? }. Omitting it renders
// exactly what every existing consumer already gets.
export default function PageHeader({ title, subtitle, actions, breadcrumbs, className = "" }) {
  return (
    <div
      className={`mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between ${className}`.trim()}
    >
      <div>
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="mb-1 flex items-center gap-1 text-xs text-slate-400" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                {index > 0 && <ChevronRight className="h-3 w-3" aria-hidden="true" />}
                {crumb.href ? (
                  <a href={crumb.href} className="hover:text-slate-600 hover:underline">
                    {crumb.label}
                  </a>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
        <h1 className={`${Fonts.heading3} md:text-3xl`}>{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}
