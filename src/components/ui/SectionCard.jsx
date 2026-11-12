import React from "react";

// Shared card with a heading, used for dashboard sections. Colours follow the site theme (navy headings, slate text).
export default function SectionCard({ title, subtitle, action, children, className = "", ...rest }) {
  return (
    <section className={`flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`} {...rest}>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-[#0a174e]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}
