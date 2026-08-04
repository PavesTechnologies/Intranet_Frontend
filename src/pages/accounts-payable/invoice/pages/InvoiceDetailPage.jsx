import React, { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import PageHeader from "../../../../components/ui/PageHeader";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import StatusBadge from "../../../../components/status/statusbadge";
import Button from "../../../../components/Button/Button";
import { Fonts } from "../../../../components/Fonts/Fonts";
import { showStatusToast } from "../../../../components/toastfy/toast";
import InvoiceMatchingPanel from "../components/InvoiceMatchingPanel";
import ValidationChecklist from "../components/ValidationChecklist";
import InvoiceAttachmentList from "../components/InvoiceAttachmentList";
import { useInvoiceDetail, useSubmitForValidation } from "../hooks/useInvoiceDetail";
import { useInvoiceMatching } from "../hooks/useInvoiceMatching";
import { getVendorNameById } from "../../mocks/apFixtures";
import { INVOICE_STATUS } from "../../constants/invoiceStatus";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { useAuth } from "../../../../contexts/AuthContext";
// RBAC disabled for AP module development — restore to re-enable role checks
// import { AP_CLERK_PLUS_ROLES } from "../../constants/apRoles";

const TABS = [
  { key: "details", label: "Details" },
  { key: "matching", label: "Matching" },
  { key: "validation", label: "Validation" },
  { key: "attachments", label: "Attachments" },
];

const DetailRow = ({ label, value }) => (
  <div className="flex flex-col gap-0.5 py-2">
    <span className={Fonts.smallText}>{label}</span>
    <span className={Fonts.label}>{value}</span>
  </div>
);

const InvoiceDetailPage = () => {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabFromQuery = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    TABS.some((t) => t.key === tabFromQuery) ? tabFromQuery : "details"
  );

  const { data: invoice, isLoading } = useInvoiceDetail(invoiceId);
  const matching = useInvoiceMatching(invoiceId);
  const submitForValidation = useSubmitForValidation(invoiceId);

  const canClerk = true; // RBAC disabled for AP module development — restore: hasRole(AP_CLERK_PLUS_ROLES)

  const changeTab = (tabKey) => {
    setActiveTab(tabKey);
    const next = new URLSearchParams(searchParams);
    next.set("tab", tabKey);
    setSearchParams(next, { replace: true });
  };

  const handleSubmitForValidation = async () => {
    try {
      await submitForValidation.mutateAsync();
      showStatusToast("Invoice moved to Pending Match.", "success");
    } catch (error) {
      showStatusToast(error?.message || "Failed to submit invoice.", "error");
    }
  };

  const handleMarkMatched = async () => {
    try {
      await matching.markMatched.mutateAsync();
      showStatusToast("Invoice marked as matched and moved to Pending Approval.", "success");
    } catch (error) {
      showStatusToast(error?.message || "Failed to mark invoice as matched.", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6">
        <LoadingSpinner text="Loading invoice..." size="lg" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6">
        <p className={Fonts.paragraphMuted}>Invoice not found.</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate("/accounts-payable/invoices")}>
          Back to Invoices
        </Button>
      </div>
    );
  }

  const vendorName = getVendorNameById(invoice.vendorId);

  const renderActiveTab = () => {
    switch (activeTab) {
      case "matching":
        return (
          <InvoiceMatchingPanel
            data={matching.data}
            isLoading={matching.isLoading}
            canMark={canClerk && invoice.status === INVOICE_STATUS.PENDING_MATCH}
            onMarkMatched={handleMarkMatched}
            isMarking={matching.markMatched.isPending}
          />
        );
      case "validation":
        return (
          <div className="space-y-4">
            <ValidationChecklist invoice={invoice} />
            {canClerk && invoice.status === INVOICE_STATUS.PENDING_VALIDATION && (
              <div className="flex justify-end">
                <Button
                  size="medium"
                  variant="success"
                  loading={submitForValidation.isPending}
                  loadingText="Submitting..."
                  onClick={handleSubmitForValidation}
                >
                  Submit for Validation
                </Button>
              </div>
            )}
          </div>
        );
      case "attachments":
        return <InvoiceAttachmentList invoiceId={invoice.id} />;
      case "details":
      default:
        return (
          <div className="grid grid-cols-1 gap-x-8 gap-y-1 divide-y divide-gray-100 sm:grid-cols-2 sm:divide-y-0">
            <DetailRow label="PO Number" value={invoice.poNumber || "—"} />
            <DetailRow label="Amount" value={formatCurrency(invoice.amount)} />
            <DetailRow label="Submitted Date" value={formatDate(invoice.submittedDate)} />
            <DetailRow label="Due Date" value={formatDate(invoice.dueDate)} />
            <DetailRow label="Match Status" value={<StatusBadge label={invoice.matchStatus} size="sm" />} />
            <DetailRow label="Approval Tier" value={invoice.approvalTier || "—"} />
          </div>
        );
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">
      <p className={`${Fonts.smallText} mb-2`}>
        Accounts Payable / Invoices / {invoice.id}
      </p>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {invoice.id}
            <StatusBadge label={invoice.status} size="md" />
          </span>
        }
        subtitle={vendorName}
        actions={
          <Button variant="outline" size="medium" onClick={() => navigate("/accounts-payable/invoices")}>
            Back to Invoices
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => changeTab(tab.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.key
                ? "border-[#0A0082] text-[#0A0082]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <PageCard>
        <PageCardContent>{renderActiveTab()}</PageCardContent>
      </PageCard>
    </div>
  );
};

export default InvoiceDetailPage;
