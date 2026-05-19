import React from "react";
import { FileText, CheckSquare, Clock, TrendingUp } from "lucide-react";

const KpiCard = ({ icon, iconBg, iconColor, label, value, sub, rightContent }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
      {React.cloneElement(icon, { className: `w-5 h-5 ${iconColor}` })}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">{label}</p>
      <p className="text-2xl font-semibold text-slate-800 leading-tight">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
    {rightContent && <div className="shrink-0">{rightContent}</div>}
  </div>
);

const SprintHealthCard = ({ isOnTrack, completionPercentage, deviationPoints }) => {
  const healthLabel = isOnTrack ? "On Track" : deviationPoints < -5 ? "At Risk" : "Behind";
  const healthColor = isOnTrack ? "text-green-600" : deviationPoints < -5 ? "text-red-600" : "text-amber-600";
  const barColor    = isOnTrack ? "bg-green-500" : deviationPoints < -5 ? "bg-red-500" : "bg-amber-500";
  const pct         = Math.min(Math.max(completionPercentage ?? 0, 0), 100);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">Sprint health</p>
      <p className={`text-2xl font-semibold leading-tight ${healthColor}`}>{healthLabel}</p>
      <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-slate-400 mt-1">{pct}% complete</p>
    </div>
  );
};

const KpiCards = ({ kpis }) => {
  if (!kpis) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      <KpiCard
        icon={<FileText />}
        iconBg="bg-blue-50"
        iconColor="text-blue-600"
        label="Total scope"
        value={`${kpis.totalScope ?? 0} pts`}
        sub={`${kpis.totalIssues ?? 0} issues`}
      />
      <KpiCard
        icon={<CheckSquare />}
        iconBg="bg-green-50"
        iconColor="text-green-600"
        label="Completed"
        value={`${kpis.completed ?? 0} pts`}
        sub={`${kpis.completionPercentage ?? 0}% done`}
      />
      <KpiCard
        icon={<Clock />}
        iconBg="bg-orange-50"
        iconColor="text-orange-500"
        label="Remaining"
        value={`${kpis.remaining ?? 0} pts`}
        sub={`${kpis.remainingIssues ?? 0} issues left`}
      />
      <SprintHealthCard
        isOnTrack={kpis.isOnTrack}
        completionPercentage={kpis.completionPercentage}
        deviationPoints={kpis.deviationPoints}
      />
    </div>
  );
};

export default KpiCards;