import React from "react";
import StatCard from "../../../../components/Cards/StatCard";
import { formatCurrency, formatNumber } from "../../utils/formatters";

const TONE_TEXT_COLOR = {
  critical: "text-red-600",
  warning: "text-amber-600",
  good: "text-emerald-600",
  neutral: "text-slate-800",
};

export default function KPICardGrid({ kpis }) {
  if (!kpis) return null;

  const cards = [
    {
      title: "Total Outstanding Payables",
      value: formatCurrency(kpis.totalOutstanding.value),
      subtitle: `${kpis.totalOutstanding.trend === "up" ? "▲" : "▼"} ${kpis.totalOutstanding.deltaPct}% vs last month`,
      textColor: TONE_TEXT_COLOR[kpis.totalOutstanding.tone] || TONE_TEXT_COLOR.neutral,
    },
    {
      title: "Pending Processing",
      value: formatNumber(kpis.pendingProcessing.count),
      subtitle: `${formatCurrency(kpis.pendingProcessing.value)} in inbox & validation`,
      textColor: TONE_TEXT_COLOR.neutral,
    },
    {
      title: "Pending Approval",
      value: formatNumber(kpis.pendingApproval.count),
      subtitle: `${formatCurrency(kpis.pendingApproval.value)} awaiting sign-off`,
      textColor: TONE_TEXT_COLOR.neutral,
    },
    {
      title: "Overdue Invoices",
      value: formatNumber(kpis.overdue.count),
      subtitle: `${formatCurrency(kpis.overdue.value)} past due`,
      textColor: TONE_TEXT_COLOR[kpis.overdue.tone] || TONE_TEXT_COLOR.critical,
    },
    {
      title: "Open Exceptions",
      value: formatNumber(kpis.openExceptions.count),
      subtitle: `Across ${kpis.openExceptions.types} exception types`,
      textColor: TONE_TEXT_COLOR[kpis.openExceptions.tone] || TONE_TEXT_COLOR.warning,
    },
    {
      title: "Straight-Through Rate",
      value: `${kpis.straightThroughRate.pct}%`,
      subtitle: `${kpis.straightThroughRate.trend === "up" ? "▲" : "▼"} ${kpis.straightThroughRate.deltaPts} pts this month`,
      textColor: TONE_TEXT_COLOR[kpis.straightThroughRate.tone] || TONE_TEXT_COLOR.good,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <StatCard key={card.title} {...card} />
      ))}
    </div>
  );
}
