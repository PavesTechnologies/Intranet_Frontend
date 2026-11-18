import { ChevronRight } from "lucide-react";
import { Fonts } from "../Fonts/Fonts";

export default function PageHeader({ title, subtitle, actions, icon: Icon, className = "" }) {
  return (
    <div
      className={`mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between ${className}`.trim()}
    >
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0A0082]/10 text-[#0A0082]">
            <Icon size={20} aria-hidden="true" />
          </span>
        ) : null}
        <div className="min-w-0">
          <h1 className={`${Fonts.heading3} md:text-3xl`}>{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}
