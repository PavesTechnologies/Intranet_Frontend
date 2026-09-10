import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  Eye,
  Download,
  Plus,
} from "lucide-react";

import PageHeader from "../../../../components/ui/PageHeader";
import Breadcrumb from "../../../../components/Breadcrumb/Breadcrumb";
import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import StatusBadge from "../../../../components/status/statusbadge";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import {
  PageCard,
  PageCardContent,
} from "../../../../components/Cards/PageCard";
import Modal from "../../../../components/Modal/modal";

import { getApiErrorMessage } from "../../utils/apiError";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
} from "../../utils/formatters";
import { AP_ROUTES } from "../../constants/routes";
import { useApPermissions } from "../../hooks/useApPermissions";
import {
  usePrStatuses,
  useQuotationStatuses,
  useRfqStatuses,
} from "../../hooks/useApLookups";

import {
  useRfqDetail,
  useQuotationsForRfq,
} from "../hooks/useRfqs";

import {
  useSendRfq,
  useCloseRfq,
} from "../hooks/useRfqMutations";

import usePurchaseRequisitionDetail from "../hooks/usePurchaseRequisitionDetail";
import useDepartments from "../../system-configuration/hooks/useDepartments";
import usePurchaseCategories from "../../system-configuration/hooks/usePurchaseCategories";
import useVendorOptions from "../hooks/useVendorOptions";

import procurementService from "../services/procurementService";

import PrLineEditor from "../components/PrLineEditor";
import QuotationFormModal from "../components/QuotationFormModal";
import InviteVendorsModal from "../components/InviteVendorsModal";
import RfqSendResultsPanel from "../components/RfqSendResultsPanel";
import EmptyState from "../components/EmptyState";

import { extractRfqSendResults } from "../utils/rfqSendResults";

const RFQ_STAGE_HINTS = {
  DRAFT:
    "Invite vendors, then send the RFQ once at least one vendor is invited.",

  SENT:
    "Waiting on vendor responses. Record quotations as they arrive, then close the RFQ once done.",

  RESPONSE_RECEIVED:
    "Review the quotations received so far, then close the RFQ when ready to select a vendor.",

  CLOSED:
    "This RFQ is closed. Continue to Vendor Selection to compare and select a quotation.",
};

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-gray-900">
        {value ?? "—"}
      </p>
    </div>
  );
}

function openBlob(blob, contentType, mode) {
  const file = new Blob(
    [blob],
    { type: contentType }
  );

  const url = URL.createObjectURL(file);

  if (mode === "download") {
    const link = document.createElement("a");

    link.href = url;
    link.download = "quotation";

    link.click();
  } else {
    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  }

  setTimeout(
    () => URL.revokeObjectURL(url),
    60_000
  );
}

export default function RfqDetailPage() {
  const { rfqId } = useParams();
  const navigate = useNavigate();

  const normalizedRfqId = String(
    rfqId ?? ""
  ).trim();

  const {
    canCreateQuotation,
    canUpdateQuotation,
    canInviteVendor,
    canSendRfq,
  } = useApPermissions();

  const {
    data: rfq,
    isLoading,
    isError,
    error,
  } = useRfqDetail(normalizedRfqId);

  const {
    data: rfqStatuses = [],
  } = useRfqStatuses();

  const {
    data: prStatuses = [],
  } = usePrStatuses();

  const {
    data: quotationStatuses = [],
  } = useQuotationStatuses();

  const {
    data: pr,
  } = usePurchaseRequisitionDetail(
    rfq?.pr_id
  );

  const {
    data: departments = [],
  } = useDepartments();

  const {
    data: categories = [],
  } = usePurchaseCategories();

  const {
    vendors,
    vendorNameById,
  } = useVendorOptions();

  const {
    data: rfqQuotations = [],
  } = useQuotationsForRfq(
    normalizedRfqId
  );

  const sendRfq =
    useSendRfq(normalizedRfqId);

  const closeRfq =
    useCloseRfq(normalizedRfqId);

  const [sendOpen, setSendOpen] =
    useState(false);

  const [selectedVendorIds, setSelectedVendorIds] = useState([]);

  const [closeOpen, setCloseOpen] =
    useState(false);

  const [inviteOpen, setInviteOpen] =
    useState(false);

  const [quotationOpen, setQuotationOpen] =
    useState(false);

  const [docLoadingId, setDocLoadingId] =
    useState(null);

  const [sendResults, setSendResults] =
    useState(null);

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingSpinner text="Loading RFQ..." />
      </div>
    );
  }

  if (isError || !rfq) {
    const notFound =
      error?.response?.status === 404;

    return (
      <div className="p-6">
        <PageHeader title="RFQ" />

        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center">
          <p className="text-lg font-semibold text-gray-700">
            {notFound
              ? "RFQ not found"
              : "Something went wrong"}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            {notFound
              ? "This RFQ doesn't exist or may have been removed."
              : getApiErrorMessage(
                  error,
                  "Unable to load this RFQ right now."
                )}
          </p>

          <Button
            variant="outline"
            className="mt-4"
            onClick={() =>
              navigate(
                AP_ROUTES.PROCUREMENT
              )
            }
          >
            Back to Procurement
          </Button>
        </div>
      </div>
    );
  }

  /*
   * Resolve RFQ status safely.
   *
   * API responses can contain status_id as either
   * number or string, so compare normalized numbers.
   */
  const rfqStatus = rfqStatuses.find(
    (status) =>
      Number(status.status_id) ===
      Number(rfq.status_id)
  );

  const statusCode = String(
    rfqStatus?.status_code || ""
  )
    .trim()
    .toUpperCase();

  const statusName =
    rfqStatus?.status_name ||
    "Unknown";

  const prStatus = pr
    ? prStatuses.find(
        (status) =>
          Number(status.status_id) ===
          Number(pr.status_id)
      )
    : null;

  const prStatusCode = String(
    prStatus?.status_code || ""
  )
    .trim()
    .toUpperCase();

  const departmentName = pr
    ? departments.find(
        (department) =>
          Number(department.id) ===
          Number(pr.department_id)
      )?.name || "—"
    : "—";

  const categoryName = pr
    ? categories.find(
        (category) =>
          Number(category.id) ===
          Number(pr.purchase_category_id)
      )?.name || "—"
    : "—";

  /*
   * Always normalize relationship arrays.
   */
  const invitedVendors =
    Array.isArray(rfq.rfq_vendor)
      ? rfq.rfq_vendor
      : [];

  const quotations =
    Array.isArray(rfqQuotations)
      ? rfqQuotations
      : [];

  const invitedVendorIds =
    invitedVendors.map(
      (vendor) => vendor.vendor_id
    );

  const quotationByVendorId =
    new Map(
      quotations.map((quotation) => [
        quotation.vendor_id,
        quotation,
      ])
    );

  const hasInvitedVendors =
    invitedVendors.length > 0;

  const hasQuotations =
    quotations.length > 0;

  /*
   * ACTION VISIBILITY
   *
   * Send RFQ:
   * DRAFT + at least one invited vendor +
   * SEND_RFQ permission.
   */
  const canSend =
    Boolean(canSendRfq) &&
    statusCode === "DRAFT" &&
    hasInvitedVendors;

  /*
   * Close RFQ:
   * SENT/RESPONSE_RECEIVED + quotation +
   * QUOTATION_UPDATE permission.
   */
  const canClose =
    Boolean(canUpdateQuotation) &&
    (
      statusCode === "SENT" ||
      statusCode === "RESPONSE_RECEIVED"
    ) &&
    hasQuotations;

  const canInvite =
    Boolean(canInviteVendor) &&
    (
      statusCode === "DRAFT" ||
      statusCode === "SENT"
    );

  const canAddQuotation =
    Boolean(canCreateQuotation) &&
    statusCode !== "CLOSED" &&
    hasInvitedVendors;

  const backToQuotationTab = pr
    ? `${AP_ROUTES.PROCUREMENT}?tab=quotation&prId=${pr.id}`
    : AP_ROUTES.PROCUREMENT;

  const handleSend = async () => {
  if (!selectedVendorIds.length) {
    toast.error("Please select at least one vendor.");
    return;
  }

  try {
    const result = await sendRfq.mutateAsync(selectedVendorIds);

    setSendOpen(false);
    setSelectedVendorIds([]);

    const results = extractRfqSendResults(result);

    if (results) {
      setSendResults(results);
    } else {
      toast.success(
        `${rfq.rfq_number} sent to ${selectedVendorIds.length} selected vendor(s).`
      );
    }
  } catch (err) {
    toast.error(getApiErrorMessage(err, "Could not send this RFQ."));
  }
};
  const handleOpenSend = () => {
  setSelectedVendorIds([]);
  setSendOpen(true);
};

const handleToggleVendor = (vendorId) => {
  const normalizedId = Number(vendorId);

  setSelectedVendorIds((current) =>
    current.includes(normalizedId)
      ? current.filter((id) => id !== normalizedId)
      : [...current, normalizedId]
  );
};

const handleSelectAllVendors = () => {
  setSelectedVendorIds(
    invitedVendorIds.map((vendorId) => Number(vendorId))
  );
};

const handleClearSelectedVendors = () => {
  setSelectedVendorIds([]);
};

const handleCancelSend = () => {
  if (sendRfq.isPending) return;

  setSendOpen(false);
  setSelectedVendorIds([]);
};
  const handleCloseRfq = async () => {
    try {
      await closeRfq.mutateAsync();

      toast.success(
        `${rfq.rfq_number} closed.`
      );

      setCloseOpen(false);
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          "Could not close this RFQ."
        )
      );
    }
  };

  const handleView = async (
    quotationId
  ) => {
    setDocLoadingId(quotationId);

    try {
      const {
        blob,
        contentType,
      } =
        await procurementService.viewQuotationDocument(
          quotationId
        );

      openBlob(
        blob,
        contentType,
        "view"
      );
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          "Could not load the quotation document."
        )
      );
    } finally {
      setDocLoadingId(null);
    }
  };

  const handleDownload = async (
    quotationId
  ) => {
    setDocLoadingId(quotationId);

    try {
      const {
        blob,
        contentType,
      } =
        await procurementService.downloadQuotationDocument(
          quotationId
        );

      openBlob(
        blob,
        contentType,
        "download"
      );
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          "Could not download the quotation document."
        )
      );
    } finally {
      setDocLoadingId(null);
    }
  };

  const vendorHeaders = [
    "Vendor",
    "Email",
    "Invited At",
    "Response",
    "Quotation No.",
  ];

  const vendorColumns = [
    "vendor",
    "email",
    "invitedAt",
    "response",
    "quotationNumber",
  ];

  const vendorRows =
    invitedVendors.map(
      (invitedVendor) => {
        const vendor =
          vendors.find(
            (item) =>
              Number(item.vendor_id) ===
              Number(
                invitedVendor.vendor_id
              )
          );

        const quotation =
          quotationByVendorId.get(
            invitedVendor.vendor_id
          );

        return {
          vendor:
            vendorNameById.get(
              invitedVendor.vendor_id
            ) ||
            `Vendor #${invitedVendor.vendor_id}`,

          email:
            vendor?.email || "—",

          invitedAt:
            formatDateTime(
              invitedVendor.invited_at
            ),

          response: quotation ? (
            <span className="text-xs font-semibold text-emerald-700">
              Responded
            </span>
          ) : (
            <span className="text-xs text-gray-400">
              Awaiting response
            </span>
          ),

          quotationNumber:
            quotation ? (
              quotation.quotation_number ||
              "—"
            ) : (
              <span className="text-gray-400">
                —
              </span>
            ),
        };
      }
    );

  const quotationHeaders = [
    "Vendor",
    "Quotation No.",
    "Quotation Date",
    "Valid Until",
    "Total Amount",
    "Delivery Days",
    "Payment Terms",
    "Status",
    "Actions",
  ];

  const quotationColumns = [
    "vendor",
    "quotationNumber",
    "quotationDate",
    "validUntil",
    "totalAmount",
    "deliveryDays",
    "paymentTerms",
    "status",
    "actions",
  ];

  const quotationRows =
    quotations.map((quotation) => ({
      vendor:
        vendorNameById.get(
          quotation.vendor_id
        ) ||
        `Vendor #${quotation.vendor_id}`,

      quotationNumber:
        quotation.quotation_number ||
        "—",

      quotationDate:
        formatDate(
          quotation.quotation_date
        ),

      validUntil:
        formatDate(
          quotation.valid_until
        ),

      totalAmount:
        quotation.total_amount != null
          ? formatCurrency(
              Number(
                quotation.total_amount
              )
            )
          : "—",

      deliveryDays:
        quotation.delivery_days != null
          ? quotation.delivery_days
          : "—",

      paymentTerms:
        quotation.payment_terms ||
        "—",

      status: (
        <StatusBadge
          label={
            quotationStatuses.find(
              (status) =>
                Number(
                  status.status_id
                ) ===
                Number(
                  quotation.status_id
                )
            )?.status_name ||
            "Unknown"
          }
          size="sm"
        />
      ),

      actions: (
        <div className="flex items-center gap-1 justify-center">
          <Button
            type="button"
            variant="link"
            size="icon"
            title="View Document"
            className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 rounded-md"
            onClick={() =>
              handleView(
                quotation.id
              )
            }
            disabled={
              docLoadingId ===
              quotation.id
            }
          >
            <Eye size={16} />
          </Button>

          <Button
            type="button"
            variant="link"
            size="icon"
            title="Download Document"
            className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-50 rounded-md"
            onClick={() =>
              handleDownload(
                quotation.id
              )
            }
            disabled={
              docLoadingId ===
              quotation.id
            }
          >
            <Download size={16} />
          </Button>
        </div>
      ),
    }));

  return (
    <div className="p-6">
      <Breadcrumb
        items={[
          {
            label: "Procurement",
            to: AP_ROUTES.PROCUREMENT,
          },

          ...(pr
            ? [
                {
                  label: pr.pr_number,
                  to: backToQuotationTab,
                },
              ]
            : []),

          {
            label: rfq.rfq_number,
          },
        ]}
      />

      <PageHeader
        title={rfq.rfq_number}
        subtitle={
          pr
            ? `${departmentName} · ${categoryName}`
            : undefined
        }
        actions={
          <Button
            variant="outline"
            onClick={() =>
              navigate(
                backToQuotationTab
              )
            }
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Quotation
          </Button>
        }
      />

      <PageCard className="mb-4">
        <PageCardContent>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <StatusBadge label={statusName} />

            <div className="flex flex-wrap gap-2">
              {canSend && (
                <Button
                  variant="primary"
                  onClick={handleOpenSend}
                >
                  Send RFQ
                </Button>
              )}

              {canClose && (
                <Button
                  variant="outline"
                  onClick={() =>
                    setCloseOpen(true)
                  }
                >
                  Close RFQ
                </Button>
              )}

              {statusCode ===
                "CLOSED" &&
                pr && (
                  <Link
                    to={`${AP_ROUTES.PROCUREMENT}?tab=vendorSelection&prId=${pr.id}`}
                  >
                    <Button variant="primary">
                      Continue to Vendor Selection
                    </Button>
                  </Link>
                )}
            </div>
          </div>

          {RFQ_STAGE_HINTS[
            statusCode
          ] && (
            <p className="mb-2 text-sm text-gray-500">
              {
                RFQ_STAGE_HINTS[
                  statusCode
                ]
              }
            </p>
          )}

          {statusCode ===
            "DRAFT" &&
            !hasInvitedVendors && (
              <p className="mb-2 text-sm text-amber-600">
                Invite at least one
                vendor before this
                RFQ can be sent.
              </p>
            )}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field
              label="Due Date"
              value={formatDate(
                rfq.due_date
              )}
            />

            <Field
              label="Sent At"
              value={
                rfq.sent_at
                  ? formatDateTime(
                      rfq.sent_at
                    )
                  : "—"
              }
            />

            <Field
              label="Closed At"
              value={
                rfq.closed_at
                  ? formatDateTime(
                      rfq.closed_at
                    )
                  : "—"
              }
            />

            <Field
              label="Created"
              value={formatDateTime(
                rfq.created_at
              )}
            />
          </div>
        </PageCardContent>
      </PageCard>

      {pr && (
        <PageCard className="mb-4">
          <PageCardContent>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">
                Purchase Requisition Summary
              </h3>

              <Link
                to={AP_ROUTES.PROCUREMENT_PR_DETAIL(
                  pr.id
                )}
                className="text-xs font-semibold text-[#0A0082] hover:underline"
              >
                View {pr.pr_number}
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field
                label="PR Number"
                value={pr.pr_number}
              />

              <Field
                label="Department"
                value={departmentName}
              />

              <Field
                label="Purchase Category"
                value={categoryName}
              />

              <Field
                label="Estimated Total"
                value={formatCurrency(
                  Number(
                    pr.estimated_total
                  ) || 0
                )}
              />
            </div>

            {pr.justification && (
              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Justification
                </p>

                <p className="mt-1 text-sm text-gray-700">
                  {pr.justification}
                </p>
              </div>
            )}
          </PageCardContent>
        </PageCard>
      )}

      {pr && (
        <PageCard className="mb-4">
          <PageCardContent>
            <h3 className="mb-3 text-sm font-semibold text-gray-700">
              Requested Items
            </h3>

            <PrLineEditor
              prId={pr.id}
              lines={
                pr.purchase_requisition_line
              }
              editable={false}
            />
          </PageCardContent>
        </PageCard>
      )}

      <PageCard className="mb-4">
        <PageCardContent>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-gray-700">
              Invited Vendors
            </h3>

            {canInvite && (
              <Button
                variant="primary"
                size="small"
                onClick={() =>
                  setInviteOpen(true)
                }
              >
                <Plus size={14} />
                Invite Vendors
              </Button>
            )}
          </div>

          {invitedVendors.length ===
          0 ? (
            <EmptyState
              title="No vendors invited yet"
              description="Invite active vendors to this RFQ before it can be sent."
            />
          ) : (
            <div className="w-full overflow-x-auto rounded-lg">
              <GenericTable
                headers={
                  vendorHeaders
                }
                rows={vendorRows}
                columns={
                  vendorColumns
                }
              />
            </div>
          )}
        </PageCardContent>
      </PageCard>

      <PageCard>
        <PageCardContent>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-gray-700">
              Received Quotations
            </h3>

            {canAddQuotation && (
              <Button
                variant="primary"
                size="small"
                onClick={() =>
                  setQuotationOpen(true)
                }
              >
                <Plus size={14} />
                Add Quotation
              </Button>
            )}
          </div>

          {quotations.length ===
          0 ? (
            <EmptyState
              title="No quotations received yet"
              description="Record a quotation as vendors respond to this RFQ."
            />
          ) : (
            <div className="w-full overflow-x-auto rounded-lg">
              <GenericTable
                headers={
                  quotationHeaders
                }
                rows={
                  quotationRows
                }
                columns={
                  quotationColumns
                }
              />
            </div>
          )}
        </PageCardContent>
      </PageCard>

      <Modal
  isOpen={sendOpen}
  onClose={handleCancelSend}
  title="Send RFQ"
  size="sm"
  footer={
    <div className="flex justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={handleCancelSend}
        disabled={sendRfq.isPending}
      >
        Cancel
      </Button>

      <Button
        type="button"
        variant="primary"
        onClick={handleSend}
        disabled={
          sendRfq.isPending ||
          selectedVendorIds.length === 0
        }
      >
        {sendRfq.isPending
          ? "Sending..."
          : `Send RFQ${
              selectedVendorIds.length
                ? ` (${selectedVendorIds.length})`
                : ""
            }`}
      </Button>
    </div>
  }
>
  <div className="space-y-4">
    <div>
      <p className="text-sm text-gray-700">
        Select the vendors you want to send{" "}
        <span className="font-semibold">
          {rfq.rfq_number}
        </span>{" "}
        to.
      </p>

      <p className="mt-1 text-xs text-gray-500">
        Only the selected vendors will receive this RFQ.
      </p>
    </div>

    <div className="flex items-center justify-between border-b border-gray-200 pb-3">
      <span className="text-sm font-medium text-gray-700">
        {selectedVendorIds.length} of{" "}
        {invitedVendors.length} selected
      </span>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSelectAllVendors}
          disabled={sendRfq.isPending}
          className="text-xs font-semibold text-[#0A0082] hover:underline disabled:opacity-50"
        >
          Select All
        </button>

        <button
          type="button"
          onClick={handleClearSelectedVendors}
          disabled={sendRfq.isPending}
          className="text-xs font-semibold text-gray-600 hover:underline disabled:opacity-50"
        >
          Clear
        </button>
      </div>
    </div>

    <div className="max-h-80 space-y-2 overflow-y-auto">
      {invitedVendors.map((invitedVendor) => {
        const vendorId = Number(
          invitedVendor.vendor_id
        );

        const vendor = vendors.find(
          (item) =>
            Number(item.vendor_id) === vendorId
        );

        const vendorName =
          vendorNameById.get(
            invitedVendor.vendor_id
          ) ||
          vendorNameById.get(vendorId) ||
          `Vendor #${vendorId}`;

        const email = vendor?.email || "—";

        const isSelected =
          selectedVendorIds.includes(vendorId);

        return (
          <label
            key={vendorId}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
              isSelected
                ? "border-[#0A0082] bg-blue-50"
                : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() =>
                handleToggleVendor(vendorId)
              }
              disabled={sendRfq.isPending}
              className="mt-1 h-4 w-4 rounded border-gray-300"
            />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">
                {vendorName}
              </p>

              <p className="mt-0.5 text-xs text-gray-500">
                {email}
              </p>
            </div>
          </label>
        );
      })}
    </div>

    {selectedVendorIds.length === 0 && (
      <p className="text-xs text-amber-600">
        Select at least one vendor to send the RFQ.
      </p>
    )}
  </div>
</Modal>

      <ConfirmationModal
        isOpen={closeOpen}
        title="Close RFQ"
        message={`Close ${rfq.rfq_number}? No further quotations can be added once it is closed, and vendor selection will become available.`}
        confirmText="Close RFQ"
        cancelText="Cancel"
        isLoading={
          closeRfq.isPending
        }
        onConfirm={
          handleCloseRfq
        }
        onCancel={() =>
          setCloseOpen(false)
        }
        variant="primary"
      />

      <Modal
        isOpen={!!sendResults}
        onClose={() =>
          setSendResults(null)
        }
        title="RFQ send results"
        size="sm"
        footer={
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={() =>
                setSendResults(null)
              }
            >
              Done
            </Button>
          </div>
        }
      >
        {sendResults && (
          <RfqSendResultsPanel
            results={sendResults}
          />
        )}
      </Modal>

      {pr && (
        <InviteVendorsModal
          isOpen={inviteOpen}
          onClose={() =>
            setInviteOpen(false)
          }
          rfqId={normalizedRfqId}
          excludeVendorIds={
            invitedVendorIds
          }
        />
      )}

      {pr && (
        <QuotationFormModal
          isOpen={quotationOpen}
          onClose={() =>
            setQuotationOpen(false)
          }
          prId={pr.id}
          rfqId={normalizedRfqId}
          invitedVendorIds={
            invitedVendorIds
          }
        />
      )}
    </div>
  );
}