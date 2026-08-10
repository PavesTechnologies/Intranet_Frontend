import { useState } from "react";
import { ChevronDown, CheckCircle2, AlertTriangle, History } from "lucide-react";

import GenericTable from "../../../../components/Table/table";
import Tooltip from "../../../../components/status/Tooltip";
import StatusBadge from "../../../../components/status/statusbadge";
import Modal from "../../../../components/ui/Modal";
import Button from "../../../../components/Button/Button";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { BILLING_BASIS_OPTIONS } from "../../data/toolCatalogOptions";
import { formatCurrency, formatDisplayDate, formatDisplayDateTime } from "../../utils/format";
import { getSelectableAssets } from "../../services/invoiceSoftwareSelectionService";
import { getBillingHistory } from "../../services/softwareBillingHistoryService";

const TABLE_HEADERS = [
  "Select",
  "Asset Code",
  "Asset Name",
  "Billing Basis",
  "Quantity",
  "Unit Price",
  "Currency",
  "Assignment Period",
  "Status",
  "Actions",
];
const TABLE_COLUMNS = [
  "select",
  "assetCode",
  "assetName",
  "billingBasis",
  "quantity",
  "unitPrice",
  "currency",
  "assignmentPeriod",
  "status",
  "actions",
];

const HISTORY_TABLE_HEADERS = ["Invoice Number", "Billing Period", "Quantity", "Amount", "Billed Date"];
const HISTORY_TABLE_COLUMNS = ["invoiceNumber", "billingPeriod", "quantity", "amount", "billedDate"];

const BILLING_BASIS_LABELS = BILLING_BASIS_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

// Duplicate-prevention gate (Epic 4 Phase 7). Pricing eligibility (selectionEligible from
// getSelectableAssets) is checked first and always wins — an asset with no Tool Pricing stays
// "No Pricing Configured" regardless of history. Only once pricing-eligible do we look at
// billing history: an exact match on the current invoice's billing period means it was already
// billed for *this* period ("same billing period" = identical start/end here), which blocks
// selection; any other history just informs Finance it was billed before.
function resolveBillingStatus(history, periodFrom, periodTo) {
  if (!history || history.length === 0) {
    return { key: "available", label: "Available" };
  }

  const sameBillingPeriod = history.find(
    (entry) => entry.billingPeriodStart === periodFrom && entry.billingPeriodEnd === periodTo
  );
  if (sameBillingPeriod) {
    return { key: "already_billed", label: "Already Billed", entry: sameBillingPeriod };
  }

  return { key: "previously_billed", label: "Previously Billed", entry: history[0] };
}

// Selecting rows here never triggers a calculation, total update, or persistence — it only
// tracks which line items Finance wants carried into invoice generation, consumed in a later
// phase. projectId is expected to be the project identifier the backend's
// /api/invoice/software-selection/projects/{projectId} endpoint recognizes (the Invoice Draft
// step currently has only billingContext.configId available for this — see InvoiceDraftStep.jsx).
// periodFrom/periodTo are the current invoice's billing period, used only to tell "already
// billed for this period" apart from "billed before, for an older period" — see
// resolveBillingStatus above.
export default function InvoiceSoftwareSelection({ projectId, periodFrom, periodTo, onSelectionChange }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [items, setItems] = useState([]);

  const [historyByAsset, setHistoryByAsset] = useState({});
  const [historyDialogAssetId, setHistoryDialogAssetId] = useState(null);

  const notifySelection = (nextItems) => {
    onSelectionChange?.(nextItems.filter((item) => item.selected));
  };

  const loadBillingHistory = async (loadedItems) => {
    try {
      const results = await Promise.all(
        loadedItems.map((item) =>
          getBillingHistory(item.assetId).catch(() => [])
        )
      );
      const nextHistory = {};
      loadedItems.forEach((item, index) => {
        nextHistory[item.assetId] = Array.isArray(results[index]) ? results[index] : [];
      });
      setHistoryByAsset(nextHistory);
    } catch {
      showStatusToast("Unable to load billing history for these assets.", "error");
    }
  };

  const handleToggleOpen = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (!nextOpen || loaded || loading) return;

    setLoading(true);
    try {
      const result = await getSelectableAssets(projectId);
      const withSelection = (Array.isArray(result) ? result : []).map((item) => ({
        ...item,
        selected: Boolean(item.selected),
      }));
      setItems(withSelection);
      setLoaded(true);
      notifySelection(withSelection);
      await loadBillingHistory(withSelection);
    } catch {
      showStatusToast("Unable to load software, tools, and licenses for this project.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (assetId) => {
    setItems((prev) => {
      const next = prev.map((item) => {
        if (item.assetId !== assetId || !item.selectionEligible) return item;
        const billingStatus = resolveBillingStatus(historyByAsset[assetId], periodFrom, periodTo);
        if (billingStatus.key === "already_billed") return item;
        return { ...item, selected: !item.selected };
      });
      notifySelection(next);
      return next;
    });
  };

  const historyDialogItem = items.find((item) => item.assetId === historyDialogAssetId) || null;
  const historyDialogRows = (historyByAsset[historyDialogAssetId] || []).map((entry) => ({
    invoiceNumber: entry.invoiceNumber,
    billingPeriod: `${formatDisplayDate(entry.billingPeriodStart)} – ${formatDisplayDate(entry.billingPeriodEnd)}`,
    quantity: entry.quantity,
    amount: formatCurrency(entry.amount, entry.currencyCode),
    billedDate: formatDisplayDateTime(entry.billedAt),
  }));

  const tableRows = items.map((item) => {
    const billingStatus = item.selectionEligible
      ? resolveBillingStatus(historyByAsset[item.assetId], periodFrom, periodTo)
      : null;
    const isDisabled = !item.selectionEligible || billingStatus?.key === "already_billed";

    return {
      select: (
        <input
          type="checkbox"
          checked={item.selected}
          disabled={isDisabled}
          onChange={() => handleToggleSelect(item.assetId)}
          className="h-4 w-4 disabled:cursor-not-allowed"
        />
      ),
      assetCode: <span className="font-semibold text-slate-900">{item.assetCode}</span>,
      assetName: item.assetName,
      billingBasis: BILLING_BASIS_LABELS[item.billingBasis] || item.billingBasis,
      quantity: item.quantity,
      unitPrice: formatCurrency(item.unitPrice, item.currencyCode),
      currency: item.currencyCode,
      assignmentPeriod: `${formatDisplayDate(item.assignmentStartDate)} – ${formatDisplayDate(item.assignmentEndDate)}`,
      status: !item.selectionEligible ? (
        <Tooltip content={item.selectionReason || "This asset is not eligible for invoice selection."}>
          <span className="inline-flex items-center gap-1 text-sm text-amber-600">
            <AlertTriangle className="h-4 w-4" /> No Pricing Configured
          </span>
        </Tooltip>
      ) : billingStatus.key === "already_billed" ? (
        <Tooltip content="Already billed for this billing period.">
          <StatusBadge label="Already Billed" size="sm" />
        </Tooltip>
      ) : billingStatus.key === "previously_billed" ? (
        <Tooltip
          content={`Invoice ${billingStatus.entry.invoiceNumber} — ${formatDisplayDate(
            billingStatus.entry.billingPeriodStart
          )} – ${formatDisplayDate(billingStatus.entry.billingPeriodEnd)}`}
        >
          <StatusBadge label="Previously Billed" size="sm" />
        </Tooltip>
      ) : (
        <StatusBadge label="Available" size="sm" />
      ),
      actions: (
        <Button
          variant="ghost"
          size="icon"
          title="View Billing History"
          onClick={() => setHistoryDialogAssetId(item.assetId)}
        >
          <History className="h-4 w-4 text-gray-600" />
        </Button>
      ),
    };
  });

  return (
    <div className="rounded-lg border border-slate-200">
      <button
        type="button"
        onClick={handleToggleOpen}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-slate-900">Software / Tools / Licenses</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-slate-100 p-4">
          {!loading && loaded && items.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500">
              No billable software available for this project.
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <GenericTable headers={TABLE_HEADERS} columns={TABLE_COLUMNS} rows={tableRows} loading={loading} />
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={Boolean(historyDialogAssetId)}
        onClose={() => setHistoryDialogAssetId(null)}
        title={historyDialogItem ? `Billing History — ${historyDialogItem.assetCode}` : "Billing History"}
        width="640px"
      >
        <div className="w-full overflow-x-auto">
          <GenericTable headers={HISTORY_TABLE_HEADERS} columns={HISTORY_TABLE_COLUMNS} rows={historyDialogRows} />
        </div>
      </Modal>
    </div>
  );
}
