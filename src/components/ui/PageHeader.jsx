import { Fonts } from "../Fonts/Fonts";

export default function PageHeader({ title, subtitle, actions, className = "" }) {
  return (
    <div
      className={`mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between ${className}`.trim()}
    >
      <div>
        <h1 className={`${Fonts.heading3} md:text-3xl`}>{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}
