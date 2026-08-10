import { Fonts } from "../Fonts/Fonts";

export default function FilterCard({
  title = "Filters",
  description,
  children,
  className = "",
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm ${className}`.trim()}
    >
      <div className="mb-2 flex items-start gap-2.5">
        <span className="mt-0.5 h-7 w-1 rounded-full bg-indigo-600" />
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {description ? <p className={Fonts.smallText}>{description}</p> : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}
