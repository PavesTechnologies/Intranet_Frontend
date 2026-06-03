import { KPICard } from "../../../../components/kpi/KPI";

export default function StatCard({ title, value, icon: Icon, onClick, isActive, iconBg = "bg-indigo-50", iconColor = "text-indigo-600" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 min-w-[140px] text-left transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
    >
      <KPICard
        label={title}
        value={value}
        icon={<Icon className="h-5 w-5" />}
        color={`${iconBg} ${iconColor}`}
        active={isActive}
        className="h-full w-full bg-white border-gray-200 shadow-sm"
      />
    </button>
  );
}
