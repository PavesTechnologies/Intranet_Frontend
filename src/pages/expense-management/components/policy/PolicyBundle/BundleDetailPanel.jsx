import React, { useState } from "react";
import { Pencil, Trash2, Plus, ShieldQuestion, Layers, Star, ListChecks, Users, GitMerge } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Button from "@/components/Button/Button";
import StatusBadge from "@/components/status/statusbadge";
import PolicyEmptyState from "@/pages/expense-management/components/policy/common/PolicyEmptyState";
import Timeline from "@/pages/expense-management/components/policy/VersionTimeline/Timeline";
import RuleCard from "@/pages/expense-management/components/policy/PolicyRule/RuleCard";
import RuleSummaryCard from "@/pages/expense-management/components/policy/PolicyRule/RuleSummaryCard";

const StatBox = ({ label, value, accent = "text-gray-800" }) => (
  <div className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2.5">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
    <p className={`mt-0.5 text-lg font-bold ${accent}`}>{value}</p>
  </div>
);

export default function BundleDetailPanel({
  bundle,
  rules,
  rulesLoading,
  onAddRule,
  onEditRule,
  onDeleteRule,
  assignments,
  assignmentsLoading,
  groups,
  versions,
  versionsLoading,
  onEditBundle,
  onDeleteBundle,
  onSetDefault,
  isDefaultBundle,
  canManage,
  canManageRules,
}) {
  const [tab, setTab] = useState("rules");

  if (!bundle) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/60">
        <PolicyEmptyState
          icon={<Layers className="h-8 w-8" />}
          title="Select a policy bundle"
          description="Choose a bundle from the list to view its rules, assignments, and version history."
        />
      </div>
    );
  }

  const warnCount = (rules || []).filter((r) => r.enforcementType === "WARN").length;
  const blockCount = (rules || []).filter((r) => r.enforcementType === "BLOCK").length;
  const memberReach = (assignments || []).reduce((sum, a) => {
    if (a.assignmentType === "GROUP") {
      const g = (groups || []).find((gr) => gr.groupId === a.groupId);
      return sum + (g?.memberCount || 0);
    }
    if (a.assignmentType === "INDIVIDUAL") return sum + 1;
    return sum;
  }, 0);

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-bold text-[#0a174e]">{bundle.policyName}</h2>
              <StatusBadge label={bundle.status || "DRAFT"} size="sm" />
              {isDefaultBundle && (
                <span className="flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                  <Star size={11} /> Org Default
                </span>
              )}
              <span className="text-xs text-gray-400">v{bundle.currentVersion ?? 1}</span>
            </div>
            {bundle.description && <p className="mt-1 text-sm text-gray-500">{bundle.description}</p>}
          </div>

          {canManage && (
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button type="button" variant="outline" size="small" onClick={() => onEditBundle(bundle)}>
                <Pencil size={14} /> Edit
              </Button>
              {!isDefaultBundle && (
                <Button type="button" variant="outline" size="small" onClick={() => onSetDefault(bundle)}>
                  <Star size={14} /> Set as Org Default
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="small"
                className="text-red-600 hover:bg-red-50"
                onClick={() => onDeleteBundle(bundle)}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <StatBox label="Rules" value={(rules || []).length} />
          <StatBox label="Warn / Block" value={`${warnCount} / ${blockCount}`} accent="text-amber-600" />
          <StatBox label="Assignments" value={(assignments || []).length} accent="text-blue-600" />
          <StatBox label="Member Reach" value={memberReach} accent="text-emerald-600" />
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-5 overflow-y-auto p-5 lg:grid-cols-[220px_1fr]">
        <div className="space-y-4">
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
              <ListChecks size={13} /> Rule Summary
            </h3>
            <RuleSummaryCard rules={rules || []} />
          </div>
        </div>

        <div>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="rules">Rules{rules ? ` (${rules.length})` : ""}</TabsTrigger>
              <TabsTrigger value="assignments">Assignments{assignments ? ` (${assignments.length})` : ""}</TabsTrigger>
              <TabsTrigger value="versions">Versions</TabsTrigger>
            </TabsList>

            <TabsContent value="rules">
              {canManageRules && (
                <div className="mb-3 flex justify-end">
                  <Button type="button" variant="primary" size="small" onClick={() => onAddRule(bundle)}>
                    <Plus size={14} /> Add Rule
                  </Button>
                </div>
              )}
              {rulesLoading ? (
                <div className="space-y-2">
                  {[0, 1].map((i) => (
                    <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-100" />
                  ))}
                </div>
              ) : !rules || rules.length === 0 ? (
                <PolicyEmptyState
                  icon={<ShieldQuestion className="h-8 w-8" />}
                  title="No rules yet"
                  description="Add a rule to start enforcing limits for this bundle."
                />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {rules.map((r) => (
                    <RuleCard key={r.policyId} rule={r} onEdit={onEditRule} onDelete={onDeleteRule} canManage={canManageRules} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="assignments">
              {assignmentsLoading ? (
                <div className="space-y-2">
                  {[0, 1].map((i) => (
                    <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />
                  ))}
                </div>
              ) : !assignments || assignments.length === 0 ? (
                <PolicyEmptyState
                  icon={<GitMerge className="h-8 w-8" />}
                  title="Not assigned yet"
                  description="Use Policy Assignments to map this bundle to a group or employee."
                />
              ) : (
                <ul className="divide-y divide-gray-100">
                  {assignments.map((a) => (
                    <li key={a.assignmentId} className="flex items-center justify-between py-2.5">
                      <span className="flex items-center gap-2 text-sm font-medium text-gray-800">
                        <Users size={14} className="text-gray-400" />
                        {a.assignmentType === "DEFAULT" ? "Everyone (org default)" : a.groupName || a.employeeId}
                      </span>
                      <StatusBadge label={a.status || "ACTIVE"} size="sm" />
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="versions">
              <Timeline versions={versions} loading={versionsLoading} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
