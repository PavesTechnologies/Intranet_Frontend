import { AlertTriangle, Mail, Paperclip } from "lucide-react";
import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";

const Row = ({ label, value, mono = false }) => (
  <div className="flex items-start justify-between gap-3 border-b border-gray-100 py-2 last:border-0">
    <dt className="shrink-0 text-xs text-gray-500">{label}</dt>
    <dd
      className={`min-w-0 break-words text-right text-xs font-medium text-gray-900 ${
        mono ? "font-mono" : ""
      }`}
    >
      {value || "—"}
    </dd>
  </div>
);

/**
 * Confirmation before POST /apm/nda/{nda_id}/send.
 *
 * Shared by the NDA panel and the NDA editor so there is one send-confirmation implementation.
 * It confirms the send of exactly one NDA to exactly one vendor — the nda_id and the
 * recipient shown here are the ones the request carries, so a vendor can never be sent another
 * vendor's agreement.
 *
 * The email itself is composed and delivered server-side; nothing here sends mail.
 *
 * @param {{ isOpen:boolean, onClose:()=>void, onConfirm:()=>void, isSending?:boolean,
 *   vendorName?:string, recipientEmail?:string|null, prNumber?:string,
 *   ndaId?:number|string, templateVersion?:string|null, documentKey?:string|null }} props
 */
export default function SendNdaConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isSending = false,
  vendorName,
  recipientEmail,
  prNumber,
  ndaId,
  templateVersion,
  documentKey,
}) {
  // The recipient is the backend's (the NDA's own recipient_email); with none recorded there
  // is nothing to confirm and sending is not offered.
  const hasRecipient = Boolean(recipientEmail);

  // Attachment name as stored — never an S3 path, just the object's file name.
  const attachmentName = documentKey ? documentKey.split("/").pop() : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Send NDA"
      subtitle="Review the recipient before the agreement leaves the system."
      size="md"
      zIndex="z-[10000]"
      closeOnBackdrop={false}
      titleIcon={<Mail className="h-4 w-4" />}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSending}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            loading={isSending}
            loadingText="Sending..."
            disabled={!hasRecipient || isSending}
            className="w-full sm:w-auto"
          >
            <Mail className="h-3.5 w-3.5" /> Send NDA
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <dl className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1">
          <Row label="Vendor" value={vendorName} />
          <Row label="Recipient Email" value={recipientEmail} mono />
          <Row label="Subject" value={prNumber ? `Non-Disclosure Agreement – ${prNumber}` : "Non-Disclosure Agreement"} />
          <Row
            label="Attachment"
            value={
              <span className="inline-flex items-center gap-1.5">
                <Paperclip className="h-3 w-3 text-gray-400" />
                {attachmentName || `NDA #${ndaId}`}
              </span>
            }
          />
          <Row label="NDA" value={ndaId ? `#${ndaId}` : "—"} />
          <Row label="Template Version" value={templateVersion} />
        </dl>

        {!hasRecipient && (
          <p className="flex items-start gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              This NDA has no recipient email recorded, so it cannot be sent. Add an email to the
              vendor record and generate the NDA again.
            </span>
          </p>
        )}

        <p className="text-xs text-gray-500">
          This sends only this vendor&apos;s NDA, to the address above. The message is composed
          and delivered by the server. The NDA moves to <span className="font-medium">Sent</span>{" "}
          and RFQ stays blocked until the signed copy is returned and accepted.
        </p>
      </div>
    </Modal>
  );
}
