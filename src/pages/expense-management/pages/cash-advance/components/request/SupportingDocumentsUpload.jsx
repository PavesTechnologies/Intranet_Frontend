import React, { useCallback, useEffect, useState } from "react";
import { FileText, Loader2, Paperclip, RotateCcw, Trash2, AlertCircle } from "lucide-react";
import Button from "@/components/Button/Button";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";

export const MAX_DOCUMENTS = 5;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "docx"];

export const DOCUMENT_CATEGORIES = [
  { value: "TRAVEL_ITINERARY", label: "Travel itinerary" },
  { value: "CLIENT_APPROVAL", label: "Client approval" },
  { value: "PROJECT_APPROVAL", label: "Project approval" },
  { value: "MEETING_INVITATION", label: "Meeting invitation" },
  { value: "ESTIMATED_EXPENSE_BREAKDOWN", label: "Estimated expense breakdown" },
  { value: "OTHER", label: "Other" },
];

const categoryLabel = (value) => DOCUMENT_CATEGORIES.find((c) => c.value === value)?.label ?? value;

export function formatFileSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

/** The first problem with a file, or null. The server checks again, including the file's actual contents. */
export function fileProblem(file) {
  const name = file?.name || "";
  const dot = name.lastIndexOf(".");
  const extension = dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return `${name}: this file type is not allowed. Use PDF, JPG, PNG or DOCX.`;
  }
  if (!file.size) {
    return `${name}: the file is empty.`;
  }
  if (file.size > MAX_FILE_BYTES) {
    return `${name}: the file is larger than 5 MB.`;
  }
  return null;
}

/**
 * Supporting documents for a cash advance request. Optional. Files can be added and removed while the request is a
 * draft. The first file saves the draft if it does not exist yet, so the document has a request to belong to.
 */
/** Opens a short-lived link for the document in a new tab. A failure is shown to the employee, not thrown. */
async function openDocument(advanceId, documentId, kind, setProblems) {
  try {
    const link = await cashAdvanceApi.documentLink(advanceId, documentId, kind);
    if (!link?.url) throw new Error("No link was returned.");
    window.open(link.url, "_blank", "noopener,noreferrer");
  } catch {
    setProblems(["The document could not be opened. Try again."]);
  }
}

export default function SupportingDocumentsUpload({ advanceId, ensureDraft, disabled = false, actions = null }) {
  const [documents, setDocuments] = useState([]);
  const [category, setCategory] = useState("OTHER");
  const [pending, setPending] = useState([]);
  const [problems, setProblems] = useState([]);
  const [busy, setBusy] = useState(false);

  // Takes the id explicitly: the first upload can create the draft, and the list must be read for that id.
  const fetchDocuments = useCallback(async (id) => {
    if (!id) {
      setDocuments([]);
      return;
    }
    try {
      const list = await cashAdvanceApi.listDocuments(id);
      setDocuments(Array.isArray(list) ? list : []);
    } catch {
      setProblems(["Could not load the documents for this request."]);
    }
  }, []);

  useEffect(() => {
    fetchDocuments(advanceId);
  }, [advanceId, fetchDocuments]);

  const slotsUsed = documents.length + pending.length;

  const uploadOne = async (item, targetId) => {
    setPending((list) => list.map((p) => (p.localId === item.localId ? { ...p, status: "uploading", error: null } : p)));
    try {
      await cashAdvanceApi.uploadDocument(targetId, item.category, item.file);
      setPending((list) => list.filter((p) => p.localId !== item.localId));
      await fetchDocuments(targetId);
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || "The upload failed.";
      setPending((list) => list.map((p) => (p.localId === item.localId ? { ...p, status: "failed", error: message } : p)));
    }
  };

  const addFiles = async (event) => {
    const picked = Array.from(event.target.files || []);
    event.target.value = "";
    if (picked.length === 0) return;

    const errors = [];
    const accepted = [];
    if (slotsUsed + picked.length > MAX_DOCUMENTS) {
      errors.push(`A request can have at most ${MAX_DOCUMENTS} supporting documents. Remove one before adding more.`);
    } else {
      picked.forEach((file) => {
        const problem = fileProblem(file);
        if (problem) errors.push(problem);
        else accepted.push(file);
      });
    }
    setProblems(errors);
    if (accepted.length === 0) return;

    const items = accepted.map((file, index) => ({
      localId: `${Date.now()}-${index}`, file, category, status: "queued", error: null,
      name: file.name, size: file.size,
    }));
    setPending((list) => [...list, ...items]);

    setBusy(true);
    try {
      // The first upload may save the draft; the rest reuse the id it returns.
      let targetId = advanceId;
      for (const item of items) {
        if (!targetId) {
          targetId = await ensureDraft();
        }
        await uploadOne(item, targetId);
      }
    } catch (error) {
      setProblems([error?.message || "Save the request before adding documents."]);
      setPending((list) => list.map((p) => (items.some((i) => i.localId === p.localId) && p.status === "queued"
        ? { ...p, status: "failed", error: error?.message || "Not uploaded." } : p)));
    } finally {
      setBusy(false);
    }
  };

  const retry = async (item) => {
    if (!advanceId) return;
    setBusy(true);
    await uploadOne(item, advanceId);
    setBusy(false);
  };

  const dismissPending = (localId) => setPending((list) => list.filter((p) => p.localId !== localId));

  const remove = async (documentId) => {
    if (!advanceId) return;
    setBusy(true);
    try {
      await cashAdvanceApi.deleteDocument(advanceId, documentId);
      await fetchDocuments(advanceId);
    } catch (error) {
      setProblems([error?.response?.data?.message || "Could not remove the document."]);
    } finally {
      setBusy(false);
    }
  };

  const canAdd = !disabled && !busy && slotsUsed < MAX_DOCUMENTS;

  return (
    <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-4" aria-labelledby="supporting-documents-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="supporting-documents-title" className="text-sm font-semibold text-gray-900">
          Supporting documents <span className="font-normal text-gray-500">(optional)</span>
        </h3>
        <span className="text-[11px] text-gray-500">
          {slotsUsed} of {MAX_DOCUMENTS} · PDF, JPG, PNG or DOCX · up to 5 MB each
        </span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 text-xs">
          <span className="mb-1 block font-medium text-gray-700">Document type</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={!canAdd}
            className="w-full rounded-md border border-gray-300 px-2.5 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            {DOCUMENT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </label>
        <label className={`inline-flex cursor-pointer items-center gap-2 rounded-md border border-blue-600 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50 ${!canAdd ? "pointer-events-none opacity-50" : ""}`}>
          <Paperclip size={14} aria-hidden="true" />
          Add files
          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.docx,application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={addFiles}
            disabled={!canAdd}
            className="sr-only"
            aria-label="Add supporting documents"
          />
        </label>
        {actions}
      </div>

      {problems.length > 0 && (
        <ul className="space-y-1" role="alert">
          {problems.map((p) => (
            <li key={p} className="flex items-start gap-1.5 text-xs text-rose-700">
              <AlertCircle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
              {p}
            </li>
          ))}
        </ul>
      )}

      {documents.length === 0 && pending.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-blue-200 bg-blue-50/40 px-4 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm" aria-hidden="true">
            <Paperclip size={15} />
          </span>
          <p className="text-xs text-slate-600">No documents added yet. You can add them now or later, before you submit.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-md border border-gray-100" aria-label="Attached documents">
          {documents.map((doc) => (
            <li key={doc.documentId} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-xs">
              <FileText size={15} className="shrink-0 text-gray-400" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate font-medium text-gray-900" title={doc.originalFileName}>
                {doc.originalFileName}
              </span>
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-700">{categoryLabel(doc.category)}</span>
              <span className="tabular-nums text-gray-500">{formatFileSize(doc.fileSizeBytes)}</span>
              <span className="text-emerald-700">Uploaded</span>
              <Button
                variant="outline"
                size="small"
                onClick={() => openDocument(advanceId, doc.documentId, "view", setProblems)}
                aria-label={`View ${doc.originalFileName}`}
                className="text-xs"
              >
                View
              </Button>
              <Button
                variant="outline"
                size="small"
                onClick={() => openDocument(advanceId, doc.documentId, "download", setProblems)}
                aria-label={`Download ${doc.originalFileName}`}
                className="text-xs"
              >
                Download
              </Button>
              <Button
                variant="outline"
                size="small"
                disabled={disabled || busy}
                onClick={() => remove(doc.documentId)}
                aria-label={`Remove ${doc.originalFileName}`}
                className="text-xs"
              >
                <Trash2 size={12} className="mr-1" aria-hidden="true" /> Remove
              </Button>
            </li>
          ))}

          {pending.map((item) => (
            <li key={item.localId} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-xs">
              <FileText size={15} className="shrink-0 text-gray-400" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate font-medium text-gray-900" title={item.name}>{item.name}</span>
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-700">{categoryLabel(item.category)}</span>
              <span className="tabular-nums text-gray-500">{formatFileSize(item.size)}</span>
              {item.status === "failed" ? (
                <>
                  <span className="text-rose-700" title={item.error}>Failed: {item.error}</span>
                  <Button variant="outline" size="small" disabled={busy || !advanceId} onClick={() => retry(item)} className="text-xs">
                    <RotateCcw size={12} className="mr-1" aria-hidden="true" /> Retry
                  </Button>
                  <Button variant="outline" size="small" onClick={() => dismissPending(item.localId)} className="text-xs">
                    Dismiss
                  </Button>
                </>
              ) : (
                <span className="inline-flex items-center gap-1 text-blue-700">
                  <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                  {item.status === "uploading" ? "Uploading" : "Queued"}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
