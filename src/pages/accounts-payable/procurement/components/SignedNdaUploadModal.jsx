import { useRef, useState } from "react";
import { toast } from "react-toastify";
import { AlertTriangle, FileText } from "lucide-react";

import Button from "../../../../components/Button/Button";
import FormTextArea from "../../../../components/forms/FormTextArea";
import FileUpload from "../../../../components/forms/FileUpload";
import Modal from "../../../../components/Modal/modal";
import StatusPill from "../../vendor-intake/components/PreScreenStatusBadge";

import { getApiErrorMessage } from "../../utils/apiError";
import { formatFileSize } from "../../utils/documentUpload";
import {
  NDA_REPLACE_REASON_MAX_LENGTH,
  NDA_STATUS_LABEL,
  NDA_STATUS_TONE,
  SIGNED_NDA_ACCEPT,
  ndaReplaceErrorMessage,
  signedNdaDocumentNameOf,
  signedNdaVersionLabel,
  validateNdaPdfFile,
  validateSignedNdaFile,
} from "../constants/vendorOnboarding";

const COPY = {
  upload: {
    title: "Upload Signed NDA",
    subtitle: "Attach the PDF the vendor signed. The NDA moves to Signed, pending internal review.",
    fileLabel: "Signed NDA (PDF)",
    fileName: "signed_nda_file",
    submit: "Upload Signed NDA",
    note:
      "PDF only, up to 25MB. Uploading does not complete the NDA - it stays blocked for RFQ until it is reviewed and accepted.",
    success: "Signed NDA uploaded successfully; pending internal review",
    failure: "Could not upload the signed NDA.",
  },
  replace: {
    title: "Replace Signed NDA",
    subtitle:
      "The new document becomes the latest version and the NDA goes back to internal review.",
    fileLabel: "Upload New NDA Document",
    fileName: "replacement_document",
    submit: "Replace",
    note:
      "PDF only, up to 25MB. The previous version is kept. The NDA returns to Signed — Pending Review and must be accepted again before it counts for RFQ.",
    success: "Signed NDA replaced; pending internal review",
    failure: "Could not replace the signed NDA.",
  },
};

/**
 * The signed-NDA upload dialog, shared by the NDA lifecycle panel (RFQ > Invited Vendors >
 * Manage NDA) and Vendor Detail > NDA.
 *
 * `mode="upload"` is the first signed copy (POST /signed-document); `mode="replace"` swaps the
 * document already on file (PUT /signed-document) and adds the current-document summary, an
 * optional reason and a confirmation step. Either way the caller's `onSubmit` makes the call
 * and the resulting status and version are whatever the backend returns — nothing here
 * assumes them.
 *
 * Mount it only while open, so every opening starts with an empty form.
 *
 * @param {{ isOpen:boolean, onClose:()=>void, mode?:"upload"|"replace", nda?:object|null,
 *   onSubmit:(payload:{file:File, reason?:string})=>Promise<object>,
 *   isSubmitting?:boolean }} props
 */
export default function SignedNdaUploadModal({
  isOpen,
  onClose,
  mode = "upload",
  nda,
  onSubmit,
  isSubmitting = false,
}) {
  const isReplace = mode === "replace";
  const copy = COPY[isReplace ? "replace" : "upload"];
  const validate = (file) =>
    isReplace ? validateNdaPdfFile(file, "NDA document") : validateSignedNdaFile(file);

  const [file, setFile] = useState(null);
  const [reason, setReason] = useState("");
  // An invalid file blocks submission until another is chosen; a failed request does not, so
  // the same file can simply be retried.
  const [fileError, setFileError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Backs the disabled button against a second click that lands before the re-render.
  const inFlight = useRef(false);

  const reasonTooLong = reason.length > NDA_REPLACE_REASON_MAX_LENGTH;
  const error = fileError || submitError;
  const canSubmit = Boolean(file) && !fileError && !reasonTooLong && !isSubmitting;

  const handleClose = () => {
    if (isSubmitting || inFlight.current) return;
    onClose();
  };

  const handleSelectFile = (event) => {
    const selected = event.target.files?.[0] || null;
    setFile(selected);
    setFileError(selected ? validate(selected) : "");
    setSubmitError("");
  };

  const submit = async () => {
    if (isSubmitting || inFlight.current) return;

    const validationError = validate(file);
    if (validationError) {
      setConfirmOpen(false);
      setFileError(validationError);
      return;
    }

    inFlight.current = true;
    setConfirmOpen(false);
    setSubmitError("");

    try {
      const result = await onSubmit({
        file,
        reason: isReplace ? reason.trim() || undefined : undefined,
      });
      toast.success(result?.message || copy.success);
      onClose();
    } catch (err) {
      // Nothing changed server-side; keep the dialog and the chosen file, with the reason.
      const message = isReplace
        ? ndaReplaceErrorMessage(err, copy.failure)
        : getApiErrorMessage(err, copy.failure);
      setSubmitError(message);
      toast.error(message);
    } finally {
      inFlight.current = false;
    }
  };

  const handlePrimary = () => {
    if (!isReplace) {
      submit();
      return;
    }
    const validationError = validate(file);
    if (validationError) {
      setFileError(validationError);
      return;
    }
    setConfirmOpen(true);
  };

  const currentName = signedNdaDocumentNameOf(nda);
  const currentVersion = signedNdaVersionLabel(nda);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={copy.title}
      subtitle={copy.subtitle}
      size="sm"
      zIndex="z-[10000]"
      closeOnBackdrop={false}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handlePrimary}
            loading={isSubmitting}
            loadingText={isReplace ? "Replacing..." : "Uploading..."}
            disabled={!canSubmit}
            className="w-full sm:w-auto"
          >
            {copy.submit}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {isReplace && nda && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">Current Document</p>
            <p className="mt-1 flex items-start gap-1.5 break-words text-xs font-medium text-gray-900">
              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span className="min-w-0">
                {currentName || "Signed NDA"}
                {currentVersion ? ` · ${currentVersion}` : ""}
              </span>
            </p>
            {nda.status_code && (
              <div className="mt-1.5">
                <StatusPill
                  label={NDA_STATUS_LABEL[nda.status_code] || nda.status_code}
                  tone={NDA_STATUS_TONE[nda.status_code] || "neutral"}
                />
              </div>
            )}
          </div>
        )}

        <FileUpload
          label={copy.fileLabel}
          name={copy.fileName}
          accept={SIGNED_NDA_ACCEPT}
          onChange={handleSelectFile}
          disabled={isSubmitting}
          required={isReplace}
        />

        {file && (
          <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
            <span className="font-medium text-gray-900">{file.name}</span>
            <span className="ml-2 text-gray-500">{formatFileSize(file.size)}</span>
          </p>
        )}

        {isReplace && (
          <div>
            <FormTextArea
              label="Reason for Replacement"
              name="nda_replace_reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter the reason for replacing this NDA"
              rows={3}
              disabled={isSubmitting}
            />
            <p
              className={`mt-1 text-right text-[11px] ${
                reasonTooLong ? "text-rose-600" : "text-gray-400"
              }`}
            >
              {reason.length}/{NDA_REPLACE_REASON_MAX_LENGTH}
            </p>
            {reasonTooLong && (
              <p className="text-xs text-rose-600">
                The reason can be at most {NDA_REPLACE_REASON_MAX_LENGTH} characters.
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="flex items-start gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}

        <p className="text-xs text-gray-500">{copy.note}</p>
      </div>

      {isReplace && (
        <Modal
          isOpen={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          title="Confirm NDA Replacement"
          size="sm"
          zIndex="z-[10001]"
          footer={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setConfirmOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={submit}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                Replace
              </Button>
            </div>
          }
        >
          <p className="text-sm text-gray-700">
            Are you sure you want to replace the existing signed NDA? The new document will
            become the latest version, and the NDA will require internal review again.
          </p>
        </Modal>
      )}
    </Modal>
  );
}
