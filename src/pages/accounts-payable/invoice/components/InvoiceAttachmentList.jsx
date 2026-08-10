import { FileText, Eye } from "lucide-react";
import { toast } from "react-toastify";
import Button from "../../../../components/Button/Button";
import { formatDate } from "../../utils/formatters";

/**
 * No file-storage backend exists yet, so "View" deliberately does not fabricate a working
 * download URL (per PART O) — it surfaces a clear, honest toast instead of a broken link.
 */
export default function InvoiceAttachmentList({ attachments = [] }) {
  if (attachments.length === 0) {
    return <p className="text-sm italic text-gray-500">No attachments.</p>;
  }

  return (
    <ul className="divide-y divide-gray-100">
      {attachments.map((file) => (
        <li key={file.id} className="flex items-center justify-between gap-3 py-2 text-sm">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-gray-400" />
            <div className="min-w-0">
              <p className="truncate font-medium text-gray-800">{file.fileName}</p>
              <p className="text-xs text-gray-500">
                {file.fileType} · Uploaded {formatDate(file.uploadedAt)}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="small"
            onClick={() =>
              toast.info("File preview isn't available yet — no file-storage backend is connected.")
            }
          >
            <Eye className="h-3.5 w-3.5" /> View
          </Button>
        </li>
      ))}
    </ul>
  );
}
