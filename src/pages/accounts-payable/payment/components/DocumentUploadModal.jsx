import { useState } from "react";
import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";
import FileUpload from "../../../../components/forms/FileUpload";
import FormSelect from "../../../../components/forms/FormSelect";
import {
  ACCEPTED_DOCUMENT_EXTENSIONS,
  formatFileSize,
  validateDocumentFile,
} from "../../utils/documentUpload";

/**
 * Upload one supporting document (payment receipt, TDS challan/certificate, ...). Uses the shared
 * FileUpload input and documentUpload.js validation (same accepted types/size as every other AP
 * upload); document types come from the backend metadata endpoint, never hardcoded here.
 * @param {{isOpen: boolean, onClose: () => void, title: string,
 *   documentTypes: {value: string, label: string}[], defaultType?: string,
 *   onUpload: (file: File, documentType: string) => Promise<unknown>, isUploading?: boolean}} props
 */
export default function DocumentUploadModal({ isOpen, onClose, title, documentTypes = [], defaultType, onUpload, isUploading }) {
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState(defaultType || documentTypes[0]?.value || "");
  const [error, setError] = useState("");

  const handleClose = () => {
    setFile(null);
    setError("");
    onClose();
  };

  const handleSubmit = async () => {
    const message = validateDocumentFile(file);
    if (message) {
      setError(message);
      return;
    }
    try {
      await onUpload(file, documentType);
      handleClose();
    } catch {
      // the caller shows the error toast; keep the modal open so the user can retry
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={isUploading}>
            Upload
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {documentTypes.length > 1 && (
          <FormSelect
            label="Document Type"
            name="documentType"
            options={documentTypes}
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
          />
        )}
        <FileUpload
          label="File"
          name="documentFile"
          accept={ACCEPTED_DOCUMENT_EXTENSIONS.join(",")}
          onChange={(e) => {
            setFile(e.target.files?.[0] || null);
            setError("");
          }}
        />
        {file && !error && (
          <p className="text-xs text-gray-500">
            {file.name} · {formatFileSize(file.size)}
          </p>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
        <p className="text-xs text-gray-500">PDF, PNG or JPG, up to 10MB.</p>
      </div>
    </Modal>
  );
}
