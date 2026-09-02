import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Plus, Eye, Download, Trash2 } from "lucide-react";
import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import FormSelect from "../../../../components/forms/FormSelect";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import StatusBadge from "../../../../components/status/statusbadge";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { useApPermissions } from "../../hooks/useApPermissions";
import { usePrStatuses, useQuotationStatuses } from "../../hooks/useApLookups";
import { useAllPurchaseRequisitions } from "../hooks/usePurchaseRequisitions";
import { useQuotationsForPr } from "../hooks/useQuotations";
import { useDeleteQuotation } from "../hooks/useQuotationMutations";
import useVendorOptions from "../hooks/useVendorOptions";
import procurementService from "../services/procurementService";
import { QUOTATION_ELIGIBLE_PR_STATUSES } from "../constants/procurementStatus";
import QuotationFormModal from "./QuotationFormModal";

function openBlob(blob, contentType, mode) {
  const file = new Blob([blob], { type: contentType });
  const url = URL.createObjectURL(file);
  if (mode === "download") {
    const link = document.createElement("a");
    link.href = url;
    link.download = "quotation";
    link.click();
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export default function QuotationTab() {
  const [searchParams] = useSearchParams();
  const { canManageQuotation } = useApPermissions();

  const [selectedPrId, setSelectedPrId] = useState(searchParams.get("prId") || "");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [docLoadingId, setDocLoadingId] = useState(null);

  const { data: allPrs = [] } = useAllPurchaseRequisitions();
  const { data: prStatuses = [] } = usePrStatuses();
  const { data: quotationStatuses = [] } = useQuotationStatuses();
  const { vendorNameById } = useVendorOptions();

  const prStatusCodeById = new Map(prStatuses.map((s) => [s.status_id, s.status_code]));
  const quotationStatusNameById = new Map(quotationStatuses.map((s) => [s.status_id, s.status_name]));

  const eligiblePrs = useMemo(
    () =>
      allPrs.filter((pr) => QUOTATION_ELIGIBLE_PR_STATUSES.includes(prStatusCodeById.get(pr.status_id))),
    [allPrs, prStatusCodeById],
  );

  const selectedPr = eligiblePrs.find((pr) => String(pr.id) === String(selectedPrId));

  const {
    data: quotations = [],
    isLoading,
    isError,
    error,
  } = useQuotationsForPr(selectedPrId || undefined);

  const deleteQuotation = useDeleteQuotation(selectedPrId);

  const prOptions = [
    { value: "", label: "Select a purchase requisition" },
    ...eligiblePrs.map((pr) => ({ value: String(pr.id), label: pr.pr_number })),
  ];

  const handleView = async (quotationId) => {
    setDocLoadingId(quotationId);
    try {
      const { blob, contentType } = await procurementService.viewQuotationDocument(quotationId);
      openBlob(blob, contentType, "view");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not load the quotation document."));
    } finally {
      setDocLoadingId(null);
    }
  };

  const handleDownload = async (quotationId) => {
    setDocLoadingId(quotationId);
    try {
      const { blob, contentType } = await procurementService.downloadQuotationDocument(quotationId);
      openBlob(blob, contentType, "download");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not download the quotation document."));
    } finally {
      setDocLoadingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteQuotation.mutateAsync(deleteTarget.id);
      toast.success("Quotation deleted.");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not delete this quotation."));
    }
  };

  const prStatusCode = selectedPr ? prStatusCodeById.get(selectedPr.status_id) : null;

  const headers = ["Vendor", "Quotation No.", "Quotation Date", "Valid Until", "Total Amount", "Status", "Actions"];
  const columns = ["vendor", "quotationNumber", "quotationDate", "validUntil", "totalAmount", "status", "actions"];

  const rows = quotations.map((q) => {
    const statusName = quotationStatusNameById.get(q.status_id) || "Unknown";
    const isReceived = quotationStatuses.find((s) => s.status_id === q.status_id)?.status_code === "RECEIVED";
    const deletable = canManageQuotation && isReceived && prStatusCode === "VENDOR_SELECTION";

    return {
      vendor: vendorNameById.get(q.vendor_id) || `Vendor #${q.vendor_id}`,
      quotationNumber: q.quotation_number || "—",
      quotationDate: formatDate(q.quotation_date),
      validUntil: formatDate(q.valid_until),
      totalAmount: q.total_amount != null ? formatCurrency(Number(q.total_amount)) : "—",
      status: <StatusBadge label={statusName} size="sm" />,
      actions: (
        <div className="flex items-center gap-1 justify-center">
          <Button
            type="button"
            variant="link"
            size="icon"
            title="View Document"
            className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 rounded-md"
            onClick={() => handleView(q.id)}
            disabled={docLoadingId === q.id}
          >
            <Eye size={16} />
          </Button>
          <Button
            type="button"
            variant="link"
            size="icon"
            title="Download Document"
            className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-50 rounded-md"
            onClick={() => handleDownload(q.id)}
            disabled={docLoadingId === q.id}
          >
            <Download size={16} />
          </Button>
          {deletable && (
            <Button
              type="button"
              variant="link"
              size="icon"
              title="Delete Quotation"
              className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 rounded-md"
              onClick={() => setDeleteTarget(q)}
            >
              <Trash2 size={16} />
            </Button>
          )}
        </div>
      ),
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:w-80">
          <FormSelect
            label="Purchase Requisition"
            name="prId"
            value={selectedPrId}
            onChange={(e) => setSelectedPrId(e.target.value)}
            options={prOptions}
          />
        </div>
        {selectedPr && canManageQuotation && (
          <Button variant="primary" onClick={() => setIsCreateOpen(true)} className="whitespace-nowrap">
            <Plus size={16} />
            Add Quotation
          </Button>
        )}
      </div>

      {!selectedPrId ? (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          Select an approved requisition to view or add quotations. Only requisitions that are
          Approved or in Vendor Selection can receive quotations.
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {getApiErrorMessage(error, "Failed to load quotations.")}
        </div>
      ) : isLoading ? (
        <LoadingSpinner text="Loading quotations..." />
      ) : quotations.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          No quotations received yet for this requisition.
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-lg">
          <GenericTable headers={headers} rows={rows} columns={columns} />
        </div>
      )}

      {selectedPr && (
        <QuotationFormModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} prId={selectedPr.id} />
      )}

      <ConfirmationModal
        isOpen={!!deleteTarget}
        title="Delete Quotation"
        message="Delete this quotation? This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={deleteQuotation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        variant="danger"
      />
    </div>
  );
}
