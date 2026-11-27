import { useRef, useState } from "react";
import { toast } from "react-toastify";
import { AlertTriangle, Download, FileText, History, RefreshCw } from "lucide-react";

import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import FormTextArea from "../../../../components/forms/FormTextArea";
import FileUpload from "../../../../components/forms/FileUpload";
import Modal from "../../../../components/Modal/modal";
import StatusPill from "../../vendor-intake/components/PreScreenStatusBadge";

import { getApiErrorMessage } from "../../utils/apiError";
import { formatDate } from "../../utils/formatters";
import { formatFileSize } from "../../utils/documentUpload";
import { useApPermissions } from "../../hooks/useApPermissions";

import ndaService from "../services/ndaService";
import { useReplaceNda, useUpdateNdaStatus, useVendorNdaHistory } from "../hooks/useNda";
import {
  NDA_STATUS,
  NDA_STATUS_LABEL,
  NDA_STATUS_TONE,
  NDA_TRANSITION_ACTION_LABEL,
  NDA_VERIFICATION_TARGETS,
  SIGNED_NDA_ACCEPT,
  ndaReplaceErrorMessage,
  validateNdaPdfFile,
} from "../constants/vendorOnboarding";
import {
  canVerifyNdaRecord,
  ndaDocumentNameOf,
  ndaScopeLabelOf,
  ndaUploadedAtOf,
  ndaVersionOf,
  normalizeNdaHistory,
} from "../utils/ndaHistory";

const REPLACE_SUBJECT = "replacement NDA";

const documentNameFor = (record) => ndaDocumentNameOf(record) || `NDA #${record.nda_id}`;

const versionLabelFor = (record) => {
  const version = ndaVersionOf(record);
  return version !== null && version !== undefined ? `v${version}` : null;
};

const StatusBadge = ({ statusCode }) =>
  statusCode ? (
    <StatusPill
      label={NDA_STATUS_LABEL[statusCode] || statusCode}
      tone={NDA_STATUS_TONE[statusCode] || "neutral"}
    />
  ) : null;

const SectionTitle = ({ children }) => (
  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
    {children}
  </p>
);

/** Name, version, status, upload date and scope — shared by the active card and history rows. */
const RecordSummary = ({ record, tags }) => {
  const scope = ndaScopeLabelOf(record);
  return (
    <div className="min-w-0">
      <p className="flex items-start gap-1.5 break-words text-xs font-medium text-gray-900">
        <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
        <span className="min-w-0">{documentNameFor(record)}</span>
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        {versionLabelFor(record) && (
          <span className="text-[11px] font-semibold text-gray-700">{versionLabelFor(record)}</span>
        )}
        <StatusBadge statusCode={record.status_code} />
        {tags}
      </div>
      <p className="mt-1 text-[11px] text-gray-500">
        Uploaded {formatDate(ndaUploadedAtOf(record))}
        {scope ? ` · ${scope}` : ""}
      </p>
    </div>
  );
};

/**
 * Active NDA, replacement and version history for one vendor (Manage NDA).
 *
 * Reads GET /apm/nda/vendor/{id}/history, which spans every department/category scope, so a
 * vendor can have several active NDAs at once. Each active record is replaced on its own —
 * the request names that record's nda_id, so an NDA belonging to another scope is never
 * touched. Replaced versions stay listed but are read-only: they can be downloaded, not
 * replaced or verified.
 *
 * Status and RFQ eligibility are never inferred here. A successful upload does not complete
 * anything; the new version shows whatever status the backend gives it (Pending), and the
 * invalidated eligibility queries re-ask the backend whether the vendor may take part.
 *
 * @param {{ vendorId:number, prId?:number, requestId?:number, currentNdaId?:number|null }} props
 *   `currentNdaId` is the NDA the open engagement is running on, flagged in the active list.
 */
export default function NdaHistoryPanel({ vendorId, prId, requestId, currentNdaId }) {
  const { canViewNda, canGenerateNda, canSendNda } = useApPermissions();

  const [replaceTarget, setReplaceTarget] = useState(null);
  const [replaceFile, setReplaceFile] = useState(null);
  const [replaceReason, setReplaceReason] = useState("");
  // Kept apart so a failed upload can be retried with the same file, while an invalid file
  // blocks submission until another one is chosen.
  const [fileError, setFileError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [verifyModal, setVerifyModal] = useState(null); // { record, statusCode }
  const [verifyReason, setVerifyReason] = useState("");

  const [downloadingId, setDownloadingId] = useState(null);

  // The disabled button alone does not stop a second click that lands before the re-render.
  const replaceInFlight = useRef(false);

  const {
    data,
    isLoading,
    isError,
    error,
  } = useVendorNdaHistory(vendorId, { enabled: canViewNda && Boolean(vendorId) });

  const replaceMutation = useReplaceNda({ prId, requestId });
  const statusMutation = useUpdateNdaStatus({ prId, requestId });

  if (!canViewNda) return null;

  const { active, history } = normalizeNdaHistory(data);
  const isReplacing = replaceMutation.isPending;
  const replaceError = fileError || submitError;

  const openReplace = (record) => {
    setReplaceTarget(record);
    setReplaceFile(null);
    setReplaceReason("");
    setFileError("");
    setSubmitError("");
    setUploadProgress(0);
  };

  const closeReplace = () => {
    if (isReplacing) return;
    setReplaceTarget(null);
    setConfirmOpen(false);
    setReplaceFile(null);
    setReplaceReason("");
    setFileError("");
    setSubmitError("");
    setUploadProgress(0);
  };

  const handleSelectFile = (event) => {
    const file = event.target.files?.[0] || null;
    setReplaceFile(file);
    setFileError(file ? validateNdaPdfFile(file, REPLACE_SUBJECT) : "");
    setSubmitError("");
  };

  const handleRequestReplace = () => {
    const validationError = validateNdaPdfFile(replaceFile, REPLACE_SUBJECT);
    if (validationError) {
      setFileError(validationError);
      return;
    }
    setConfirmOpen(true);
  };

  const handleReplace = async () => {
    if (!replaceTarget || isReplacing || replaceInFlight.current) return;

    const validationError = validateNdaPdfFile(replaceFile, REPLACE_SUBJECT);
    if (validationError) {
      setConfirmOpen(false);
      setFileError(validationError);
      return;
    }

    replaceInFlight.current = true;
    setConfirmOpen(false);
    setSubmitError("");
    setUploadProgress(0);

    try {
      const result = await replaceMutation.mutateAsync({
        vendorId,
        file: replaceFile,
        // The exact record being replaced — never a scope guess that could hit another NDA.
        ndaId: replaceTarget.nda_id,
        reason: replaceReason.trim() || undefined,
        onUploadProgress: setUploadProgress,
      });

      toast.success(
        result?.message || "NDA replaced. The new version is pending verification.",
      );
      closeReplace();
    } catch (err) {
      // The file and reason stay selected so the user can retry without starting over.
      const message = ndaReplaceErrorMessage(err);
      setSubmitError(message);
      setUploadProgress(0);
      toast.error(message);
    } finally {
      replaceInFlight.current = false;
    }
  };

  const handleDownload = async (record) => {
    if (downloadingId) return;
    setDownloadingId(record.nda_id);
    try {
      // A fresh short-lived URL on every click, so an expired link is never reused.
      const result = await ndaService.getNdaDocumentUrl(record.nda_id, { signed: false });
      if (!result?.url) throw new Error("The NDA document link is unavailable.");
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not open the NDA document."));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleVerify = async () => {
    if (!verifyModal || statusMutation.isPending) return;
    try {
      await statusMutation.mutateAsync({
        ndaId: verifyModal.record.nda_id,
        statusCode: verifyModal.statusCode,
        reason: verifyReason.trim() || undefined,
      });
      toast.success(`NDA marked ${NDA_STATUS_LABEL[verifyModal.statusCode]}.`);
      setVerifyModal(null);
      setVerifyReason("");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not update the NDA status."));
    }
  };

  const isRejecting = verifyModal?.statusCode === NDA_STATUS.REJECTED;

  const downloadButton = (record, label) => (
    <Button
      variant="outline"
      size="small"
      onClick={() => handleDownload(record)}
      loading={downloadingId === record.nda_id}
      loadingText="Opening..."
      disabled={Boolean(downloadingId) && downloadingId !== record.nda_id}
      aria-label={`${label} ${documentNameFor(record)}`}
    >
      <Download className="h-3.5 w-3.5" /> {label}
    </Button>
  );

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-[#0A0082]" />
        <h3 className="text-sm font-semibold text-gray-900">NDA Documents</h3>
      </div>

      {isLoading && <LoadingSpinner text="Loading NDA history..." />}

      {isError && !isLoading && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{getApiErrorMessage(error, "Could not load the NDA history.")}</span>
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <section>
            <SectionTitle>Active NDA Document</SectionTitle>
            {active.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
                No NDA available for this vendor yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {active.map((record) => (
                  <li
                    key={record.nda_id}
                    className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-2.5"
                  >
                    <RecordSummary
                      record={record}
                      tags={
                        String(record.nda_id) === String(currentNdaId ?? "") ? (
                          <StatusPill label="This Engagement" tone="info" />
                        ) : null
                      }
                    />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {downloadButton(record, "View / Download")}

                      {canGenerateNda && (
                        <Button
                          variant="primary"
                          size="small"
                          onClick={() => openReplace(record)}
                          disabled={isReplacing}
                        >
                          <RefreshCw className="h-3.5 w-3.5" /> Replace NDA
                        </Button>
                      )}

                      {canSendNda &&
                        canVerifyNdaRecord(record) &&
                        NDA_VERIFICATION_TARGETS.map((target) => (
                          <Button
                            key={target}
                            variant={target === NDA_STATUS.COMPLETED ? "success" : "outline"}
                            size="small"
                            onClick={() => {
                              setVerifyReason("");
                              setVerifyModal({ record, statusCode: target });
                            }}
                          >
                            {NDA_TRANSITION_ACTION_LABEL[target]}
                          </Button>
                        ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <SectionTitle>NDA Document History</SectionTitle>
            {history.length === 0 ? (
              <p className="text-xs text-gray-500">No NDA versions on file.</p>
            ) : (
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                {history.map((record) => (
                  <li
                    key={record.nda_id}
                    className={`flex flex-col gap-2 p-2.5 ${record.is_active ? "" : "bg-gray-50"}`}
                  >
                    <RecordSummary
                      record={record}
                      tags={
                        <StatusPill
                          label={record.is_active ? "Active" : "Inactive"}
                          tone={record.is_active ? "success" : "neutral"}
                        />
                      }
                    />
                    {/* Historical versions are read-only: download only. */}
                    <div>{downloadButton(record, "Download")}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {/* Replace NDA Document */}
      <Modal
        isOpen={Boolean(replaceTarget)}
        onClose={closeReplace}
        title="Replace NDA Document"
        subtitle="Upload the new NDA. It is added as a new version and starts out Pending."
        size="md"
        zIndex="z-[10000]"
        closeOnBackdrop={false}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={closeReplace}
              disabled={isReplacing}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleRequestReplace}
              loading={isReplacing}
              loadingText="Uploading..."
              disabled={!replaceFile || Boolean(fileError) || isReplacing}
              className="w-full sm:w-auto"
            >
              Replace NDA
            </Button>
          </div>
        }
      >
        {replaceTarget && (
          <div className="space-y-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5">
              <SectionTitle>Current NDA</SectionTitle>
              <RecordSummary record={replaceTarget} />
            </div>

            <FileUpload
              label="New NDA (PDF)"
              name="replacement_nda_file"
              accept={SIGNED_NDA_ACCEPT}
              onChange={handleSelectFile}
              disabled={isReplacing}
            />

            {replaceFile && (
              <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                <span className="font-medium text-gray-900">{replaceFile.name}</span>
                <span className="ml-2 text-gray-500">{formatFileSize(replaceFile.size)}</span>
              </p>
            )}

            <FormTextArea
              label="Reason (optional)"
              name="nda_replace_reason"
              value={replaceReason}
              onChange={(e) => setReplaceReason(e.target.value)}
              placeholder="Why is this NDA being replaced? Recorded against the NDA history."
              rows={2}
              disabled={isReplacing}
            />

            {isReplacing && (
              <div>
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100"
                  role="progressbar"
                  aria-valuenow={uploadProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Upload progress"
                >
                  <div
                    className="h-full rounded-full bg-[#0A0082] transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-gray-500">Uploading… {uploadProgress}%</p>
              </div>
            )}

            {replaceError && (
              <p className="flex items-start gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{replaceError}</span>
              </p>
            )}

            <p className="text-xs text-gray-500">
              PDF only, up to 25MB. The new NDA must still be verified before it counts; RFQ
              eligibility is re-checked once the upload completes.
            </p>
          </div>
        )}
      </Modal>

      {/* Replace Existing NDA? */}
      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Replace Existing NDA?"
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
              onClick={handleReplace}
              disabled={isReplacing}
              className="w-full sm:w-auto"
            >
              Replace NDA
            </Button>
          </div>
        }
      >
        <p className="text-sm text-gray-700">
          A previous NDA document already exists for this vendor. Uploading a new NDA will
          create a new document version. The previous NDA will remain available in the
          document history.
        </p>
      </Modal>

      {/* Verification: Accept & Complete / Reject */}
      <Modal
        isOpen={Boolean(verifyModal)}
        onClose={() => setVerifyModal(null)}
        title={verifyModal ? NDA_TRANSITION_ACTION_LABEL[verifyModal.statusCode] : ""}
        size="sm"
        zIndex="z-[10000]"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setVerifyModal(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleVerify}
              loading={statusMutation.isPending}
              loadingText="Saving..."
              disabled={isRejecting && !verifyReason.trim()}
            >
              Confirm
            </Button>
          </div>
        }
      >
        <FormTextArea
          label={isRejecting ? "Rejection Reason *" : "Reason (optional)"}
          name="nda_verify_reason"
          value={verifyReason}
          onChange={(e) => setVerifyReason(e.target.value)}
          placeholder={
            isRejecting
              ? "Why is this NDA being rejected?"
              : "Recorded against the NDA history."
          }
          rows={3}
        />
      </Modal>
    </div>
  );
}
