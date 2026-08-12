import React, { useCallback, useEffect, useMemo, useState } from "react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import { showStatusToast } from "@/components/toastfy/toast";
import { policyBundleService, policyVersionService } from "@/pages/expense-management/api/policyApi";
import { PolicyWorkspaceLayout, PolicyToolbar, PolicyWorkspaceGrid } from "@/pages/expense-management/components/policy/common/PolicyWorkspaceLayout";
import VersionNavList from "@/pages/expense-management/components/policy/VersionTimeline/VersionNavList";
import VersionInspectorPanel from "@/pages/expense-management/components/policy/VersionTimeline/VersionInspectorPanel";

export default function PolicyVersions() {
  const [bundles, setBundles] = useState([]);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [bundleFilter, setBundleFilter] = useState("");
  const [selectedVersion, setSelectedVersion] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const bundlesRes = await policyBundleService.getAll();
      const bundleList = bundlesRes.data?.data || [];
      setBundles(bundleList);

      const results = await Promise.allSettled(bundleList.map((b) => policyVersionService.getVersions(b.policyId)));
      const merged = results.flatMap((result, idx) => {
        if (result.status !== "fulfilled") return [];
        const bundle = bundleList[idx];
        const rawVersions = result.value.data?.data || [];
        return rawVersions.map((v) => ({
          versionId: v.versionId,
          bundleId: bundle.policyId,
          bundleName: bundle.policyName,
          versionNumber: v.versionNumber,
          activatedAt: v.activatedAt,
        }));
      });
      merged.sort((a, b) => new Date(b.activatedAt || 0) - new Date(a.activatedAt || 0));
      setVersions(merged);
    } catch (err) {
      console.error("Failed to load policy version history:", err);
      const errMsg = err.response?.data?.message || "Failed to load policy version history.";
      showStatusToast(errMsg, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const bundleOptions = useMemo(() => bundles.map((b) => ({ value: b.policyId, label: b.policyName })), [bundles]);

  const filteredVersions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return versions.filter((v) => {
      const matchesSearch = !q || v.bundleName.toLowerCase().includes(q);
      const matchesBundle = !bundleFilter || v.bundleId === bundleFilter;
      return matchesSearch && matchesBundle;
    });
  }, [versions, searchTerm, bundleFilter]);

  const bundleTimeline = useMemo(
    () => (selectedVersion ? versions.filter((v) => v.bundleId === selectedVersion.bundleId) : []),
    [versions, selectedVersion]
  );

  const breadcrumbs = [
    { label: "Expense Management", to: "/expense-management/dashboard" },
    { label: "Policy & Compliance", to: "/expense-management/policy-engine/dashboard" },
    { label: "Version History" },
  ];

  return (
    <PolicyWorkspaceLayout>
      <Breadcrumb items={breadcrumbs} />

      <PolicyToolbar title="Version History" subtitle="Every activated version across all policy bundles, most recent first." />

      <PolicyWorkspaceGrid
        left={
          <VersionNavList
            versions={filteredVersions}
            selectedId={selectedVersion?.versionId || null}
            onSelect={setSelectedVersion}
            loading={loading}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            bundleFilter={bundleFilter}
            onBundleFilterChange={setBundleFilter}
            bundleOptions={bundleOptions}
          />
        }
        right={<VersionInspectorPanel version={selectedVersion} bundleTimeline={bundleTimeline} timelineLoading={loading} />}
      />
    </PolicyWorkspaceLayout>
  );
}
