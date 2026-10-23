// "What you do here" panel at the top of an Accounts Payable page: the steps of the viewer's own
// role(s), in order, each linking to where it is done, plus the terms the page uses. Collapsing it is
// remembered per viewer and page (a convenience only - it opens again when storage is unavailable).
import { useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { ChevronDown, Compass, Info } from "lucide-react";
import { AP_ROUTES } from "../../constants/routes";
import { GLOSSARY, PAGE_GUIDES } from "../../constants/pageGuides";
import { useApPermissions } from "../../hooks/useApPermissions";

const storageKey = (page) => `apGuide:${page}:collapsed`;
const readCollapsed = (page) => {
  try {
    return window.localStorage.getItem(storageKey(page)) === "1";
  } catch {
    return false;
  }
};
const writeCollapsed = (page, value) => {
  try {
    window.localStorage.setItem(storageKey(page), value ? "1" : "0");
  } catch {
    /* storage blocked - the panel simply opens next time */
  }
};

/** A term with its one-line meaning, shown on click / focus. */
export function Term({ name }) {
  const [open, setOpen] = useState(false);
  const meaning = GLOSSARY[name];
  if (!meaning) return null;
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        aria-expanded={open}
        aria-label={`What is ${name}?`}
        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:border-[#0A0082]/40 hover:text-[#0A0082] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/40"
      >
        <Info className="h-3 w-3" aria-hidden="true" /> {name}
      </button>
      {open && (
        <span role="tooltip" className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-slate-200 bg-white p-2.5 text-xs leading-relaxed text-slate-700 shadow-lg">
          <strong className="text-slate-900">{name}</strong> - {meaning}
        </span>
      )}
    </span>
  );
}

export function FlowSteps({ steps }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(170px,1fr))]">
      {steps.map((step, i) => {
        const body = (
          <>
            <span className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0A0082] text-[11px] font-semibold text-white">{i + 1}</span>
              <span className="text-sm font-semibold text-slate-800">{step.label}</span>
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-slate-500">{step.detail}</span>
          </>
        );
        return (
          <li key={step.label} className="min-w-0">
            {step.to ? (
              <Link to={step.to} className="block h-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition hover:border-[#0A0082]/40 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/40">
                {body}
              </Link>
            ) : (
              <div className="h-full rounded-lg border border-slate-200 bg-white px-3 py-2.5">{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export const termsOf = (flows) => [...new Set(flows.flatMap((f) => f.steps.flatMap((s) => s.terms || [])))];

export default function PageGuide({ page }) {
  const permissions = useApPermissions() || {};
  const guide = PAGE_GUIDES[page];
  const [collapsed, setCollapsed] = useState(() => readCollapsed(page));
  if (!guide) return null;
  const flows = guide.flows.filter((f) => f.when(permissions));
  if (!flows.length) return null;
  const terms = termsOf(flows);

  const toggle = () => {
    writeCollapsed(page, !collapsed);
    setCollapsed(!collapsed);
  };

  return (
    <section aria-labelledby={`guide-${page}`} className="mb-4 rounded-xl border border-[#0A0082]/15 bg-[#0A0082]/[0.03]">
      <button type="button" onClick={toggle} aria-expanded={!collapsed} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/40">
        <span className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-[#0A0082]" aria-hidden="true" />
          <span id={`guide-${page}`} className="text-sm font-semibold text-slate-800">{guide.title}</span>
        </span>
        <span className="flex items-center gap-1 text-xs font-medium text-[#0A0082]">
          {collapsed ? "Show" : "Hide"}
          <ChevronDown className={clsx("h-4 w-4 transition-transform", !collapsed && "rotate-180")} aria-hidden="true" />
        </span>
      </button>
      {!collapsed && (
        <div className="space-y-3 px-4 pb-4">
          {guide.intro && <p className="text-xs text-slate-600">{guide.intro}</p>}
          {flows.map((flow) => (
            <div key={flow.role || "flow"} className="space-y-2">
              {flows.length > 1 && flow.role && <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">As {flow.role}</p>}
              <FlowSteps steps={flow.steps} />
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {terms.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-500">Terms used here:</span>
                {terms.map((t) => <Term key={t} name={t} />)}
              </div>
            ) : <span />}
            <Link to={AP_ROUTES.GUIDE} className="text-xs font-medium text-[#0A0082] hover:underline">How Accounts Payable works →</Link>
          </div>
        </div>
      )}
    </section>
  );
}
