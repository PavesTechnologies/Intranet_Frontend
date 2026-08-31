import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Pencil, Ban, ShieldAlert } from "lucide-react";

import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/Button/Button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../../components/ui/tooltip";
import StatusBadge from "../../../../components/status/statusbadge";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { showStatusToast } from "../../../../components/toastfy/toast";
import ARTable from "../../components/common/ARTable";
import ActionMenu from "../../components/common/ActionMenu";
import MasterStatCards from "../../components/common/MasterStatCards";
import BackIconButton from "../../components/common/BackIconButton";
import TaxRegionFormModal from "../../components/master-data/TaxRegionFormModal";
import TaxRuleFormModal from "../../components/master-data/TaxRuleFormModal";
import { deriveTaxComponentRows } from "../../utils/taxRuleComponents";
import { getTaxRegionById, getApiErrorMessage as getRegionErrorMessage } from "../../services/taxRegionService";
import {
  getTaxRateConfigurationsByTaxRegion,
  deactivateTaxRateConfiguration,
  getApiErrorMessage as getRuleErrorMessage,
} from "../../services/taxRateConfigurationService";

const formatDateValue = (val) => {
  if (!val) return "—";
  try {
    const date = new Date(val);
    if (isNaN(date.getTime())) return val;
    const day = String(date.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day}-${months[date.getMonth()]}-${date.getFullYear()}`;
  } catch {
    return val;
  }
};

const formatRateDisplay = (rate) => {
  if (rate === null || rate === undefined || rate === "" || isNaN(Number(rate))) {
    return <span className="text-slate-400">—</span>;
  }
  return <span className="font-medium text-slate-700">{rate}%</span>;
};

const TABS = [
  { key: "details", label: "Region Details" },
  { key: "rules", label: "Tax Rules" },
];

export default function TaxConfigurationRegionDetailPage() {
  const { taxRegionId } = useParams();
  const navigate = useNavigate();

  const [region, setRegion] = useState(null);
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [activeTab, setActiveTab] = useState("details");

  const [isRegionFormOpen, setIsRegionFormOpen] = useState(false);
  const [isRuleFormOpen, setIsRuleFormOpen] = useState(false);
  const [editingRuleConfig, setEditingRuleConfig] = useState(null);

  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setPermissionError(false);
    setNotFound(false);
    try {
      const [regionData, configsData] = await Promise.all([
        getTaxRegionById(taxRegionId),
        getTaxRateConfigurationsByTaxRegion(taxRegionId),
      ]);
      if (!regionData || !regionData.taxRegionId) {
        setNotFound(true);
      } else {
        setRegion(regionData);
      }
      setConfigs(configsData);
    } catch (error) {
      if (error?.response?.status === 403) {
        setPermissionError(true);
      } else if (error?.response?.status === 404) {
        setNotFound(true);
      } else {
        showStatusToast(getRegionErrorMessage(error, "Failed to load tax region."), "error");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taxRegionId]);

  const ruleRows = useMemo(() => deriveTaxComponentRows(configs), [configs]);

  const ruleStats = useMemo(() => {
    const totalRules = ruleRows.length;
    const activeRules = ruleRows.filter((row) => row.source.active).length;
    return { totalRules, activeRules, inactiveRules: totalRules - activeRules };
  }, [ruleRows]);

  const handleOpenCreateRule = () => {
    setEditingRuleConfig(null);
    setIsRuleFormOpen(true);
  };

  const handleOpenEditRule = (config) => {
    setEditingRuleConfig(config);
    setIsRuleFormOpen(true);
  };

  const handleRuleSaved = () => {
    loadData();
  };

  const handleRegionSaved = (saved) => {
    setRegion(saved);
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      await deactivateTaxRateConfiguration(deactivateTarget.id);
      showStatusToast("Tax rule deactivated successfully.", "success");
      setDeactivateTarget(null);
      await loadData();
    } catch (error) {
      showStatusToast(getRuleErrorMessage(error, "Failed to deactivate tax rule."), "error");
    } finally {
      setDeactivating(false);
    }
  };

  const ruleTableHeaders = ["Tax Component", "CGST Rate", "SGST Rate", "IGST Rate", "Effective From", "Effective To", "Status", "Actions"];
  const ruleTableColumns = ["component", "cgst", "sgst", "igst", "from", "to", "status", "actions"];

  const ruleTableRows = useMemo(() => {
    return ruleRows.map((row, idx) => ({
      component: <span className="font-semibold text-slate-800">{row.component}</span>,
      cgst: formatRateDisplay(row.cgstRate),
      sgst: formatRateDisplay(row.sgstRate),
      igst: formatRateDisplay(row.igstRate),
      from: <span className="text-slate-600">{formatDateValue(row.source.effectiveFrom)}</span>,
      to: <span className="text-slate-600">{formatDateValue(row.source.effectiveTo)}</span>,
      status: <StatusBadge label={row.source.status} size="sm" />,
      actions: (
        <div className="flex items-center justify-center">
          <ActionMenu
            items={[
              {
                label: "Edit",
                icon: <Pencil className="h-4 w-4 text-slate-600" />,
                onClick: () => handleOpenEditRule(row.source),
              },
              {
                label: "Deactivate",
                icon: <Ban className="h-4 w-4 text-rose-600" />,
                danger: true,
                hidden: row.source.status !== "ACTIVE",
                onClick: () => setDeactivateTarget(row.source),
              },
            ]}
          />
        </div>
      ),
      key: `${row.source.id}-${row.component}-${idx}`,
    }));
  }, [ruleRows]);

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <BackIconButton
          onClick={() => navigate("/account-receivable/master-data/tax-configuration")}
          label="Back to Tax Configuration"
        />
        <LoadingSpinner text="Loading tax region..." />
      </div>
    );
  }

  if (permissionError) {
    return (
      <div className="w-full space-y-6">
        <BackIconButton
          onClick={() => navigate("/account-receivable/master-data/tax-configuration")}
          label="Back to Tax Configuration"
        />
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          You do not have permission to manage tax configuration.
        </div>
      </div>
    );
  }

  if (notFound || !region) {
    return (
      <div className="w-full space-y-6">
        <BackIconButton
          onClick={() => navigate("/account-receivable/master-data/tax-configuration")}
          label="Back to Tax Configuration"
        />
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          Tax region not found.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-3">
        <BackIconButton
          onClick={() => navigate("/account-receivable/master-data/tax-configuration")}
          label="Back to Tax Configuration"
        />
        <div className="flex-1">
          <PageHeader
            title={
              <span className="flex items-center gap-2">
                {region.taxRegionName} ({region.taxRegionCode})
                <span className="text-slate-300">—</span>
                <StatusBadge label={region.status} size="md" />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsRegionFormOpen(true)}
                        aria-label="Edit Region"
                        className="rounded-full border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-[#0A0082]/10 hover:text-[#0A0082]"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Edit Region</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </span>
            }
            subtitle={`Code: ${region.taxRegionCode} • ${region.taxRegime} • 1 Country • 1 Currency (${region.currencyCode})`}
            actions={
              <Button onClick={handleOpenCreateRule} className="flex items-center gap-1.5">
                <Plus className="h-4 w-4" />
                Add Tax Rule
              </Button>
            }
          />
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === tab.key
                ? "border-[#0A0082] text-[#0A0082]"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "details" && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="divide-y divide-slate-100 text-sm">
            <div className="grid grid-cols-3 gap-2 px-5 py-3">
              <span className="font-semibold text-slate-500">Tax Region Code</span>
              <span className="col-span-2 font-medium text-slate-800">{region.taxRegionCode}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 px-5 py-3">
              <span className="font-semibold text-slate-500">Tax Region Name</span>
              <span className="col-span-2 font-medium text-slate-800">{region.taxRegionName}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 px-5 py-3">
              <span className="font-semibold text-slate-500">Tax Regime</span>
              <span className="col-span-2 font-medium text-slate-800">{region.taxRegime}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 px-5 py-3">
              <span className="font-semibold text-slate-500">Currency Code</span>
              <span className="col-span-2 font-medium text-slate-800">{region.currencyCode}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 px-5 py-3">
              <span className="font-semibold text-slate-500">Description</span>
              <span className="col-span-2 font-medium text-slate-800 break-words">
                {region.description || <span className="text-slate-400">—</span>}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 px-5 py-3">
              <span className="font-semibold text-slate-500">Status</span>
              <span className="col-span-2">
                <StatusBadge label={region.status} size="sm" />
              </span>
            </div>
          </div>
        </div>
      )}

      {activeTab === "rules" && (
        <div className="space-y-6">
          <MasterStatCards
            items={[
              { label: "Total Rules", value: ruleStats.totalRules },
              { label: "Active Rules", value: ruleStats.activeRules, tone: "success" },
              { label: "Inactive Rules", value: ruleStats.inactiveRules, tone: "danger" },
              { label: "Currency", value: region.currencyCode },
              { label: "Tax Regime", value: region.taxRegime },
            ]}
          />

          <ARTable
            headers={ruleTableHeaders}
            columns={ruleTableColumns}
            rows={ruleTableRows}
            loading={false}
            emptyMessage="No tax rules configured for this region yet."
          />
        </div>
      )}

      <TaxRegionFormModal
        isOpen={isRegionFormOpen}
        onClose={() => setIsRegionFormOpen(false)}
        editingItem={region}
        onSaved={handleRegionSaved}
      />

      <TaxRuleFormModal
        isOpen={isRuleFormOpen}
        onClose={() => setIsRuleFormOpen(false)}
        region={region}
        editingConfig={editingRuleConfig}
        onSaved={handleRuleSaved}
      />

      <ConfirmationModal
        isOpen={Boolean(deactivateTarget)}
        onCancel={() => setDeactivateTarget(null)}
        onConfirm={handleConfirmDeactivate}
        title="Deactivate Tax Rule"
        message="Are you sure you want to deactivate this tax rule? Inactive rules will not be applied to new transactions."
        confirmText="Deactivate"
        variant="danger"
        isLoading={deactivating}
      />
    </div>
  );
}
