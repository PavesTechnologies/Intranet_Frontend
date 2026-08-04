import React, { useState } from "react";
import { Fonts } from "../../../../components/Fonts/Fonts";
import FileUpload from "../../../../components/forms/FileUpload";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { formatDate } from "../../utils/formatters";

const formatBytes = (bytes) => {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

const buildMockAttachments = (invoiceId) => [
  {
    id: `${invoiceId}-att1`,
    name: `${invoiceId}-original.pdf`,
    size: 214_000,
    uploadedDate: "2026-07-19",
  },
  {
    id: `${invoiceId}-att2`,
    name: `${invoiceId}-po-reference.pdf`,
    size: 98_000,
    uploadedDate: "2026-07-19",
  },
];

/**
 * Mock attachment list — the initial files are illustrative and the
 * upload control only appends to local state (no real upload occurs).
 */
const InvoiceAttachmentList = ({ invoiceId }) => {
  const [attachments, setAttachments] = useState(() => buildMockAttachments(invoiceId));

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachments((prev) => [
      ...prev,
      {
        id: `${invoiceId}-att${prev.length + 1}-${Date.now()}`,
        name: file.name,
        size: file.size,
        uploadedDate: new Date().toISOString().slice(0, 10),
      },
    ]);
    showStatusToast(`${file.name} added to attachments`, "success");
    e.target.value = "";
  };

  return (
    <div className="space-y-4">
      <h3 className={Fonts.subheading}>Attachments</h3>

      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
        {attachments.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm italic text-gray-500">No attachments yet.</li>
        ) : (
          attachments.map((file) => (
            <li key={file.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className={Fonts.label}>{file.name}</p>
                <p className={`${Fonts.smallText} mt-0.5`}>
                  {formatBytes(file.size)} • Uploaded {formatDate(file.uploadedDate)}
                </p>
              </div>
            </li>
          ))
        )}
      </ul>

      <div className="max-w-sm">
        <FileUpload label="Add attachment (simulated)" name="invoiceAttachment" onChange={handleUpload} />
      </div>
    </div>
  );
};

export default InvoiceAttachmentList;
