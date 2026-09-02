import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import FormSelect from "../../../../components/forms/FormSelect";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import StatusBadge from "../../../../components/status/statusbadge";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { AP_ROUTES } from "../../constants/routes";
import { useApPermissions } from "../../hooks/useApPermissions";
import { usePrStatuses, useQuotationStatuses } from "../../hooks/useApLookups";
import { useAllPurchaseRequisitions } from "../hooks/usePurchaseRequisitions";
import { useQuotationsForPr } from "../hooks/useQuotations";
import { useSelectVendor, useGeneratePurchaseOrder } from "../hooks/usePurchaseRequisitionMutations";
import useVendorOptions from "../hooks/useVendorOptions";
import { VENDOR_SELECTION_ELIGIBLE_PR_STATUS } from "../constants/procurementStatus";

export default function VendorSelectionTab() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { canSelectVendor, canGeneratePO } = useApPermissions();

  const [selectedPrId, setSelectedPrId] = useState(searchParams.get("prId") || "");
  const [confirmTarget, setConfirmTarget] = useState(null); // quotation being selected

  const { data: allPrs = [] } = useAllPurchaseRequisitions();
  const { data: prStatuses = [] } = usePrStatuses();
  const { data: quotationStatuses = [] } = useQuotationStatuses();
  const { vendorNameById } = useVendorOptions();

  const prStatusCodeById = new Map(prStatuses.map((s) => [s.status_id, s.status_code]));
  const quotationStatusCodeById = new Map(quotationStatuses.map((s) => [s.status_id, s.status_code]));
  const quotationStatusNameById = new Map(quotationStatuses.map((s) => [s.status_id, s.status_name]));

  const eligiblePrs = useMemo(
    () => allPrs.filter((pr) => prStatusCodeById.get(pr.status_id) === VENDOR_SELECTION_ELIGIBLE_PR_STATUS),
    [allPrs, prStatusCodeById],
  );

  const selectedPr = allPrs.find((pr) => String(pr.id) === String(selectedPrId));

  const { data: quotations = [], isLoading, isError, error } = useQuotationsForPr(selectedPrId || undefined);

  const selectVendor = useSelectVendor(selectedPrId);
  const generatePo = useGeneratePurchaseOrder(selectedPrId);

  const prOptions = [
    { value: "", label: "Select a purchase requisition" },
    ...eligiblePrs.map((pr) => ({ value: String(pr.id), label: pr.pr_number })),
  ];

  const isEligible = selectedPr && prStatusCodeById.get(selectedPr.status_id) === VENDOR_SELECTION_ELIGIBLE_PR_STATUS;
  const hasSelection = selectedPr?.selected_vendor_id != null && selectedPr?.selected_quotation_id != null;

  const handleSelectConfirm = async () => {
    if (!confirmTarget) return;
    try {
      await selectVendor.mutateAsync(confirmTarget.id);
      toast.success("Vendor selected for this requisition.");
      setConfirmTarget(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not select this vendor."));
    }
  };

  const handleGeneratePo = async () => {
    try {
      const result = await generatePo.mutateAsync();
      toast.success("Purchase order generated.");
      navigate(AP_ROUTES.PROCUREMENT_PO_DETAIL(result.po_id));
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not generate the purchase order."));
    }
  };

  const headers = ["Vendor", "Quotation No.", "Amount", "Valid Until", "Status", "Action"];
  const columns = ["vendor", "quotationNumber", "amount", "validUntil", "status", "action"];

  const rows = quotations.map((q) => {
    const statusCode = quotationStatusCodeById.get(q.status_id);
    const isThisSelected = selectedPr?.selected_quotation_id === q.id;
    return {
      vendor: vendorNameById.get(q.vendor_id) || `Vendor #${q.vendor_id}`,
      quotationNumber: q.quotation_number || "—",
      amount: q.total_amount != null ? formatCurrency(Number(q.total_amount)) : "—",
      validUntil: formatDate(q.valid_until),
      status: <StatusBadge label={quotationStatusNameById.get(q.status_id) || "Unknown"} size="sm" />,
      action:
        isThisSelected ? (
          <span className="text-xs font-semibold text-emerald-700">Selected</span>
        ) : canSelectVendor && isEligible && statusCode === "RECEIVED" && !hasSelection ? (
          <Button variant="outline" size="small" onClick={() => setConfirmTarget(q)}>
            Select
          </Button>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    };
  });

  return (
    <div className="space-y-4">
      <div className="w-full sm:w-80">
        <FormSelect
          label="Purchase Requisition"
          name="prId"
          value={selectedPrId}
          onChange={(e) => setSelectedPrId(e.target.value)}
          options={prOptions}
        />
      </div>

      {!selectedPrId ? (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          Select a requisition in Vendor Selection status to compare its quotations.
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {getApiErrorMessage(error, "Failed to load quotations.")}
        </div>
      ) : isLoading ? (
        <LoadingSpinner text="Loading quotations..." />
      ) : quotations.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          No quotations to compare for this requisition yet.
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-lg">
          <GenericTable headers={headers} rows={rows} columns={columns} />
        </div>
      )}

      {hasSelection && canGeneratePO && (
        <div className="flex justify-end">
          <Button variant="primary" onClick={handleGeneratePo} loading={generatePo.isPending} loadingText="Generating...">
            Generate Purchase Order
          </Button>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!confirmTarget}
        title="Select Vendor"
        message={`Select "${confirmTarget ? vendorNameById.get(confirmTarget.vendor_id) : ""}" as the vendor for ${
          selectedPr?.pr_number || "this requisition"
        }? Other received quotations will be marked rejected.`}
        confirmText="Select Vendor"
        cancelText="Cancel"
        isLoading={selectVendor.isPending}
        onConfirm={handleSelectConfirm}
        onCancel={() => setConfirmTarget(null)}
        variant="primary"
      />
    </div>
  );
}
