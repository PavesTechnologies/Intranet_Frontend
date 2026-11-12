import React from "react";
import { useNavigate } from "react-router-dom";
import { Banknote, Clock3, FileText, ReceiptText, ScanLine, Wallet } from "lucide-react";
import SectionCard from "@/components/ui/SectionCard";
import QuickActionCard from "@/components/ui/QuickActionCard";
import { useAuth } from "@/contexts/AuthContext";
import CategoryDonut from "@/components/ui/CategoryDonut";
import { ItemList } from "./DashboardWidgets";
import EmployeeLedgers from "./EmployeeLedgers";
import RecentActivity from "./RecentActivity";
import { reminderItems } from "./employeeActivity";
import { useEmployeeAdvances, useEmployeeReports } from "./useEmployeeActivitySources";

// Employee money view, top to bottom: quick actions, the two ledgers, the category donut beside the items that need the
// employee, then recent activity. Every amount is the backend's figure, or a record the employee can already open.

const ICONS = { Banknote, FileText, ReceiptText, ScanLine, Clock3, Wallet };

/** Quick actions as cards. An action is hidden when the role cannot open its route (roles match the App.jsx guards). */
export function QuickActions({ actions = [] }) {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const visible = actions.filter((a) => !a.roles || hasRole(a.roles));
  if (!visible.length) return null;
  return (
    <SectionCard title="Quick actions" subtitle="Start something new, or open what you already have" data-quick-actions>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {visible.map((a) => {
          const Icon = ICONS[a.icon] || FileText;
          return (
          <QuickActionCard
            key={a.key || a.label}
            icon={Icon}
            label={a.label}
            hint={a.hint}
            data-quick-action={a.key}
            onClick={() => navigate(a.to)}
          />
          );
        })}
      </div>
    </SectionCard>
  );
}

export default function EmployeeMoneyFlow({ data, config, currency }) {
  const { hasRole } = useAuth();
  const byKey = Object.fromEntries((data.kpis || []).map((k) => [k.key, k]));

  // The advance and report lists are the employee's own. A role that cannot open one does not request it.
  const advances = useEmployeeAdvances(hasRole(["GENERAL"]));
  const reports = useEmployeeReports(hasRole(["GENERAL", "MANAGER"]));

  const attention = [
    ...reminderItems(advances.data || [], new Date()),
    ...(data.attention || []),
  ];

  return (
    <>
      <QuickActions actions={config.quickActions} />

      <EmployeeLedgers ledgers={config.ledgers} byKey={byKey} currency={currency} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <SectionCard title="Reimbursement by category" subtitle={`Claimed amounts, ${currency}`} className="lg:col-span-2">
          <CategoryDonut
            slices={data.breakdown}
            currency={currency}
            claimed={byKey.erClaimed ? byKey.erClaimed.value : null}
            period="All time, all submitted reports"
          />
        </SectionCard>
        <SectionCard title={config.attentionTitle} subtitle="Fix these to keep your money moving" className="lg:col-span-3">
          <ItemList items={attention} currency={currency} linkFor={(it) => it.to || config.link(it)} empty={config.attentionEmpty} />
        </SectionCard>
      </div>

      <SectionCard title={config.activityTitle} subtitle="Your cash advances and expense reports, newest first">
        <RecentActivity
          advances={advances.data}
          reports={reports.data}
          advancesLoading={advances.isLoading}
          reportsLoading={reports.isLoading}
          advancesError={advances.isError}
          reportsError={reports.isError}
          currency={currency}
          canOpenAdvances={hasRole(["GENERAL"])}
          canOpenReports={hasRole(["GENERAL", "MANAGER"])}
        />
      </SectionCard>
    </>
  );
}
