import React from "react";
import { History } from "lucide-react";
import PolicyEmptyState from "@/pages/expense-management/components/policy/common/PolicyEmptyState";
import Timeline from "@/pages/expense-management/components/policy/VersionTimeline/Timeline";

const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
};

const StatBox = ({ label, value }) => (
  <div className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2.5">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
    <p className="mt-0.5 truncate text-lg font-bold text-gray-800">{value}</p>
  </div>
);

/**
 * "Version Inspector" — the selected version's details plus its bundle's
 * full timeline for context, with the selected entry highlighted. Only
 * renders fields the API actually returns (versionNumber, activatedAt) —
 * no fabricated changed-by / diff data.
 */
export default function VersionInspectorPanel({ version, bundleTimeline, timelineLoading }) {
  if (!version) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/60">
        <PolicyEmptyState icon={<History className="h-8 w-8" />} title="Select a version" description="Choose a version from the list to inspect it within its bundle's timeline." />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 p-5">
        <h2 className="text-lg font-bold text-[#0a174e]">{version.bundleName}</h2>
        <p className="mt-1 text-sm text-gray-500">Version Inspector</p>
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <StatBox label="Version" value={`v${version.versionNumber}`} />
          <StatBox label="Activated" value={formatDateTime(version.activatedAt)} />
          <StatBox label="Bundle" value={version.bundleName} />
        </div>
      </div>

      <div className="p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Timeline</h3>
        <Timeline versions={bundleTimeline} loading={timelineLoading} highlightId={version.versionId} />
      </div>
    </div>
  );
}
