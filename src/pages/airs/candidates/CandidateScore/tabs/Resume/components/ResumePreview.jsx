import React, { useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Download } from "lucide-react";
import Button from "@/components/Button/Button";

// Mock PDF viewer — renders the parsed mock page text inside a paper-style
// frame. No real PDF rendering / backend file fetch is involved.
export default function ResumePreview({ file, previewPages }) {
  const [page, setPage] = useState(0);
  const totalPages = previewPages.length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={15} className="text-rose-500 shrink-0" />
          <span className="text-[12.5px] font-semibold text-slate-900 truncate">{file.name}</span>
        </div>
        <Button variant="ghost" size="small">
          <Download className="h-4 w-4 mr-1" /> Download
        </Button>
      </div>

      <div className="p-6 bg-slate-100">
        <div className="mx-auto max-w-[420px] aspect-[3/4] bg-white shadow-md rounded-sm p-5 overflow-y-auto">
          <div className="font-mono text-[10.5px] leading-relaxed text-slate-800 whitespace-pre-wrap">
            {previewPages[page].join("\n")}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200">
        <span className="text-[11px] text-slate-400">
          {file.sizeKb} KB · {file.pageCount} page{file.pageCount === 1 ? "" : "s"} · Uploaded {file.uploadedOn}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-[11px] text-slate-500">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="p-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
