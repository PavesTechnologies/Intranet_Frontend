import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, FileText, Download, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import { renderAsync } from "docx-preview";
import { saveAs } from "file-saver";
import Button from "@/components/Button/Button";

// Set up the PDF.js worker using unpkg CDN matching the current version of pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function ResumePreview({ file, onExpired }) {
  const [numPages, setNumPages] = useState(file.pageCount || 1);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [docxBlob, setDocxBlob] = useState(null);
  const docxContainerRef = useRef(null);

  const isPdf = file.format?.toUpperCase() === "PDF" || file.name?.toLowerCase().endsWith(".pdf");
  const isDocx = file.format?.toUpperCase() === "DOCX" || file.name?.toLowerCase().endsWith(".docx");

  // Reset loading and error when URL changes
  useEffect(() => {
    setLoading(true);
    setError(null);
    setDocxBlob(null);
    setPageNumber(1);
  }, [file.url]);

  // Handle DOCX loading and fetching
  useEffect(() => {
    if (!isDocx || !file.url) return;

    let active = true;
    setLoading(true);
    setError(null);

    fetch(file.url)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 403 || res.status === 401) {
            onExpired?.();
          }
          throw new Error(`Failed to load document (${res.status})`);
        }
        return res.blob();
      })
      .then((blob) => {
        if (active) {
          setDocxBlob(blob);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || "Failed to load DOCX document");
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [file.url, isDocx, onExpired]);

  // Render DOCX blob
  useEffect(() => {
    if (docxBlob && docxContainerRef.current) {
      docxContainerRef.current.innerHTML = "";
      renderAsync(docxBlob, docxContainerRef.current)
        .catch((err) => {
          console.error("DOCX rendering error:", err);
          setError("Failed to render DOCX preview content");
        });
    }
  }, [docxBlob]);

  // Handle PDF callbacks
  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const onDocumentLoadError = (err) => {
    console.error("PDF load error:", err);
    onExpired?.();
    setError("Failed to load PDF. The preview link may have expired. Retrying...");
    setLoading(false);
  };

  const handleDownload = async () => {
    try {
      const res = await fetch(file.url);
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          onExpired?.();
        }
        throw new Error("Expired or failed download");
      }
      const blob = await res.blob();
      saveAs(blob, file.name);
    } catch (err) {
      console.error("Download failed:", err);
      // Fallback: Open in new tab
      window.open(file.url, "_blank");
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col min-h-[460px]">
      {/* Section Header — matches the other Resume tab section cards */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-100 bg-slate-50/70">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex items-center justify-center w-5 h-5 rounded-md bg-slate-100 text-slate-500 shrink-0">
            <FileText size={12} />
          </span>
          <span className="text-[12.5px] font-bold text-slate-900 shrink-0">Resume Preview</span>
          <span className="text-slate-300 shrink-0">·</span>
          <span className="text-[11.5px] text-slate-500 truncate" title={file.name}>
            {file.name}
          </span>
        </div>
        <Button variant="ghost" size="small" onClick={handleDownload} className="shrink-0">
          <Download className="h-4 w-4 mr-1" /> Download
        </Button>
      </div>

      {/* Main Preview Container */}
      <div className="flex-1 flex min-h-[360px] bg-slate-100 relative">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/80 z-10">
            <Loader2 className="animate-spin text-indigo-600 mb-2" size={28} />
            <span className="text-[12px] text-slate-500 font-medium">Loading resume preview...</span>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-50/90 z-10 text-center">
            <AlertCircle className="text-rose-500 mb-2" size={32} />
            <span className="text-[13px] font-semibold text-slate-800 mb-1">Preview Loading Failed</span>
            <p className="text-[11.5px] text-slate-500 max-w-[280px] mb-4">{error}</p>
            <button
              onClick={() => {
                setLoading(true);
                setError(null);
                onExpired?.();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[12px] font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <RefreshCw size={13} /> Reload Preview
            </button>
          </div>
        )}

        {/* PDF Layout */}
        {isPdf && !error && (
          <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto max-h-[500px]">
            <div className="shadow-lg border border-slate-200 bg-white rounded-sm">
              <Document
                file={file.url}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={null}
              >
                <Page
                  pageNumber={pageNumber}
                  width={380}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </Document>
            </div>
          </div>
        )}

        {/* DOCX Layout */}
        {isDocx && !error && (
          <div className="flex-1 p-6 overflow-y-auto max-h-[500px] flex justify-center">
            <div
              ref={docxContainerRef}
              className="bg-white shadow-lg border border-slate-200 p-8 w-full max-w-[460px] h-fit min-h-[400px] docx-preview-container text-slate-800"
            />
          </div>
        )}
      </div>

      {/* Footer Navigation (only for PDF) */}
      {isPdf && !error && numPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200 bg-slate-50 select-none">
          <span className="text-[11px] text-slate-500 font-medium">
            {file.sizeKb} KB · {numPages} pages
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              disabled={pageNumber === 1}
              className="p-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-[11px] text-slate-600 font-semibold">
              Page {pageNumber} of {numPages}
            </span>
            <button
              onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
              disabled={pageNumber === numPages}
              className="p-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Footer for DOCX or single-page PDF */}
      {(!isPdf || numPages <= 1) && !error && (
        <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 font-medium">
          {file.sizeKb} KB · Continuous flow
        </div>
      )}
    </div>
  );
}
