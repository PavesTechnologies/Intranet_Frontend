import React, { useRef } from "react";
import { UploadCloud, CheckCircle2, XCircle, MinusCircle, RefreshCw, AlertTriangle, Download } from "lucide-react";
import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import SkillDrawer from "./SkillDrawer";
import ErrorState from "./ErrorState";
import useBulkImport from "../hooks/useBulkImport";
import { BULK_IMPORT_ACCEPTED_TYPES } from "../constants/skillOntologyConstants";

export default function BulkImportDrawer({ open, onClose, onImported }) {
  const bulk = useBulkImport();
  const fileInputRef = useRef(null);

  const busy = bulk.isValidating || bulk.isUploading || bulk.isDownloadingReport;

  const handleClose = () => {
    bulk.reset();
    onClose();
  };

  const handleImport = async () => {
    const data = await bulk.runImport();
    if (data) onImported?.();
  };

  return (
    <SkillDrawer
      open={open}
      onClose={handleClose}
      title="Bulk Import Skills"
      subtitle="Upload an Excel file of canonical skills."
      width="max-w-xl"
      footer={
        <>
          <Button variant="outline" size="small" onClick={handleClose} disabled={busy}>
            Close
          </Button>
          <Button variant="primary" size="small" onClick={handleImport} disabled={!bulk.canImport} loading={bulk.isUploading}>
            {bulk.isUploading ? `Importing… ${bulk.progress}%` : "Import"}
          </Button>
        </>
      }
    >
      <div
        className={`rounded-xl p-6 border-2 border-dashed border-slate-200 bg-blue-50/40 text-center ${
          busy ? "opacity-60 pointer-events-none" : "cursor-pointer"
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={BULK_IMPORT_ACCEPTED_TYPES.join(",")}
          className="hidden"
          disabled={busy}
          onChange={(e) => bulk.selectFile(e.target.files?.[0] || null)}
        />
        <UploadCloud className="h-8 w-8 text-blue-600 mx-auto mb-2" />
        <div className="text-[13px] font-semibold text-slate-900">
          {bulk.file ? bulk.file.name : "Click to upload an .xlsx file"}
        </div>
        <div className="text-[11px] text-slate-400 mt-1">Supports .xlsx only</div>
      </div>

      {bulk.isValidating && (
        <div className="py-6 flex items-center justify-center">
          <LoadingSpinner text="Validating file…" />
        </div>
      )}

      {bulk.validationError && !bulk.isValidating && (
        <ErrorState
          title="Validation failed"
          message="We couldn't validate this file. Please try again."
          onRetry={bulk.retryValidation}
        />
      )}

      {bulk.validation && !bulk.isValidating && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 text-center">
              <div className="text-[11px] text-slate-400">Total Rows</div>
              <div className="text-lg font-extrabold text-slate-900">{bulk.validation.totalRows}</div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 text-center">
              <div className="text-[11px] text-emerald-700">Valid Rows</div>
              <div className="text-lg font-extrabold text-emerald-700">{bulk.validation.validRows}</div>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 text-center">
              <div className="text-[11px] text-rose-700">Invalid Rows</div>
              <div className="text-lg font-extrabold text-rose-700">{bulk.validation.invalidRows}</div>
            </div>
          </div>

          {bulk.validation.isValid ? (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <p className="text-[11.5px] text-emerald-700">This file passed validation. You can now import it.</p>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-[11.5px] text-amber-700">
                  This file has validation errors. Fix them and upload another file — Import stays disabled until then.
                </p>
              </div>

              {bulk.validation.errors.length > 0 && (
                <div className="max-h-56 overflow-y-auto">
                  <GenericTable
                    headers={["Row", "Field", "Error"]}
                    columns={["row", "field", "message"]}
                    rows={bulk.validation.errors.map((e, i) => ({
                      id: i,
                      row: e.row,
                      field: e.field,
                      message: e.message,
                    }))}
                  />
                </div>
              )}
            </>
          )}
        </>
      )}

      {bulk.result && (
        <div className="grid grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 text-center">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
            <div className="text-[11px] text-emerald-700">Inserted</div>
            <div className="text-lg font-extrabold text-emerald-700">{bulk.result.inserted ?? 0}</div>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 text-center">
            <RefreshCw className="h-4 w-4 text-blue-600 mx-auto mb-1" />
            <div className="text-[11px] text-blue-700">Updated</div>
            <div className="text-lg font-extrabold text-blue-700">{bulk.result.updated ?? 0}</div>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 text-center">
            <MinusCircle className="h-4 w-4 text-amber-600 mx-auto mb-1" />
            <div className="text-[11px] text-amber-700">Skipped</div>
            <div className="text-lg font-extrabold text-amber-700">{bulk.result.skipped ?? 0}</div>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 text-center">
            <XCircle className="h-4 w-4 text-rose-600 mx-auto mb-1" />
            <div className="text-[11px] text-rose-700">Failed</div>
            <div className="text-lg font-extrabold text-rose-700">{bulk.result.failed ?? 0}</div>
          </div>

          {bulk.result.failed > 0 && bulk.result.importId && (
            <div className="col-span-4">
              <Button
                variant="outline"
                size="small"
                className="w-full"
                onClick={bulk.downloadErrorReport}
                loading={bulk.isDownloadingReport}
              >
                <Download className="h-4 w-4 mr-1.5" /> Download Error Report
              </Button>
            </div>
          )}
        </div>
      )}
    </SkillDrawer>
  );
}
