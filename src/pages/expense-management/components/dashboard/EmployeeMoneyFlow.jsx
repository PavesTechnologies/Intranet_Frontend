import React from "react";
import { Inbox, PieChart, TrendingUp } from "lucide-react";
import SectionCard from "@/components/ui/SectionCard";
import QuickActions from "./QuickActions";
import { useAuth } from "@/contexts/AuthContext";
import CategoryDonut from "@/components/ui/CategoryDonut";
import { ItemList } from "./DashboardWidgets";
import EmployeeLedgers from "./EmployeeLedgers";
import RecentActivity from "./RecentActivity";
import { reminderItems } from "./employeeActivity";
import { useEmployeeAdvances, useEmployeeReports } from "./useEmployeeActivitySources";

// Employee money view, top to bottom: quick actions, the two ledgers, the category donut beside the items that need the
// employee, then recent activity. Every amount is the backend's figure, or a record the employee can already open.

export { QuickActions };

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
        <SectionCard title="Reimbursement by category" subtitle={`Claimed amounts, ${currency}`} icon={PieChart} tone="pink" className="lg:col-span-3">
          <CategoryDonut
            slices={data.breakdown}
            currency={currency}
            claimed={byKey.erClaimed ? byKey.erClaimed.value : null}
            period="All time, all submitted reports"
          />
        </SectionCard>
        <SectionCard title={config.attentionTitle} subtitle="Items that need your action" icon={Inbox} tone="amber" className="lg:col-span-2">
          <ItemList items={attention} currency={currency} linkFor={(it) => it.to || config.link(it)} empty={config.attentionEmpty} />
        </SectionCard>
      </div>

      <SectionCard title={config.activityTitle} subtitle="Your cash advances and expense reports, newest first" icon={TrendingUp} tone="teal">
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
