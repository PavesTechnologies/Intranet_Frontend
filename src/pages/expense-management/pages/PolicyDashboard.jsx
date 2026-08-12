import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Users, AlertTriangle, Ban, History, Tag, Activity, AlertCircle } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import { PageCard, PageCardContent } from "@/components/Cards/PageCard";
import Button from "@/components/Button/Button";
import { policyBundleService, policyRuleService, policyAssignmentService, policyVersionService } from "@/pages/expense-management/api/policyApi";
import StatTile from "@/pages/expense-management/components/policy/common/StatTile";
import PolicyHealthGauge from "@/pages/expense-management/components/policy/PolicyDashboard/PolicyHealthGauge";
import RecentChangesFeed from "@/pages/expense-management/components/policy/PolicyDashboard/RecentChangesFeed";
import TopPoliciesCard from "@/pages/expense-management/components/policy/PolicyDashboard/TopPoliciesCard";
import { PolicyWorkspaceLayout, PolicyToolbar } from "@/pages/expense-management/components/policy/common/PolicyWorkspaceLayout";

const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export default function PolicyDashboard() {
  const navigate = useNavigate();

  const [bundles, setBundles] = useState([]);
  const [rules, setRules] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [versionFeed, setVersionFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);

      const [bundlesRes, rulesRes, assignmentsRes] = await Promise.all([
        policyBundleService.getAll(),
        policyRuleService.getAll(),
        policyAssignmentService.getAll(),
      ]);

      const bundleList = bundlesRes.data?.data || [];
      const ruleList = rulesRes.data?.data || [];
      const assignmentList = assignmentsRes.data?.data || [];

      setBundles(bundleList);
      setRules(ruleList);
      setAssignments(assignmentList);

      const versionResults = await Promise.allSettled(bundleList.map((b) => policyVersionService.getVersions(b.policyId)));
      const feed = versionResults.flatMap((result, idx) => {
        if (result.status !== "fulfilled") return [];
        const bundle = bundleList[idx];
        const versions = result.value.data?.data || [];
        return versions.map((v) => ({
          id: v.versionId,
          bundleName: bundle.policyName,
          versionNumber: v.versionNumber,
          activatedAt: v.activatedAt,
        }));
      });
      feed.sort((a, b) => new Date(b.activatedAt || 0) - new Date(a.activatedAt || 0));
      setVersionFeed(feed);
    } catch (err) {
      console.error("Failed to load policy dashboard:", err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const activePolicies = bundles.filter((b) => (b.status || "").toUpperCase() === "ACTIVE").length;
  const totalAssignments = assignments.length;
  const warningRules = rules.filter((r) => r.enforcementType === "WARN").length;
  const blockingRules = rules.filter((r) => r.enforcementType === "BLOCK").length;

  const assignedBundleIds = new Set(assignments.map((a) => a.policyId).filter(Boolean));
  const healthPct = bundles.length
    ? Math.round((bundles.filter((b) => assignedBundleIds.has(b.policyId)).length / bundles.length) * 100)
    : 0;
  const latestVersion = versionFeed[0];

  const versionActivityCount = versionFeed.filter((v) => {
    if (!v.activatedAt) return false;
    return Date.now() - new Date(v.activatedAt).getTime() <= THIRTY_DAYS_MS;
  }).length;

  const assignmentCountByPolicyId = new Map();
  assignments.forEach((a) => {
    if (!a.policyId) return;
    assignmentCountByPolicyId.set(a.policyId, (assignmentCountByPolicyId.get(a.policyId) || 0) + 1);
  });
  const topPolicies = bundles
    .map((b) => ({ policyId: b.policyId, policyName: b.policyName, assignmentCount: assignmentCountByPolicyId.get(b.policyId) || 0 }))
    .filter((p) => p.assignmentCount > 0)
    .sort((a, b) => b.assignmentCount - a.assignmentCount)
    .slice(0, 5);

  const breadcrumbs = [
    { label: "Expense Management", to: "/expense-management/dashboard" },
    { label: "Policy & Compliance" },
  ];

  return (
    <PolicyWorkspaceLayout>
      <Breadcrumb items={breadcrumbs} />

      <PolicyToolbar
        title="Policy & Compliance"
        subtitle="A real-time view of your expense policy configuration — bundles, assignments, and rule health."
        actions={
          <>
            <Button type="button" variant="outline" size="medium" onClick={() => navigate("/expense-management/policy-engine/versions")}>
              <History size={16} /> Version History
            </Button>
            <Button type="button" variant="primary" size="medium" onClick={() => navigate("/expense-management/policy-engine/bundles")}>
              <ShieldCheck size={16} /> Manage Bundles
            </Button>
          </>
        }
      />

      {loadError ? (
        <PageCard>
          <PageCardContent className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="mb-3 h-10 w-10 text-red-300" />
            <h2 className="text-sm font-semibold text-gray-700">Failed to load the policy dashboard</h2>
            <p className="mt-1 max-w-sm text-xs text-gray-400">Something went wrong while fetching policy data. Please try again.</p>
            <Button variant="outline" size="small" className="mt-4" onClick={fetchDashboard}>
              Retry
            </Button>
          </PageCardContent>
        </PageCard>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 2xl:grid-cols-4">
            <StatTile icon={<ShieldCheck size={22} />} label="Active Policies" value={activePolicies} accent="indigo" loading={loading} />
            <StatTile icon={<Users size={22} />} label="Assignments" value={totalAssignments} accent="blue" loading={loading} />
            <StatTile icon={<AlertTriangle size={22} />} label="Warning Rules" value={warningRules} accent="amber" loading={loading} />
            <StatTile icon={<Ban size={22} />} label="Blocking Rules" value={blockingRules} accent="red" loading={loading} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <PolicyHealthGauge
              percentage={healthPct}
              sublabel={`${assignedBundleIds.size} of ${bundles.length} bundle${bundles.length === 1 ? "" : "s"} assigned`}
              loading={loading}
            />

            <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="shrink-0 rounded-lg bg-indigo-50 p-3 text-indigo-600">
                <Tag size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Latest Version</p>
                {loading ? (
                  <div className="mt-2 h-6 w-40 animate-pulse rounded bg-gray-100" />
                ) : latestVersion ? (
                  <>
                    <p className="mt-1 truncate text-lg font-bold text-gray-900">
                      {latestVersion.bundleName} <span className="text-gray-400">· v{latestVersion.versionNumber}</span>
                    </p>
                    <p className="text-xs text-gray-400">{formatDateTime(latestVersion.activatedAt)}</p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-gray-400">No activated versions yet.</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="shrink-0 rounded-lg bg-emerald-50 p-3 text-emerald-600">
                <Activity size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Version Activity</p>
                {loading ? (
                  <div className="mt-2 h-6 w-16 animate-pulse rounded bg-gray-100" />
                ) : (
                  <p className="mt-1 text-2xl font-bold text-gray-900">{versionActivityCount}</p>
                )}
                <p className="mt-0.5 text-xs text-gray-400">activated in the last 30 days</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800">Recent Changes</h2>
                <Link to="/expense-management/policy-engine/versions" className="text-xs font-medium text-[#0A0082] hover:underline">
                  View all
                </Link>
              </div>
              <RecentChangesFeed items={versionFeed.slice(0, 6)} loading={loading} />
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800">Top Used Policies</h2>
                <Link to="/expense-management/policy-engine/assignments" className="text-xs font-medium text-[#0A0082] hover:underline">
                  View assignments
                </Link>
              </div>
              <TopPoliciesCard items={topPolicies} loading={loading} />
            </div>
          </div>
        </>
      )}
    </PolicyWorkspaceLayout>
  );
}
