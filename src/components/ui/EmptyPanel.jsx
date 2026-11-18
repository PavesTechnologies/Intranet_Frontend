import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

// A detailed empty state for dashboard panels: a faded preview of what the panel will show, a title and a line on
// what will fill it, the steps that get it there, and the actions that start those steps. The preview is decorative
// (aria-hidden), so the text alone carries the meaning.

const TONES = {
  navy: { chip: "bg-[#0A0082]/10 text-[#0A0082]", step: "bg-[#0A0082]/[0.06] text-[#0A0082]", glow: "from-[#0A0082]/[0.04]" },
  pink: { chip: "bg-[#ff3d72]/10 text-[#ff3d72]", step: "bg-[#ff3d72]/[0.08] text-[#d81b5a]", glow: "from-[#ff3d72]/[0.05]" },
  teal: { chip: "bg-teal-500/10 text-teal-600", step: "bg-teal-500/10 text-teal-700", glow: "from-teal-500/[0.05]" },
};

export default function EmptyPanel({ icon: Icon, tone = "navy", title, text, preview = null, steps = [], actions = [], ...rest }) {
  const t = TONES[tone] || TONES.navy;
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-b ${t.glow} to-white px-4 py-6 sm:px-6`} {...rest}>
      {preview && (
        <div className="pointer-events-none mx-auto mb-5 w-full max-w-md select-none opacity-70" aria-hidden="true">
          {preview}
        </div>
      )}

      <div className="flex flex-col items-center gap-2 text-center">
        {Icon && (
          <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${t.chip}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
        {title && <p className="text-sm font-semibold text-[#0a174e]">{title}</p>}
        {text && <p className="max-w-sm text-xs leading-relaxed text-slate-500">{text}</p>}

        {steps.length > 0 && (
          <ol className="mt-2 flex flex-wrap items-center justify-center gap-1.5" aria-label="How this fills up">
            {steps.map((step, i) => (
              <li key={step} className="flex items-center gap-1.5">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${t.step}`}>
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold shadow-sm">{i + 1}</span>
                  {step}
                </span>
                {i < steps.length - 1 && <ChevronRight size={12} className="text-slate-300" aria-hidden="true" />}
              </li>
            ))}
          </ol>
        )}

        {actions.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {actions.map(({ label, to, icon: ActionIcon, primary }) => (
              <Link
                key={to}
                to={to}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/30 ${
                  primary ? "bg-[#0A0082] text-white shadow-sm hover:bg-[#0A0082]/90" : "bg-white text-[#0A0082] ring-1 ring-inset ring-[#0A0082]/20 hover:bg-[#0A0082]/[0.04]"
                }`}
              >
                {ActionIcon && <ActionIcon size={14} aria-hidden="true" />}
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Faded previews, sized to sit above the text.

const GHOST_BARS = [38, 58, 44, 72, 52, 86];

export function GhostBars({ labels = [] }) {
  // The most recent months line up with the bars, so the preview reads like the real chart.
  const recent = labels.slice(-GHOST_BARS.length);
  const bars = GHOST_BARS.map((h, i) => ({ h, label: recent[i] || "" }));
  return (
    <div>
      <div className="flex h-24 items-end gap-3 border-b border-dashed border-slate-200 px-2">
        {bars.map((b, i) => (
          <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-teal-200/70 to-teal-100/40" style={{ height: `${b.h}%` }} />
        ))}
      </div>
      {recent.length > 0 && (
        <div className="mt-1.5 flex gap-3 px-2">
          {bars.map((b, i) => (
            <span key={i} className="flex-1 truncate text-center text-[10px] text-slate-400">{b.label}</span>
          ))}
        </div>
      )}
    </div>
  );
}

const GHOST_SLICES = [
  { share: 0.4, color: "#fbcfe0" },
  { share: 0.25, color: "#c7d2fe" },
  { share: 0.2, color: "#99f6e4" },
  { share: 0.15, color: "#fde68a" },
];

export function GhostDonut() {
  const r = 56;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center justify-center gap-5">
      <svg viewBox="0 0 160 160" className="h-28 w-28 -rotate-90">
        {GHOST_SLICES.map((s) => {
          const len = s.share * c;
          const el = (
            <circle key={s.color} cx="80" cy="80" r={r} fill="none" stroke={s.color} strokeWidth="20"
              strokeDasharray={`${len - 3} ${c - len + 3}`} strokeDashoffset={-offset} />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="hidden w-28 space-y-2 sm:block">
        {GHOST_SLICES.map((s) => (
          <div key={s.color} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="h-2 rounded-full bg-slate-200" style={{ width: `${30 + s.share * 140}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function GhostRows({ rows = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 ring-1 ring-slate-100">
          <span className="h-7 w-7 shrink-0 rounded-lg bg-slate-100" />
          <div className="flex-1 space-y-1.5">
            <span className="block h-2 rounded-full bg-slate-200" style={{ width: `${60 - i * 12}%` }} />
            <span className="block h-1.5 rounded-full bg-slate-100" style={{ width: `${40 - i * 8}%` }} />
          </div>
          <span className="h-4 w-16 rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
