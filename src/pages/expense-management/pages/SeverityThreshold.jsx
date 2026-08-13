import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Ban, ShieldCheck, Save } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Button from "@/components/Button/Button";
import FormSelect from "@/components/forms/FormSelect";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { showStatusToast } from "@/components/toastfy/toast";
import { policyBundleService, severityThresholdService } from "@/pages/expense-management/api/policyApi";
import { POLICY_MANAGE_ROLES } from "@/pages/expense-management/components/policy/common/policyEnums";
import SeverityThresholdSlider from "@/pages/expense-management/components/policy/Severity/SeverityThresholdSlider";
import { PolicyWorkspaceLayout, PolicyToolbar } from "@/pages/expense-management/components/policy/common/PolicyWorkspaceLayout";

const SLIDER_MIN = 0;
const SLIDER_MAX = 150;
const DEFAULT_BOUNDS = [30, 60]; // matches the engine's built-in fallback (0/30/60%)

const bandsToBounds = (bands) => {
  const minor = bands.find((b) => b.tier === "MINOR");
  const moderate = bands.find((b) => b.tier === "MODERATE");
  if (!minor || !moderate) return DEFAULT_BOUNDS;
  return [minor.maxPercentOver ?? DEFAULT_BOUNDS[0], moderate.maxPercentOver ?? DEFAULT_BOUNDS[1]];
};

const boundsToBands = ([minorMax, moderateMax]) => [
  { tier: "MINOR", minPercentOver: 0, maxPercentOver: minorMax },
  { tier: "MODERATE", minPercentOver: minorMax, maxPercentOver: moderateMax },
  { tier: "SEVERE", minPercentOver: moderateMax, maxPercentOver: null },
];

export default function SeverityThreshold() {
  const { hasRole } = useAuth();
  const canManage = hasRole(POLICY_MANAGE_ROLES);

  const [bundles, setBundles] = useState([]);
  const [policyId, setPolicyId] = useState("");
  const [bounds, setBounds] = useState(DEFAULT_BOUNDS);
  const [sampleLimit, setSampleLimit] = useState(10000);
  const [loading, setLoading] = useState(true);
  const [loadingBands, setLoadingBands] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadBundles = async () => {
      try {
        setLoading(true);
        const res = await policyBundleService.getAll();
        setBundles(res.data?.data || []);
      } catch (err) {
        console.error("Failed to load policy bundles:", err);
      } finally {
        setLoading(false);
      }
    };
    loadBundles();
  }, []);

  const loadBands = useCallback(async (scopedPolicyId) => {
    try {
      setLoadingBands(true);
      const res = await severityThresholdService.get(scopedPolicyId || undefined);
      const bands = res.data?.data || [];
      setBounds(bands.length > 0 ? bandsToBounds(bands) : DEFAULT_BOUNDS);
    } catch (err) {
      console.error("Failed to load severity thresholds:", err);
      setBounds(DEFAULT_BOUNDS);
    } finally {
      setLoadingBands(false);
    }
  }, []);

  useEffect(() => {
    loadBands(policyId);
  }, [policyId, loadBands]);

  const [minorMax, moderateMax] = bounds;
  const bandsValid = minorMax > SLIDER_MIN && moderateMax > minorMax;

  const handleSave = async () => {
    if (!bandsValid) return;
    try {
      setSaving(true);
      await severityThresholdService.update(boundsToBands(bounds), policyId || undefined);
      showStatusToast("Severity thresholds updated successfully!", "success");
    } catch (err) {
      console.error("Error saving severity thresholds:", err);
      const errMsg = err.response?.data?.message || "Failed to save severity thresholds.";
      showStatusToast(errMsg, "error");
    } finally {
      setSaving(false);
    }
  };

  const clampPct = (p) => Math.max(SLIDER_MIN, Math.min(SLIDER_MAX, p));
  const zoneWidth = (from, to) => `${(Math.max(0, clampPct(to) - clampPct(from)) / (SLIDER_MAX - SLIDER_MIN)) * 100}%`;

  const bundleOptions = useMemo(() => [{ label: "Global Default", value: "" }, ...bundles.map((b) => ({ label: b.policyName, value: b.policyId }))], [bundles]);

  const breadcrumbs = [
    { label: "Expense Management", to: "/expense-management/dashboard" },
    { label: "Policy & Compliance", to: "/expense-management/policy-engine/dashboard" },
    { label: "Severity Thresholds" },
  ];

  return (
    <PolicyWorkspaceLayout>
      <Breadcrumb items={breadcrumbs} />

      <PolicyToolbar
        title="Severity Thresholds"
        subtitle="Set how far over a rule's limit an expense must be before it's tagged Minor, Moderate, or Severe overage."
        actions={
          canManage && (
            <Button
              type="button"
              variant="primary"
              size="medium"
              loading={saving}
              loadingText="Saving..."
              disabled={loading || loadingBands || !bandsValid}
              onClick={handleSave}
              className="w-full sm:w-auto"
            >
              <Save size={16} /> Save Thresholds
            </Button>
          )
        }
      />

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="max-w-xs">
          <FormSelect label="Scope" name="policyId" value={policyId} onChange={(e) => setPolicyId(e.target.value)} options={bundleOptions} />
        </div>
        <p className="mt-2 text-xs text-gray-400">
          {policyId ? "These bands apply only to this policy bundle." : "These bands apply to any policy without its own configured thresholds."}
        </p>
      </div>

      {loading ? (
        <div className="py-16">
          <LoadingSpinner text="Loading bundles..." />
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            {loadingBands ? (
              <div className="py-8">
                <LoadingSpinner text="Loading thresholds..." />
              </div>
            ) : (
              <>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-1.5 font-medium text-green-700">
                    <ShieldCheck size={15} /> Minor: 0–{minorMax}%
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-amber-700">
                    <AlertTriangle size={15} /> Moderate: {minorMax}–{moderateMax}%
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-red-700">
                    <Ban size={15} /> Severe: {moderateMax}%+
                  </span>
                </div>

                <SeverityThresholdSlider value={bounds} onChange={setBounds} min={SLIDER_MIN} max={SLIDER_MAX} />

                <div className="mt-6 flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className="bg-green-400 transition-all" style={{ width: zoneWidth(SLIDER_MIN, minorMax) }} />
                  <div className="bg-amber-400 transition-all" style={{ width: zoneWidth(minorMax, moderateMax) }} />
                  <div className="bg-red-400 transition-all" style={{ width: zoneWidth(moderateMax, SLIDER_MAX) }} />
                </div>

                {!bandsValid && <p className="mt-3 text-xs font-medium text-red-600">Each band's upper bound must be greater than its lower bound.</p>}
              </>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-800">Live Preview</h2>
            <div className="mb-4 flex items-center gap-3">
              <label className="text-sm text-gray-600">Sample rule limit</label>
              <input
                type="number"
                min="0"
                value={sampleLimit}
                onChange={(e) => setSampleLimit(Number(e.target.value) || 0)}
                className="w-32 rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none transition focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20"
              />
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-green-700">
                <ShieldCheck size={15} /> Up to {((sampleLimit * (100 + minorMax)) / 100).toFixed(2)} — minor overage.
              </li>
              <li className="flex items-center gap-2 text-amber-700">
                <AlertTriangle size={15} /> Up to {((sampleLimit * (100 + moderateMax)) / 100).toFixed(2)} — moderate overage.
              </li>
              <li className="flex items-center gap-2 text-red-700">
                <Ban size={15} /> Above that — severe overage.
              </li>
            </ul>
          </div>
        </>
      )}
    </PolicyWorkspaceLayout>
  );
}
