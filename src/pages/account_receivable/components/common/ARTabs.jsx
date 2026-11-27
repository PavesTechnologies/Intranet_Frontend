/**
 * Page-level tabs in the AR style (same look as the Tax Region detail tabs).
 * Use ARKPIStatusTabs instead when each tab carries a record count.
 */
export default function ARTabs({ tabs = [], activeKey, onChange, label = "Sections" }) {
  return (
    <div role="tablist" aria-label={label} className="flex items-center gap-2 overflow-x-auto border-b border-slate-200">
      {tabs.map((tab) => {
        const active = activeKey === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(tab.key)}
            className={`-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:bg-slate-50 ${
              active ? "border-[#0A0082] text-[#0A0082]" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.icon && <tab.icon className="h-4 w-4" />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
