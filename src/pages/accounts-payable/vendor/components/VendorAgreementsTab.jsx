import { useState } from "react";
import { toast } from "react-toastify";
import { FileSignature, Upload } from "lucide-react";
import clsx from "clsx";

import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import Modal from "../../../../components/Modal/modal";
import FormTextArea from "../../../../components/forms/FormTextArea";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import DocumentViewButton from "../../payment/components/DocumentViewButton";
import AgreementUploadModal from "./AgreementUploadModal";

import { useApPermissions } from "../../hooks/useApPermissions";
import { useAuth } from "../../../../contexts/AuthContext";
import { formatDate } from "../../utils/formatters";
import { getApiErrorMessage } from "../../utils/apiError";
import { AGREEMENT_STATUS_META, AGREEMENT_TYPE_OPTIONS } from "../../constants/paymentTerms";
import { paymentTermService } from "../../invoice/services/paymentTermService";
import {
  useRejectAgreementMutation,
  useVendorAgreements,
  useVerifyAgreementMutation,
} from "../../invoice/hooks/useInvoicePaymentTerms";

const HEADERS = ["Agreement", "Validity", "Payment terms", "Status", "Uploaded", "Verified", "Document", "Actions"];
const COLUMNS = ["agreement", "validity", "terms", "status", "uploaded", "verified", "document", "actions"];
const TYPE_LABEL = Object.fromEntries(AGREEMENT_TYPE_OPTIONS.map((o) => [o.value, o.label]));

function AgreementStatus({ agreement }) {
  const meta = AGREEMENT_STATUS_META[agreement.status] || { label: agreement.status, className: "" };
  return (
    <div className="flex flex-col gap-1">
      <span className={clsx("inline-flex w-fit rounded-full border px-2 py-0.5 text-xs font-semibold", meta.className)}>
        {meta.label}
      </span>
      {agreement.status === "ACTIVE" && agreement.is_expired && (
        <span className="text-xs font-semibold text-rose-600">Expired</span>
      )}
      {agreement.status === "ACTIVE" && !agreement.is_expired && agreement.days_to_expiry != null && agreement.days_to_expiry <= 30 && (
        <span className="text-xs font-semibold text-amber-700">Expires in {agreement.days_to_expiry} days</span>
      )}
    </div>
  );
}

/**
 * Vendor Detail > Agreements. Lists the vendor's agreements/contracts and their lifecycle. Only an
 * ACTIVE agreement valid on an invoice's date is used to check that (non-PO) invoice's payment
 * terms; verifying one re-checks the vendor's open invoices on the backend.
 */
export default function VendorAgreementsTab({ vendorId }) {
  const { canViewAgreements, canUploadAgreements, canVerifyAgreements } = useApPermissions();
  const { user } = useAuth();
  const { data: agreements = [], isLoading, isError, error } = useVendorAgreements(vendorId, {
    enabled: canViewAgreements,
  });
  const verify = useVerifyAgreementMutation(vendorId);
  const reject = useRejectAgreementMutation(vendorId);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [decision, setDecision] = useState(null); // {agreement, action: "verify" | "reject"}
  const [remarks, setRemarks] = useState("");

  if (!canViewAgreements) {
    return <p className="text-sm italic text-gray-500">You do not have access to vendor agreements.</p>;
  }

  const currentUserId = String(user?.user_id ?? user?.sub ?? "");

  const closeDecision = () => {
    setDecision(null);
    setRemarks("");
  };

  const submitDecision = () => {
    const mutation = decision.action === "verify" ? verify : reject;
    mutation.mutate(
      { agreementId: decision.agreement.agreement_id, remarks: remarks.trim() },
      {
        onSuccess: (result) => {
          toast.success(
            decision.action === "verify"
              ? `Agreement verified${result?.rechecked_invoice_count ? ` — ${result.rechecked_invoice_count} open invoice(s) re-checked` : ""}.`
              : "Agreement rejected.",
          );
          closeDecision();
        },
        onError: (err) => toast.error(getApiErrorMessage(err, "Could not update the agreement.")),
      },
    );
  };

  const rows = agreements.map((a) => {
    const ownUpload = a.uploaded_by != null && String(a.uploaded_by) === currentUserId;
    const pending = a.status === "PENDING_VERIFICATION";
    return {
      agreement: (
        <div>
          <p className="font-medium text-gray-900">{a.title}</p>
          <p className="text-xs text-gray-500">
            {TYPE_LABEL[a.agreement_type] || a.agreement_type}
            {a.reference_no ? ` · ${a.reference_no}` : ""}
          </p>
        </div>
      ),
      validity: `${formatDate(a.valid_from)} – ${a.valid_to ? formatDate(a.valid_to) : "open-ended"}`,
      terms: (
        <div>
          <p className="text-sm text-gray-900">
            {a.term_days != null ? `${a.term_days} days` : "Not set"}
            <span className="text-xs text-gray-500"> from {a.due_basis === "GRN_DATE" ? "GRN" : "invoice"} date</span>
          </p>
          {a.payment_terms_text && <p className="max-w-xs truncate text-xs text-gray-500" title={a.payment_terms_text}>{a.payment_terms_text}</p>}
        </div>
      ),
      status: <AgreementStatus agreement={a} />,
      uploaded: (
        <span className="text-xs text-gray-600">
          {a.uploaded_by || "—"}
          <br />
          {formatDate(a.uploaded_at)}
        </span>
      ),
      verified: a.verified_by ? (
        <span className="text-xs text-gray-600" title={a.verification_remarks || ""}>
          {a.verified_by}
          <br />
          {formatDate(a.verified_at)}
        </span>
      ) : (
        "—"
      ),
      document: a.documents?.[0] ? (
        <DocumentViewButton
          fileName={a.documents[0].file_name}
          fetchBlob={() => paymentTermService.viewAgreementDocument(a.agreement_id, a.documents[0].document_id)}
        />
      ) : (
        "—"
      ),
      actions:
        canVerifyAgreements && pending ? (
          ownUpload ? (
            <span className="text-xs italic text-gray-500">Needs another user to verify</span>
          ) : (
            <div className="flex gap-2">
              <Button variant="primary" size="small" onClick={() => setDecision({ agreement: a, action: "verify" })}>
                Verify
              </Button>
              <Button variant="outline" size="small" onClick={() => setDecision({ agreement: a, action: "reject" })}>
                Reject
              </Button>
            </div>
          )
        ) : (
          "—"
        ),
    };
  });

  const rejecting = decision?.action === "reject";
  const remarksInvalid = rejecting && remarks.trim().length < 5;

  return (
    <PageCard>
      <PageCardContent>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <FileSignature size={16} /> Agreements & contracts
            </h3>
            <p className="text-xs text-gray-500">
              A verified agreement valid on the invoice date is the authoritative source of payment terms for
              non-PO invoices.
            </p>
          </div>
          {canUploadAgreements && (
            <Button variant="primary" size="small" onClick={() => setUploadOpen(true)}>
              <Upload size={14} /> Upload agreement
            </Button>
          )}
        </div>

        {isError ? (
          <p className="text-sm text-rose-600">{getApiErrorMessage(error, "Could not load agreements.")}</p>
        ) : !isLoading && agreements.length === 0 ? (
          <p className="text-sm italic text-gray-500">No agreements uploaded for this vendor yet.</p>
        ) : (
          <GenericTable headers={HEADERS} columns={COLUMNS} rows={rows} loading={isLoading} />
        )}
      </PageCardContent>

      <AgreementUploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} vendorId={vendorId} />

      <Modal
        isOpen={Boolean(decision)}
        onClose={closeDecision}
        title={rejecting ? "Reject agreement" : "Verify agreement"}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeDecision}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={submitDecision}
              loading={verify.isPending || reject.isPending}
              disabled={remarksInvalid}
            >
              {rejecting ? "Reject" : "Verify"}
            </Button>
          </div>
        }
      >
        {decision && (
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              <span className="font-semibold">{decision.agreement.title}</span> —{" "}
              {decision.agreement.term_days != null ? `${decision.agreement.term_days} days` : "no term days"}, valid{" "}
              {formatDate(decision.agreement.valid_from)} –{" "}
              {decision.agreement.valid_to ? formatDate(decision.agreement.valid_to) : "open-ended"}.
            </p>
            {!rejecting && (
              <p className="text-xs text-gray-500">
                Check the values against the document before verifying. Verifying makes this agreement the
                payment-term reference for this vendor's non-PO invoices and supersedes any earlier active
                agreement of the same type.
              </p>
            )}
            <FormTextArea
              label={rejecting ? "Reason (required)" : "Remarks"}
              name="decisionRemarks"
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>
        )}
      </Modal>
    </PageCard>
  );
}
