import { useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { AlertTriangle, Download, Eye, FileSignature, RotateCcw, Save, Send } from "lucide-react";

import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import StatusPill from "../../vendor-intake/components/PreScreenStatusBadge";

import NdaPanel from "./NdaPanel";
import NdaDocumentEditor from "./NdaDocumentEditor";
import SendNdaConfirmModal from "./SendNdaConfirmModal";

import { getApiErrorMessage } from "../../utils/apiError";
import { formatDate } from "../../utils/formatters";
import { useApPermissions } from "../../hooks/useApPermissions";
import useVendorDetail from "../../vendor/hooks/useVendorDetail";

import ndaService from "../services/ndaService";
import { useNdaDetail, useSendNda, useUpdateNdaContent, useVendorNda } from "../hooks/useNda";
import useNdaDraft from "../hooks/useNdaDraft";
import { buildNdaDocumentHtml } from "../utils/ndaDocument";
import {
  NDA_STATUS,
  NDA_STATUS_LABEL,
  NDA_STATUS_TONE,
} from "../constants/vendorOnboarding";

/** Only a not-yet-sent NDA is worth editing — after that the vendor holds the sent copy. */
const isEditableStatus = (statusCode) => statusCode === NDA_STATUS.PENDING;

const CONFLICT_MESSAGE =
  "This NDA was updated elsewhere. Reload the latest version before saving your changes.";

/**
 * The content version off an NDA record or a save response. The save request names the field
 * `version`; `content_version` is accepted too so the editor keeps working whichever of the
 * two the record is serialised with, rather than silently falling back to no version and
 * defeating the 409 check.
 */
const contentVersionOf = (payload) => payload?.version ?? payload?.content_version ?? null;

const SideRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-2 border-b border-gray-100 py-1.5 last:border-0">
    <dt className="shrink-0 text-[11px] text-gray-500">{label}</dt>
    <dd className="min-w-0 break-words text-right text-[11px] font-medium text-gray-900">
      {value || "—"}
    </dd>
  </div>
);

const SideSection = ({ title, children }) => (
  <div>
    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">{title}</p>
    <dl className="rounded-lg border border-gray-200 bg-white px-2.5 py-0.5">{children}</dl>
  </div>
);

/**
 * NDA workspace for one invited vendor, opened from the RFQ's Invited Vendors table and from
 * Invite Vendors.
 *
 * NDA execution belongs to the RFQ step, not Vendor Onboarding: onboarding decides *whether*
 * an NDA is required, and the RFQ is where it is generated, edited, sent, signed and reviewed.
 *
 * Layout is the document on the left and the context/lifecycle rail on the right. The rail
 * embeds the existing NdaPanel so upload, internal review and the status vocabulary all stay
 * in one place — this component adds the editable document and the pre-send actions
 * (Save Draft / Preview / Download / Send), and suppresses NdaPanel's own Generate and Send
 * buttons so neither is offered twice.
 *
 * Every NDA here is keyed to one vendor: the lookup, the draft and the send all carry this
 * vendor's nda_id, so nothing crosses between vendor rows.
 *
 * @param {{ isOpen:boolean, onClose:()=>void, vendorId:number, vendorName?:string,
 *   prId:number, prNumber?:string, prDate?:string, departmentId:number,
 *   purchaseCategoryId:number, departmentName?:string, categoryName?:string,
 *   businessRequirement?:string|null, ndaRequired:boolean|null,
 *   recipientEmail?:string|null, vendorCode?:string|null }} props
 */
export default function VendorNdaModal({
  isOpen,
  onClose,
  vendorId,
  vendorName,
  prId,
  prNumber,
  prDate,
  departmentId,
  purchaseCategoryId,
  departmentName,
  categoryName,
  businessRequirement,
  ndaRequired,
  recipientEmail,
  vendorCode,
}) {
  const { canViewNda, canSendNda } = useApPermissions();

  const [sendOpen, setSendOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [documentLoading, setDocumentLoading] = useState(false);
  // Set by a 409 and cleared only by a successful save or an explicit reload.
  const [hasConflict, setHasConflict] = useState(false);
  const [reloading, setReloading] = useState(false);

  // A second click can land before React has re-rendered with the mutation's pending flag,
  // so the disabled buttons are backed by a synchronous guard. Saving an NDA twice is
  // wasteful; sending one twice mails the vendor twice.
  const inFlight = useRef({ save: false, send: false });

  // Same query key as NdaPanel's lookup, so React Query serves both from one request.
  const { data: lookup, isLoading: lookupLoading } = useVendorNda(vendorId, {
    departmentId,
    purchaseCategoryId,
    enabled: isOpen && canViewNda && Boolean(vendorId),
  });

  // Vendor profile for the address / tax registration the NDA names. Only fetched while the
  // workspace is open, and only ever for this one vendor.
  const { vendor, addresses } = useVendorDetail(isOpen && vendorId ? vendorId : null);

  const nda = lookup?.nda || null;
  const ndaId = nda?.nda_id || null;
  const statusCode = nda?.status_code || null;
  const editable = isEditableStatus(statusCode);

  // The NDA's own record carries the persisted body — the vendor lookup does not, so the
  // editor loads from here (GET /apm/nda/{nda_id} → content).
  const { data: ndaDetail, refetch: refetchNdaDetail } = useNdaDetail(isOpen ? ndaId : null);

  const sendMutation = useSendNda({ prId });
  const saveMutation = useUpdateNdaContent();

  // Primary address, else the first one on file. Missing pieces are simply left out rather
  // than filled in with a plausible-looking value.
  const primaryAddress = useMemo(
    () => addresses.find((address) => address.is_primary) || addresses[0] || null,
    [addresses],
  );

  const vendorAddressText = useMemo(() => {
    if (!primaryAddress) return null;
    return [
      primaryAddress.address_line1,
      primaryAddress.address_line2,
      primaryAddress.city,
      primaryAddress.state,
      primaryAddress.postal_code,
    ]
      .filter(Boolean)
      .join(", ");
  }, [primaryAddress]);

  // Only shown when the vendor record actually carries a registration — never presented as
  // GST-derived unless that is what the record says it is.
  const vendorTaxText = useMemo(() => {
    const tax = (primaryAddress?.vendor_tax || [])[0];
    if (!tax?.registration_number) return null;
    return tax.registration_type
      ? `${tax.registration_type} ${tax.registration_number}`
      : tax.registration_number;
  }, [primaryAddress]);

  const templateHtml = useMemo(
    () =>
      buildNdaDocumentHtml({
        vendorName: vendorName || vendor?.vendor_name,
        vendorEmail: nda?.recipient_email || recipientEmail || vendor?.email,
        vendorCode: vendorCode || vendor?.vendor_code,
        vendorAddress: vendorAddressText,
        vendorTaxId: vendorTaxText,
        prNumber,
        prDate: prDate ? formatDate(prDate) : null,
        departmentName,
        categoryName,
        businessRequirement,
        ndaDate: formatDate(nda?.valid_from || nda?.created_at) || null,
        validUntil: nda?.valid_until ? formatDate(nda.valid_until) : null,
      }),
    [
      vendorName,
      vendor,
      nda,
      recipientEmail,
      vendorCode,
      vendorAddressText,
      vendorTaxText,
      prNumber,
      prDate,
      departmentName,
      categoryName,
      businessRequirement,
    ],
  );

  // An NDA generated before any content was saved has no persisted body yet; the generated
  // template stands in until the first save, after which the server copy always wins.
  const { currentHtml, baseVersion, contentKey, isDirty, setWorkingHtml, markSaved, reloadLatest } =
    useNdaDraft({
      ndaId,
      serverContent: ndaDetail?.content ?? null,
      serverVersion: contentVersionOf(ndaDetail),
      fallbackContent: templateHtml,
    });

  const documentHtml = currentHtml;
  const isSaving = saveMutation.isPending;
  const isSending = sendMutation.isPending;
  const isBusy = isSaving || isSending || reloading;

  /**
   * Saves the editor's content. Returns true when the content on the server is up to date —
   * including the no-op case where there was nothing to save — so Send can gate on it.
   */
  const handleSaveDraft = async ({ silent = false } = {}) => {
    if (!ndaId || isSaving || inFlight.current.save) return false;

    if (!isDirty) {
      if (!silent) toast.info("No changes to save yet.");
      return true;
    }

    inFlight.current.save = true;
    try {
      const result = await saveMutation.mutateAsync({
        ndaId,
        content: currentHtml,
        version: baseVersion,
      });

      // A version in the response is used immediately; without one the invalidated detail
      // query supplies it on refetch.
      markSaved(currentHtml, contentVersionOf(result));
      setHasConflict(false);
      if (!silent) toast.success(result?.message || "NDA content saved.");
      return true;
    } catch (err) {
      // 409 means someone else saved first. Local edits are kept — overwriting them, or
      // silently taking the server's copy, would lose the user's work either way.
      if (err?.response?.status === 409) {
        setHasConflict(true);
        toast.error(CONFLICT_MESSAGE);
        return false;
      }

      toast.error(getApiErrorMessage(err, "Could not save the NDA content."));
      return false;
    } finally {
      inFlight.current.save = false;
    }
  };

  /** The only action allowed to discard local edits, and only because the user asked. */
  const handleReloadLatest = async () => {
    if (!ndaId || reloading) return;

    setReloading(true);
    try {
      // Refetch first, then adopt — reloadLatest takes whatever the query now holds.
      await refetchNdaDetail();
      reloadLatest();
      setHasConflict(false);
      toast.success("Loaded the latest saved version of this NDA.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not load the latest NDA content."));
    } finally {
      setReloading(false);
    }
  };

  const handleOpenBackendDocument = async () => {
    if (!ndaId) return;
    setDocumentLoading(true);
    try {
      // Short-lived URL from the backend — the frontend never builds an object path.
      const result = await ndaService.getNdaDocumentUrl(ndaId, { signed: false });
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not open the NDA document."));
    } finally {
      setDocumentLoading(false);
    }
  };

  const handleSend = async () => {
    // Guards the double click as well as the disabled button.
    if (!ndaId || isBusy || inFlight.current.send) return;

    inFlight.current.send = true;
    try {
      // The backend sends whatever it last persisted, so unsaved edits must land first — and
      // if they cannot, nothing is sent rather than the vendor receiving stale content.
      if (isDirty) {
        const saved = await handleSaveDraft({ silent: true });
        if (!saved) return;
      }

      const result = await sendMutation.mutateAsync(ndaId);

      // A delivery failure comes back as a 200 with sent:false — not an HTTP error.
      if (result?.sent === false) {
        toast.error(result.error || "The NDA could not be delivered.");
        return;
      }
      toast.success(result?.message || `NDA sent to ${result?.recipient_email || "the vendor"}.`);
      setSendOpen(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not send the NDA."));
    } finally {
      inFlight.current.send = false;
    }
  };

  const statusBadge = statusCode ? (
    <StatusPill
      label={NDA_STATUS_LABEL[statusCode] || statusCode}
      tone={NDA_STATUS_TONE[statusCode] || "neutral"}
      size="md"
    />
  ) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`NDA — ${vendorName || `Vendor #${vendorId}`}`}
      subtitle={
        prNumber
          ? `${prNumber} · RFQ stays blocked until the NDA is completed.`
          : "RFQ stays blocked until the NDA is completed."
      }
      size={nda ? "full" : "2xl"}
      // The document is the workspace, so the shell gets out of its way: near-full-screen
      // once an NDA exists, and only dialog-sized before one is generated.
      panelClassName={nda ? "max-w-[110rem]" : ""}
      maxHeight={nda ? "max-h-[95vh]" : "max-h-[92vh]"}
      titleIcon={<FileSignature className="h-4 w-4" />}
      bodyClassName="max-w-full overflow-hidden p-0"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-gray-500">
            {editable
              ? isDirty
                ? "Unsaved changes — these are saved to the server before the NDA is sent."
                : "Saved. The vendor receives the content stored on the server."
              : nda
                ? "This NDA has left the draft stage, so the document is read-only here."
                : ""}
          </p>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Close
            </Button>

            {nda && editable && (
              <Button
                variant="outline"
                onClick={() => handleSaveDraft()}
                disabled={!isDirty || isBusy}
                loading={isSaving}
                loadingText="Saving..."
                className="w-full sm:w-auto"
              >
                <Save className="h-3.5 w-3.5" /> Save Draft
              </Button>
            )}

            {nda && (
              <Button
                variant="outline"
                onClick={() => setPreviewOpen(true)}
                className="w-full sm:w-auto"
              >
                <Eye className="h-3.5 w-3.5" /> Preview
              </Button>
            )}

            {nda?.document_key && (
              <Button
                variant="outline"
                onClick={handleOpenBackendDocument}
                loading={documentLoading}
                loadingText="Opening..."
                className="w-full sm:w-auto"
              >
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
            )}

            {nda && canSendNda && statusCode === NDA_STATUS.PENDING && (
              <Button
                variant="primary"
                onClick={() => setSendOpen(true)}
                loading={isSending}
                loadingText="Sending..."
                disabled={isBusy}
                className="w-full sm:w-auto"
              >
                <Send className="h-3.5 w-3.5" /> Send NDA
              </Button>
            )}
          </div>
        </div>
      }
    >
      {!isOpen ? null : lookupLoading ? (
        <div className="p-6">
          <LoadingSpinner text="Loading the NDA..." />
        </div>
      ) : (
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto p-3 sm:p-4 lg:h-[calc(95vh-13rem)] lg:flex-row lg:overflow-hidden">
          {/* Document — only once an NDA exists. Before that the rail's Generate action
              creates one, and the editor appears on the refetch. */}
          {nda && (
            <div className="flex min-h-[60vh] min-w-0 flex-1 flex-col lg:min-h-0">
              {/* A 409 from the save. The edits below are untouched — reloading is the
                  user's decision to make, because it discards them. */}
              {hasConflict && (
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <p className="flex items-start gap-1.5 text-xs text-amber-800">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{CONFLICT_MESSAGE}</span>
                  </p>
                  <Button
                    size="small"
                    variant="outline"
                    onClick={handleReloadLatest}
                    loading={reloading}
                    loadingText="Reloading..."
                    disabled={isBusy}
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Reload Latest
                  </Button>
                </div>
              )}

              <NdaDocumentEditor
                initialHtml={documentHtml}
                documentKey={contentKey}
                readOnly={!editable}
                onChange={setWorkingHtml}
              />
            </div>
          )}

          {/* Context + lifecycle rail */}
          <div
            className={`min-h-0 shrink-0 space-y-3 lg:overflow-y-auto ${
              nda ? "lg:w-[19rem] xl:w-80" : "w-full"
            }`}
          >
            {statusBadge && (
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill label="NDA Required" tone="warning" />
                {statusBadge}
              </div>
            )}

            <SideSection title="Vendor">
              <SideRow label="Name" value={vendorName || vendor?.vendor_name} />
              <SideRow label="Email" value={nda?.recipient_email || recipientEmail || vendor?.email} />
              <SideRow label="Vendor Code" value={vendorCode || vendor?.vendor_code} />
              <SideRow label="Address" value={vendorAddressText} />
              <SideRow label="Tax Registration" value={vendorTaxText} />
            </SideSection>

            <SideSection title="Procurement Context">
              <SideRow label="Purchase Requisition" value={prNumber} />
              <SideRow label="PR Date" value={prDate ? formatDate(prDate) : null} />
              <SideRow label="Department" value={departmentName} />
              <SideRow label="Purchase Category" value={categoryName} />
              <SideRow label="Business Requirement" value={businessRequirement} />
            </SideSection>

            {nda && (
              <SideSection title="Template">
                <SideRow label="Version" value={nda.template_version} />
                <SideRow label="Generated" value={nda.created_at ? formatDate(nda.created_at) : null} />
                <SideRow
                  label="Content Version"
                  value={baseVersion ?? "Not saved yet"}
                />
              </SideSection>
            )}

            {/* The whole NDA lifecycle — status, view, signed upload and internal review —
                stays in the existing panel. Generate/Send are hidden only when this component
                already offers them, so an NDA that does not exist yet can still be generated
                from here. */}
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                NDA Lifecycle
              </p>
              <NdaPanel
                vendorId={vendorId}
                departmentId={departmentId}
                purchaseCategoryId={purchaseCategoryId}
                prId={prId}
                ndaRequired={ndaRequired}
                recipientEmail={recipientEmail}
                vendorName={vendorName}
                vendorCode={vendorCode}
                prNumber={prNumber}
                departmentName={departmentName}
                categoryName={categoryName}
                businessRequirement={businessRequirement}
                showSend={false}
              />
            </div>
          </div>
        </div>
      )}

      {nda && (
        <SendNdaConfirmModal
          isOpen={sendOpen}
          onClose={() => setSendOpen(false)}
          onConfirm={handleSend}
          isSending={isSending || isSaving}
          vendorName={vendorName || vendor?.vendor_name}
          recipientEmail={nda.recipient_email || recipientEmail}
          prNumber={prNumber}
          ndaId={ndaId}
          templateVersion={nda.template_version}
          documentKey={nda.document_key}
        />
      )}

      {/* Read-only render of exactly what is in the editor right now. */}
      <Modal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="NDA Preview"
        subtitle="The document as it currently reads in the editor."
        size="4xl"
        zIndex="z-[10000]"
        maxHeight="max-h-[90vh]"
        bodyClassName="p-0"
        footer={
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close Preview
            </Button>
          </div>
        }
      >
        <div className="max-h-[70vh] overflow-y-auto">
          <NdaDocumentEditor
            initialHtml={documentHtml}
            documentKey={`preview-${ndaId}-${previewOpen}`}
            readOnly
          />
        </div>
      </Modal>
    </Modal>
  );
}
