import { useState } from "react";
import { toast } from "react-toastify";
import { AlertTriangle, CheckCircle2, ExternalLink, FileSignature, Send, Upload } from "lucide-react";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import FormTextArea from "../../../../components/forms/FormTextArea";
import FileUpload from "../../../../components/forms/FileUpload";
import Modal from "../../../../components/Modal/modal";
import StatusPill from "../../vendor-intake/components/PreScreenStatusBadge";
import ExistingNdaReusePanel from "./ExistingNdaReusePanel";
import GenerateNdaModal from "./GenerateNdaModal";
import SendNdaConfirmModal from "./SendNdaConfirmModal";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatDate } from "../../utils/formatters";
import { useApPermissions } from "../../hooks/useApPermissions";
import ndaService from "../services/ndaService";
import {
  useVendorNda,
  useGenerateNda,
  useSendNda,
  useUpdateNdaStatus,
  useUploadSignedNda,
} from "../hooks/useNda";
import {
  NDA_LOOKUP_OUTCOME,
  NDA_MANUAL_TRANSITIONS,
  NDA_STATUS,
  NDA_STATUS_LABEL,
  NDA_STATUS_TONE,
  NDA_TRANSITION_ACTION_LABEL,
  SIGNED_NDA_ACCEPT,
  isReusableNda,
  canUploadSignedNdaFor,
  humanizeCode,
  validateSignedNdaFile,
} from "../constants/vendorOnboarding";
import { formatFileSize } from "../../utils/documentUpload";

const LOOKUP_MESSAGE = {
  [NDA_LOOKUP_OUTCOME.VALID]: "A valid NDA already exists for this vendor and scope — it will be reused.",
  [NDA_LOOKUP_OUTCOME.NOT_FOUND]: "No NDA exists for this vendor and scope yet.",
  [NDA_LOOKUP_OUTCOME.INVALID]: "An NDA exists but is not usable for this scope.",
  [NDA_LOOKUP_OUTCOME.EXPIRED]: "The existing NDA has expired.",
};

const LOOKUP_TONE = {
  [NDA_LOOKUP_OUTCOME.VALID]: "success",
  [NDA_LOOKUP_OUTCOME.NOT_FOUND]: "neutral",
  [NDA_LOOKUP_OUTCOME.INVALID]: "danger",
  [NDA_LOOKUP_OUTCOME.EXPIRED]: "danger",
};

/**
 * One metadata cell: label above value.
 *
 * Label and value used to sit on one line pushed apart, which made a long recipient email
 * collide with the label beside it and overflow the card. Stacking them gives the value the
 * full cell width, and `break-words` wraps a long address inside its own cell rather than
 * widening the grid.
 */
const Row = ({ label, value }) => (
  <div className="min-w-0 border-b border-gray-100 py-1.5 last:border-0">
    <dt className="text-[11px] uppercase tracking-wide text-gray-500">{label}</dt>
    <dd className="mt-0.5 break-words text-xs font-medium text-gray-900">
      {value === null || value === undefined || value === "" ? "—" : value}
    </dd>
  </div>
);

/**
 * NDA lifecycle for one vendor + department/category scope (Stage 2 APIs).
 *
 * Every decision here is the backend's: whether an NDA is required at all comes from the
 * engagement's recorded requirement (`ndaRequired`, passed in from the Pre-Screen result),
 * whether an existing NDA may be reused comes from the GET /apm/nda/vendor/{id} `outcome`,
 * and which transitions are legal is re-validated on PATCH. This component renders that
 * state and offers Generate / Send / record-status.
 *
 * Generate and Send can be suppressed (`showGenerate` / `showSend`) when the panel is
 * embedded in the NDA editor, which owns those two actions from its own footer so they are
 * not offered twice. Both default to true, so the panel on its own is unchanged.
 *
 * @param {{ vendorId:number, departmentId:number, purchaseCategoryId:number, prId?:number,
 *   requestId?:number, ndaRequired:boolean|null, recipientEmail?:string|null,
 *   vendorName?:string, vendorCode?:string|null, prNumber?:string, departmentName?:string,
 *   categoryName?:string, businessRequirement?:string|null, showGenerate?:boolean,
 *   showSend?:boolean, onNdaGenerated?:(result:object)=>void }} props
 */
export default function NdaPanel({
  vendorId,
  departmentId,
  purchaseCategoryId,
  prId,
  requestId,
  ndaRequired,
  recipientEmail,
  vendorName,
  vendorCode,
  prNumber,
  departmentName,
  categoryName,
  businessRequirement,
  showGenerate = true,
  showSend = true,
  onNdaGenerated,
}) {
  const { canViewNda, canGenerateNda, canSendNda, canUploadSignedNda } = useApPermissions();

  const [statusModal, setStatusModal] = useState(null); // { statusCode }
  const [statusReason, setStatusReason] = useState("");
  const [documentLoading, setDocumentLoading] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [signedFile, setSignedFile] = useState(null);
  const [uploadError, setUploadError] = useState("");

  const [generateOpen, setGenerateOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

  const {
    data: lookup,
    isLoading: lookupLoading,
    isError: lookupError,
    error: lookupErrorObj,
  } = useVendorNda(vendorId, {
    departmentId,
    purchaseCategoryId,
    enabled: canViewNda && Boolean(vendorId),
  });

  const generateMutation = useGenerateNda({ prId, requestId });
  const sendMutation = useSendNda({ prId, requestId });
  const statusMutation = useUpdateNdaStatus({ prId, requestId });
  const uploadMutation = useUploadSignedNda({ prId, requestId });

  if (!canViewNda) return null;

  const nda = lookup?.nda || null;
  const statusCode = nda?.status_code || null;
  const outcome = lookup?.outcome || null;

  // ndaRequired === false is a real answer from the backend (NDA not required for this
  // department/category), distinct from null which means Pre-Screen hasn't decided yet.
  if (ndaRequired === false) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-emerald-800">NDA Not Required</p>
              <StatusPill label={NDA_STATUS_LABEL[NDA_STATUS.NOT_REQUIRED]} tone="success" />
            </div>
            <p className="mt-1 text-xs text-emerald-700">
              The screening rules for this department and purchase category don't require an NDA.
              Onboarding can be completed and the vendor becomes available for RFQ.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (ndaRequired === null || ndaRequired === undefined) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500 shadow-sm">
        Run Pre-Screen to find out whether an NDA is required for this engagement.
      </div>
    );
  }

  const handleGenerate = async () => {
    try {
      const result = await generateMutation.mutateAsync({
        vendor_id: Number(vendorId),
        pr_id: prId ? Number(prId) : null,
        department_id: departmentId ? Number(departmentId) : null,
        purchase_category_id: purchaseCategoryId ? Number(purchaseCategoryId) : null,
        recipient_email: recipientEmail || null,
      });

      toast.success(
        result?.reused
          ? "Existing valid NDA reused for this engagement."
          : result?.message || "NDA generated.",
      );
      setGenerateOpen(false);
      onNdaGenerated?.(result);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not generate the NDA."));
    }
  };

  const handleSend = async () => {
    try {
      const result = await sendMutation.mutateAsync(nda.nda_id);

      // A delivery failure comes back as a 200 with sent:false — not an HTTP error.
      if (result?.sent === false) {
        toast.error(result.error || "The NDA could not be delivered.");
        return;
      }
      toast.success(result?.message || `NDA sent to ${result?.recipient_email || "the vendor"}.`);
      setSendOpen(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not send the NDA."));
    }
  };

  const handleStatusUpdate = async () => {
    try {
      await statusMutation.mutateAsync({
        ndaId: nda.nda_id,
        statusCode: statusModal.statusCode,
        reason: statusReason.trim() || undefined,
      });
      toast.success(`NDA marked ${humanizeCode(statusModal.statusCode)}.`);
      setStatusModal(null);
      setStatusReason("");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not update the NDA status."));
    }
  };

  const handleSelectSignedFile = (event) => {
    const file = event.target.files?.[0] || null;
    setSignedFile(file);
    setUploadError(file ? validateSignedNdaFile(file) : "");
  };

  const closeUpload = () => {
    setUploadOpen(false);
    setSignedFile(null);
    setUploadError("");
  };

  const handleUploadSigned = async () => {
    // Guard against a double submit as well as disabling the button.
    if (uploadMutation.isPending) return;

    const validationError = validateSignedNdaFile(signedFile);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setUploadError("");

    try {
      const result = await uploadMutation.mutateAsync({ ndaId: nda.nda_id, file: signedFile });
      // The resulting status is whatever the backend set — nothing is assumed here.
      toast.success(result?.message || "Signed NDA uploaded successfully; pending internal review");
      closeUpload();
    } catch (err) {
      // A failed upload leaves the NDA untouched server-side; keep the modal open with the
      // backend's reason (415 non-PDF, 400 empty/oversized, 422 wrong state, 502 S3, 403...).
      const message = getApiErrorMessage(err, "Could not upload the signed NDA.");
      setUploadError(message);
      toast.error(message);
    }
  };

  const handleOpenDocument = async (signed = false) => {
    setDocumentLoading(true);
    try {
      const result = await ndaService.getNdaDocumentUrl(nda.nda_id, { signed });
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not open the NDA document."));
    } finally {
      setDocumentLoading(false);
    }
  };

  // Agreements already on file for this vendor that a new engagement could run on. Offered
  // only while this scope has no usable NDA of its own — once one exists, the lifecycle below
  // is what matters.
  const reusableNdas = (lookup?.ndas || []).filter(
    (candidate) => isReusableNda(candidate) && String(candidate.nda_id) !== String(nda?.nda_id ?? ""),
  );

  const showReuseOffer = !nda && reusableNdas.length > 0 && canGenerateNda;

  const allowedTransitions = NDA_MANUAL_TRANSITIONS[statusCode] || [];
  const isRejecting = statusModal?.statusCode === NDA_STATUS.REJECTED;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileSignature className="h-4 w-4 text-[#0A0082]" />
          <h3 className="text-sm font-semibold text-gray-900">NDA</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill label="NDA Required" tone="warning" />
          {statusCode && (
            <StatusPill
              label={NDA_STATUS_LABEL[statusCode] || statusCode}
              tone={NDA_STATUS_TONE[statusCode] || "neutral"}
              size="md"
            />
          )}
        </div>
      </div>

      {lookupLoading && <LoadingSpinner text="Checking for an existing NDA..." />}

      {lookupError && !lookupLoading && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{getApiErrorMessage(lookupErrorObj, "Could not check for an existing NDA.")}</span>
        </div>
      )}

      {/* Existing-NDA lookup outcome — the backend's reuse decision. */}
      {outcome && !lookupLoading && (
        <p
          className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
            LOOKUP_TONE[outcome] === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : LOOKUP_TONE[outcome] === "danger"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-gray-200 bg-gray-50 text-gray-600"
          }`}
        >
          <span className="font-semibold">{humanizeCode(outcome)}: </span>
          {lookup?.reason || LOOKUP_MESSAGE[outcome] || ""}
        </p>
      )}

      {nda && (
        <dl className="mt-3 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          <Row label="NDA" value={`#${nda.nda_id}`} />
          <Row label="Status" value={NDA_STATUS_LABEL[statusCode] || statusCode} />
          <Row label="Recipient" value={nda.recipient_email} />
          <Row label="Template Version" value={nda.template_version} />
          <Row label="Valid From" value={nda.valid_from ? formatDate(nda.valid_from) : "—"} />
          <Row label="Valid Until" value={nda.valid_until ? formatDate(nda.valid_until) : "—"} />
          <Row label="Sent" value={nda.sent_at ? formatDate(nda.sent_at) : "—"} />
          <Row label="Completed" value={nda.completed_at ? formatDate(nda.completed_at) : "—"} />
        </dl>
      )}

      {showReuseOffer && (
        <div className="mt-3">
          <ExistingNdaReusePanel
            ndas={reusableNdas}
            currentNdaId={nda?.nda_id}
            onReuse={handleGenerate}
            onGenerateNew={() => setGenerateOpen(true)}
            isReusing={generateMutation.isPending}
            canGenerate={canGenerateNda}
          />
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
        {/* An EXPIRED NDA can no longer be acted on — the way forward is a fresh one. */}
        {showGenerate && canGenerateNda && !showReuseOffer && (!nda || statusCode === NDA_STATUS.EXPIRED) && (
          <Button
            variant="primary"
            size="small"
            onClick={() => setGenerateOpen(true)}
            loading={generateMutation.isPending}
            loadingText="Generating..."
          >
            {statusCode === NDA_STATUS.EXPIRED ? "Generate New NDA" : "Generate NDA"}
          </Button>
        )}

        {showSend && nda && canSendNda && statusCode === NDA_STATUS.PENDING && (
          <Button
            variant="primary"
            size="small"
            onClick={() => setSendOpen(true)}
            loading={sendMutation.isPending}
            loadingText="Sending..."
          >
            <Send className="h-3.5 w-3.5" /> Send NDA
          </Button>
        )}

        {nda?.document_key && (
          <Button
            variant="outline"
            size="small"
            onClick={() => handleOpenDocument(false)}
            loading={documentLoading}
            loadingText="Opening..."
          >
            <ExternalLink className="h-3.5 w-3.5" /> View NDA
          </Button>
        )}

        {/* The vendor signs outside the system; this is where the signed copy comes back in.
            Allowed from SENT / SIGNED / REJECTED - the backend enforces the same set. */}
        {nda && canUploadSignedNda && canUploadSignedNdaFor(statusCode) && (
          <Button
            variant={statusCode === NDA_STATUS.SIGNED ? "outline" : "primary"}
            size="small"
            onClick={() => {
              setSignedFile(null);
              setUploadError("");
              setUploadOpen(true);
            }}
          >
            <Upload className="h-3.5 w-3.5" />{" "}
            {statusCode === NDA_STATUS.REJECTED
              ? "Upload Corrected Signed NDA"
              : statusCode === NDA_STATUS.SIGNED
                ? "Replace Signed NDA"
                : "Upload Signed NDA"}
          </Button>
        )}

        {nda?.signed_document_key && (
          <Button
            variant="outline"
            size="small"
            onClick={() => handleOpenDocument(true)}
            loading={documentLoading}
            loadingText="Opening..."
          >
            <ExternalLink className="h-3.5 w-3.5" /> View Signed NDA
          </Button>
        )}

        {/* Internal review of a received signed document: Accept & Complete, or Reject. */}
        {nda &&
          canSendNda &&
          allowedTransitions.map((target) => (
            <Button
              key={target}
              variant={
                statusCode === NDA_STATUS.SIGNED && target === NDA_STATUS.COMPLETED
                  ? "success"
                  : "outline"
              }
              size="small"
              onClick={() => {
                setStatusReason("");
                setStatusModal({ statusCode: target });
              }}
            >
              {NDA_TRANSITION_ACTION_LABEL[target] || `Mark ${NDA_STATUS_LABEL[target] || target}`}
            </Button>
          ))}
      </div>

      <GenerateNdaModal
        isOpen={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onConfirm={handleGenerate}
        isGenerating={generateMutation.isPending}
        isRegenerate={statusCode === NDA_STATUS.EXPIRED}
        vendorName={vendorName}
        vendorEmail={recipientEmail}
        vendorCode={vendorCode}
        prNumber={prNumber}
        departmentName={departmentName}
        categoryName={categoryName}
        businessRequirement={businessRequirement}
        templateVersion={nda?.template_version}
        lookupOutcome={outcome}
      />

      {nda && (
        <SendNdaConfirmModal
          isOpen={sendOpen}
          onClose={() => setSendOpen(false)}
          onConfirm={handleSend}
          isSending={sendMutation.isPending}
          vendorName={vendorName}
          recipientEmail={nda.recipient_email || recipientEmail}
          prNumber={prNumber}
          ndaId={nda.nda_id}
          templateVersion={nda.template_version}
          documentKey={nda.document_key}
        />
      )}

      <Modal
        isOpen={Boolean(statusModal)}
        onClose={() => setStatusModal(null)}
        title={
          statusModal
            ? NDA_TRANSITION_ACTION_LABEL[statusModal.statusCode] ||
              `Mark NDA ${NDA_STATUS_LABEL[statusModal.statusCode]}`
            : ""
        }
        size="sm"
        zIndex="z-[10000]"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStatusModal(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleStatusUpdate}
              loading={statusMutation.isPending}
              loadingText="Saving..."
              disabled={isRejecting && !statusReason.trim()}
            >
              Confirm
            </Button>
          </div>
        }
      >
        <FormTextArea
          // The backend accepts an optional reason; a rejection without one tells the vendor
          // nothing, so the UI insists on it here.
          label={isRejecting ? "Rejection Reason *" : "Reason (optional)"}
          name="nda_status_reason"
          value={statusReason}
          onChange={(e) => setStatusReason(e.target.value)}
          placeholder={
            isRejecting
              ? "Why is the signed NDA being rejected? The vendor needs this to resubmit."
              : "Recorded against the NDA history."
          }
          rows={3}
        />
      </Modal>

      {/* Signed NDA upload */}
      <Modal
        isOpen={uploadOpen}
        onClose={closeUpload}
        title="Upload Signed NDA"
        subtitle="Attach the PDF the vendor signed. The NDA moves to Signed, pending internal review."
        size="sm"
        zIndex="z-[10000]"
        closeOnBackdrop={false}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={closeUpload}
              disabled={uploadMutation.isPending}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleUploadSigned}
              loading={uploadMutation.isPending}
              loadingText="Uploading..."
              disabled={!signedFile || Boolean(uploadError) || uploadMutation.isPending}
              className="w-full sm:w-auto"
            >
              Upload Signed NDA
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <FileUpload
            label="Signed NDA (PDF)"
            name="signed_nda_file"
            accept={SIGNED_NDA_ACCEPT}
            onChange={handleSelectSignedFile}
            disabled={uploadMutation.isPending}
          />

          {signedFile && (
            <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
              <span className="font-medium text-gray-900">{signedFile.name}</span>
              <span className="ml-2 text-gray-500">{formatFileSize(signedFile.size)}</span>
            </p>
          )}

          {uploadError && (
            <p className="flex items-start gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{uploadError}</span>
            </p>
          )}

          <p className="text-xs text-gray-500">
            PDF only, up to 25MB. Uploading does not complete the NDA - it stays blocked for RFQ
            until it is reviewed and accepted.
          </p>
        </div>
      </Modal>
    </div>
  );
}
