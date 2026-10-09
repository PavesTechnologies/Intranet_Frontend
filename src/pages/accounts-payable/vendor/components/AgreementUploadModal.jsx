import { useState } from "react";
import { toast } from "react-toastify";
import { ScanText } from "lucide-react";
import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";
import FileUpload from "../../../../components/forms/FileUpload";
import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import FormTextArea from "../../../../components/forms/FormTextArea";
import { ACCEPTED_DOCUMENT_EXTENSIONS, formatFileSize, validateDocumentFile } from "../../utils/documentUpload";
import { getApiErrorMessage } from "../../utils/apiError";
import { AGREEMENT_TYPE_OPTIONS, DUE_BASIS_OPTIONS } from "../../constants/paymentTerms";
import { useCreateAgreementMutation, useExtractAgreementMutation } from "../../invoice/hooks/useInvoicePaymentTerms";

const EMPTY = {
  title: "",
  agreement_type: "OTHER",
  reference_no: "",
  valid_from: "",
  valid_to: "",
  payment_terms_text: "",
  term_days: "",
  due_basis: "INVOICE_DATE",
  auto_renew: "false",
  remarks: "",
};

/**
 * Upload a vendor agreement / contract. "Read document" asks the backend (Textract) for
 * suggested values — nothing is saved by that step; every field stays editable and the user
 * submits what they have checked. The saved agreement is PENDING_VERIFICATION and only becomes an
 * authoritative payment-term source after a different user verifies it.
 */
export default function AgreementUploadModal({ isOpen, onClose, vendorId }) {
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [extracted, setExtracted] = useState(null);
  const extract = useExtractAgreementMutation(vendorId);
  const create = useCreateAgreementMutation(vendorId);

  const reset = () => {
    setFile(null);
    setFileError("");
    setForm(EMPTY);
    setExtracted(null);
  };
  const handleClose = () => {
    reset();
    onClose();
  };
  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  const handleExtract = () => {
    const message = validateDocumentFile(file);
    if (message) return setFileError(message);
    extract.mutate(file, {
      onSuccess: (data) => {
        setExtracted(data);
        setForm((f) => ({
          ...f,
          title: data.title || f.title,
          agreement_type: data.agreement_type || f.agreement_type,
          reference_no: data.reference_no || f.reference_no,
          valid_from: data.valid_from || f.valid_from,
          valid_to: data.valid_to || f.valid_to,
          payment_terms_text: data.payment_terms_text || f.payment_terms_text,
          term_days: data.term_days != null ? String(data.term_days) : f.term_days,
          due_basis: data.due_basis || f.due_basis,
          auto_renew: data.auto_renew != null ? String(Boolean(data.auto_renew)) : f.auto_renew,
        }));
        toast.info("Values read from the document — please check them before saving.");
      },
      onError: (err) => toast.error(getApiErrorMessage(err, "Could not read the document. Enter the details manually.")),
    });
  };

  const termDays = form.term_days === "" ? null : Number(form.term_days);
  const termDaysInvalid = termDays != null && (!Number.isInteger(termDays) || termDays < 0 || termDays > 365);
  const datesInvalid = Boolean(form.valid_from && form.valid_to && form.valid_to < form.valid_from);
  const canSave = Boolean(file && form.title.trim() && form.valid_from && !termDaysInvalid && !datesInvalid);

  const handleSave = () => {
    const message = validateDocumentFile(file);
    if (message) return setFileError(message);
    create.mutate(
      {
        file,
        fields: {
          ...form,
          title: form.title.trim(),
          term_days: form.term_days,
          auto_renew: form.auto_renew === "true",
          extraction_confidence: extracted?.overall_confidence ?? "",
        },
      },
      {
        onSuccess: () => {
          toast.success("Agreement uploaded — it now needs verification by a second user.");
          handleClose();
        },
        onError: (err) => toast.error(getApiErrorMessage(err, "Could not save the agreement.")),
      },
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload vendor agreement"
      size="2xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} loading={create.isPending} disabled={!canSave}>
            Submit for verification
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[16rem] flex-1">
            <FileUpload
              label="Agreement document *"
              name="agreementFile"
              accept={ACCEPTED_DOCUMENT_EXTENSIONS.join(",")}
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setFileError("");
                setExtracted(null);
              }}
            />
          </div>
          <Button variant="outline" size="small" onClick={handleExtract} loading={extract.isPending} disabled={!file}>
            <ScanText size={14} /> Read document
          </Button>
        </div>
        {file && !fileError && (
          <p className="text-xs text-gray-500">
            {file.name} · {formatFileSize(file.size)}
          </p>
        )}
        {fileError && <p className="text-xs text-red-500">{fileError}</p>}

        {extracted?.warnings?.length > 0 && (
          <ul className="list-disc space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 pl-6 text-xs text-amber-900">
            {extracted.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <FormInput label="Title" name="title" value={form.title} onChange={set("title")} requiredMark />
          <FormSelect
            label="Agreement type"
            name="agreement_type"
            options={AGREEMENT_TYPE_OPTIONS}
            value={form.agreement_type}
            onChange={set("agreement_type")}
          />
          <FormInput label="Reference no." name="reference_no" value={form.reference_no} onChange={set("reference_no")} />
          <FormSelect
            label="Renews automatically"
            name="auto_renew"
            options={[
              { value: "false", label: "No" },
              { value: "true", label: "Yes" },
            ]}
            value={form.auto_renew}
            onChange={set("auto_renew")}
          />
          <FormInput label="Valid from" name="valid_from" type="date" value={form.valid_from} onChange={set("valid_from")} requiredMark />
          <FormInput
            label="Valid to"
            name="valid_to"
            type="date"
            value={form.valid_to}
            onChange={set("valid_to")}
            error={datesInvalid ? "Must be on or after the start date" : ""}
          />
          <FormInput
            label="Payment terms (days)"
            name="term_days"
            type="number"
            min={0}
            max={365}
            value={form.term_days}
            onChange={set("term_days")}
            error={termDaysInvalid ? "0 to 365 days" : ""}
            placeholder="Read from the clause if left blank"
          />
          <FormSelect
            label="Counted from"
            name="due_basis"
            options={DUE_BASIS_OPTIONS}
            value={form.due_basis}
            onChange={set("due_basis")}
          />
        </div>
        <FormTextArea
          label="Payment terms clause"
          name="payment_terms_text"
          rows={2}
          value={form.payment_terms_text}
          onChange={set("payment_terms_text")}
          placeholder="e.g. Fees are payable within forty-five (45) days from the date of each undisputed invoice."
        />
        <FormTextArea label="Remarks" name="remarks" rows={2} value={form.remarks} onChange={set("remarks")} />
      </div>
    </Modal>
  );
}
