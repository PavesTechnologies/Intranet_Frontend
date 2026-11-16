import { useEffect, useMemo, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Maximize2,
  Minus,
  Plus,
  X,
} from "lucide-react";

import Button from "../../../../components/Button/Button";

// Same CDN worker setup used by the other react-pdf consumers in this codebase (e.g.
// src/pages/accounts-payable/invoice/components/stage1/InvoiceDocumentViewer.jsx).
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;
const SCALE_STEP = 0.15;
const BASE_PAGE_WIDTH = 520;

function getFileKind(file) {
  const type = (file?.type || "").toLowerCase();
  const name = (file?.name || "").toLowerCase();

  if (type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (type.startsWith("image/") || /\.(png|jpe?g)$/.test(name)) return "image";
  return "unsupported";
}

/**
 * Side-by-side quotation document preview for the Add Quotation modal. There is no backend
 * "view document" route yet at this stage (the quotation isn't created until the form is
 * submitted), so this always renders from a local blob URL built from the just-selected
 * `file` — same approach as InvoiceDocumentViewer for the invoice upload pipeline.
 * @param {Object} props
 * @param {File|null} props.file
 * @param {() => void} props.onClose
 */
export default function QuotationDocumentPreview({ file, onClose }) {
  const [objectUrl, setObjectUrl] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loadError, setLoadError] = useState(null);
  const [scale, setScale] = useState(1);

  const kind = useMemo(() => getFileKind(file), [file]);

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return undefined;
    }

    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    setNumPages(null);
    setPageNumber(1);
    setLoadError(null);
    setScale(1);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleDownload = () => {
    if (!objectUrl) return;

    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = file?.name || "quotation-document";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleOpenInNewTab = () => {
    if (objectUrl) window.open(objectUrl, "_blank", "noopener,noreferrer");
  };

  const zoomIn = () => setScale((s) => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)));
  const zoomOut = () => setScale((s) => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)));
  const resetZoom = () => setScale(1);

  const pageWidth = BASE_PAGE_WIDTH * scale;
  const showToolbar = Boolean(objectUrl) && kind !== "unsupported" && !loadError;

  return (
    <div className="flex h-full min-h-[420px] flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
        <h3 className="truncate text-sm font-semibold text-gray-800" title={file?.name}>
          {file?.name || "Quotation Document"}
        </h3>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 p-0"
          onClick={onClose}
          aria-label="Close document preview"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {showToolbar && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 bg-gray-800 px-3 py-2 text-gray-200">
          <div className="flex items-center gap-1.5">
            {kind === "pdf" && (
              <>
                <button
                  type="button"
                  onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                  disabled={pageNumber <= 1}
                  className="rounded p-1 hover:bg-white/10 disabled:opacity-30"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[52px] text-center text-xs font-medium">
                  {pageNumber} / {numPages || "-"}
                </span>
                <button
                  type="button"
                  onClick={() => setPageNumber((p) => Math.min(numPages || p, p + 1))}
                  disabled={!numPages || pageNumber >= numPages}
                  className="rounded p-1 hover:bg-white/10 disabled:opacity-30"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button type="button" onClick={zoomOut} className="rounded p-1 hover:bg-white/10" aria-label="Zoom out">
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-11 text-center text-xs font-medium">{Math.round(scale * 100)}%</span>
            <button type="button" onClick={zoomIn} className="rounded p-1 hover:bg-white/10" aria-label="Zoom in">
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={resetZoom}
              className="rounded p-1 hover:bg-white/10"
              aria-label="Fit to view"
              title="Fit to view"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="rounded p-1 hover:bg-white/10"
              aria-label="Download"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1 items-start justify-center overflow-auto bg-gray-100 p-4">
        {!file && (
          <div className="flex flex-col items-center gap-2 py-16 text-center text-gray-400">
            <FileText className="h-10 w-10" aria-hidden="true" />
            <p className="text-sm font-medium text-gray-600">No document selected</p>
          </div>
        )}

        {file && kind === "unsupported" && (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-gray-500">
            <AlertTriangle className="h-8 w-8 text-amber-500" aria-hidden="true" />
            <p className="max-w-[240px] text-sm font-medium">
              Preview isn&apos;t supported for this file type.
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="small" onClick={handleOpenInNewTab}>
                <ExternalLink className="h-3.5 w-3.5" /> Open
              </Button>
              <Button type="button" variant="outline" size="small" onClick={handleDownload}>
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
            </div>
          </div>
        )}

        {file && kind !== "unsupported" && loadError && (
          <div className="flex flex-col items-center gap-2 py-16 text-center text-gray-400">
            <AlertTriangle className="h-8 w-8 text-red-400" aria-hidden="true" />
            <p className="max-w-[240px] text-sm font-medium text-red-600">{loadError}</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="small" onClick={handleOpenInNewTab}>
                <ExternalLink className="h-3.5 w-3.5" /> Open
              </Button>
              <Button type="button" variant="outline" size="small" onClick={handleDownload}>
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
            </div>
          </div>
        )}

        {objectUrl && kind === "pdf" && !loadError && (
          <div className="relative shadow-sm" style={{ width: pageWidth }}>
            <Document
              file={objectUrl}
              loading={
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-[#0A0082]" aria-hidden="true" />
                </div>
              }
              onLoadSuccess={({ numPages: total }) => setNumPages(total)}
              onLoadError={() => setLoadError("Unable to load this PDF for preview.")}
            >
              <Page
                pageNumber={pageNumber}
                width={pageWidth}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>
          </div>
        )}

        {objectUrl && kind === "image" && !loadError && (
          // eslint-disable-next-line jsx-a11y/img-redundant-alt -- filename doubles as content, not decoration
          <img
            src={objectUrl}
            alt={file?.name || "Quotation document preview"}
            className="max-w-none shadow-sm"
            style={{ width: pageWidth }}
            onError={() => setLoadError("Unable to load this image for preview.")}
          />
        )}
      </div>
    </div>
  );
}
