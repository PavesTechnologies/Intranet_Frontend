import { KPICard } from "../../../components/kpi/KPI";

function GroupSection({ title, cards, statusFilter, onStatusClick }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1 select-none">
        {title}
      </p>
      <div className="flex flex-wrap gap-3">
        {cards.map(({ status, label, count, icon: Icon, iconBg, iconColor }) => (
          <button
            key={status}
            type="button"
            onClick={() => onStatusClick(status)}
            className="shrink-0 min-w-[140px] flex-1 text-left transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
          >
            <KPICard
              label={label}
              value={count}
              icon={<Icon className="h-5 w-5" />}
              color={`${iconBg} ${iconColor}`}
              active={statusFilter === status}
              className="h-full w-full bg-white border-slate-200 shadow-sm"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * groups = [{ key, title, cards: [{ status, label, count, icon, iconBg, iconColor }] }]
 */
export default function GroupedKPISection({ groups, statusFilter, onStatusClick }) {
  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <GroupSection
          key={group.key}
          title={group.title}
          cards={group.cards}
          statusFilter={statusFilter}
          onStatusClick={onStatusClick}
        />
      ))}
    </div>
  );
}
