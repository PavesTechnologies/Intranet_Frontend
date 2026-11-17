import React from "react";
import { Inbox, LineChart, PieChart, Route, TrendingUp } from "lucide-react";
import SectionCard from "@/components/ui/SectionCard";
import QuickActions from "./QuickActions";
import { useAuth } from "@/contexts/AuthContext";
import CategoryDonut from "@/components/ui/CategoryDonut";
import { ItemList } from "./DashboardWidgets";
import EmployeeLedgers from "./EmployeeLedgers";
import RecentActivity from "./RecentActivity";
import EmployeeOverview from "./EmployeeOverview";
import ReportJourney from "./ReportJourney";
import SpendTrend from "./SpendTrend";
import { reminderItems, settlementReminders } from "./employeeActivity";
import { ANCHOR_CLASS, SECTION, anchorProps } from "./sectionAnchors";
import { useEmployeeAdvances, useEmployeeReports } from "./useEmployeeActivitySources";

// Employee money view, top to bottom: a summary banner (what is on its way, what needs you), quick actions, where each
// report is in the approval journey beside the items that need the employee, the two ledgers, monthly spend beside the
// category donut, then recent activity. Every amount is the backend's figure, or a record the employee can already open.

export { QuickActions };

export default function EmployeeMoneyFlow({ data, config, currency }) {
  const { hasRole } = useAuth();
  const byKey = Object.fromEntries((data.kpis || []).map((k) => [k.key, k]));

  // The advance and report lists are the employee's own. A role that cannot open one does not request it.
  const advances = useEmployeeAdvances(hasRole(["GENERAL"]));
  const reports = useEmployeeReports(hasRole(["GENERAL", "MANAGER"]));

  const now = new Date();
  const reminders = settlementReminders(advances.data || [], now);
  const attention = [
    ...reminderItems(advances.data || [], now),
    ...(data.attention || []),
  ];

  return (
    <>
      <EmployeeOverview byKey={byKey} currency={currency} attentionCount={attention.length} reminders={reminders} />

      <QuickActions actions={config.quickActions} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <SectionCard
          title="Where your reports are"
          subtitle="Every report moves through these steps, left to right"
          icon={Route}
          tone="navy"
          className={`${ANCHOR_CLASS} xl:col-span-3`}
          {...anchorProps(SECTION.journey)}
        >
          <ReportJourney pipeline={data.pipeline} byKey={byKey} currency={currency} />
        </SectionCard>
        <SectionCard
          title={config.attentionTitle}
          subtitle="Returned reports, drafts and settlements due"
          icon={Inbox}
          tone="amber"
          className={`${ANCHOR_CLASS} xl:col-span-2`}
          {...anchorProps(SECTION.needsYou)}
        >
          <ItemList items={attention} currency={currency} linkFor={(it) => it.to || config.link(it)} empty={config.attentionEmpty} />
        </SectionCard>
      </div>

      <EmployeeLedgers ledgers={config.ledgers} byKey={byKey} currency={currency} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <SectionCard title={data.trendTitle || "Your monthly spend"} subtitle={`By expense date, ${currency}`} icon={LineChart} tone="teal" className="xl:col-span-3">
          <SpendTrend points={data.trend || []} currency={currency} />
        </SectionCard>
        <SectionCard title="Reimbursement by category" subtitle={`Claimed amounts, ${currency}`} icon={PieChart} tone="pink" className="xl:col-span-2">
          <CategoryDonut
            slices={data.breakdown}
            currency={currency}
            claimed={byKey.erClaimed ? byKey.erClaimed.value : null}
            period="All time, all submitted reports"
          />
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
