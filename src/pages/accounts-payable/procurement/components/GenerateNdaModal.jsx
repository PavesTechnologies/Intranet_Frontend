import { FileSignature, Info } from "lucide-react";
import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";
import StatusPill from "../../vendor-intake/components/PreScreenStatusBadge";
import { NDA_LOOKUP_OUTCOME } from "../constants/vendorOnboarding";

const Row = ({ label, value }) => (
  <div className="flex items-start justify-between gap-3 border-b border-gray-100 py-2 last:border-0">
    <dt className="shrink-0 text-xs text-gray-500">{label}</dt>
    <dd className="min-w-0 break-words text-right text-xs font-medium text-gray-900">
      {value || "—"}
    </dd>
  </div>
);

/**
 * Confirmation before POST /apm/nda/generate.
 *
 * Shows the exact scope the NDA will be generated for — one vendor, one PR, one
 * department/category — so it is clear the agreement is vendor-specific and not shared across
 * the invited vendors.
 *
 * Whether a valid NDA already exists, and therefore whether generate reuses it instead of
 * creating a new one, is the backend's call: the lookup `outcome` is displayed here and the
 * generate response's `reused` flag reports what actually happened.
 *
 * @param {{ isOpen:boolean, onClose:()=>void, onConfirm:()=>void, isGenerating?:boolean,
 *   vendorName?:string, vendorEmail?:string|null, vendorCode?:string|null, prNumber?:string,
 *   departmentName?:string, categoryName?:string, businessRequirement?:string|null,
 *   templateVersion?:string|null, lookupOutcome?:string|null, isRegenerate?:boolean }} props
 */
export default function GenerateNdaModal({
  isOpen,
  onClose,
  onConfirm,
  isGenerating = false,
  vendorName,
  vendorEmail,
  vendorCode,
  prNumber,
  departmentName,
  categoryName,
  businessRequirement,
  templateVersion,
  lookupOutcome,
  isRegenerate = false,
}) {
  const willReuse = lookupOutcome === NDA_LOOKUP_OUTCOME.VALID;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isRegenerate ? "Generate New NDA" : "Generate NDA"}
      subtitle="The agreement is generated for this vendor and this requisition only."
      size="md"
      zIndex="z-[10000]"
      closeOnBackdrop={false}
      titleIcon={<FileSignature className="h-4 w-4" />}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isGenerating}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            loading={isGenerating}
            loadingText="Generating..."
            className="w-full sm:w-auto"
          >
            {isRegenerate ? "Generate New NDA" : "Generate NDA"}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Vendor
          </p>
          <dl className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1">
            <Row label="Name" value={vendorName} />
            <Row label="Email" value={vendorEmail} />
            <Row label="Vendor Code" value={vendorCode} />
          </dl>
        </div>

        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Procurement Context
          </p>
          <dl className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1">
            <Row label="Purchase Requisition" value={prNumber} />
            <Row label="Department" value={departmentName} />
            <Row label="Purchase Category" value={categoryName} />
            <Row label="Business Requirement" value={businessRequirement} />
          </dl>
        </div>

        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Template
          </p>
          <dl className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1">
            <Row
              label="Version"
              value={templateVersion || "Selected by the server on generation"}
            />
          </dl>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusPill label="NDA Required" tone="warning" />
          {willReuse && <StatusPill label="Existing NDA will be reused" tone="info" />}
        </div>

        <p className="flex items-start gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {willReuse
              ? "A valid NDA already covers this vendor for this department and category — the server will reuse it instead of creating a second agreement."
              : "The generated document opens in the editor so it can be reviewed and adjusted before it is sent."}
          </span>
        </p>
      </div>
    </Modal>
  );
}
