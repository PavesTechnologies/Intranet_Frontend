import React, { useRef } from "react";
import { UploadCloud, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import Button from "../../../../components/Button/Button";
import SkillDrawer from "./SkillDrawer";
import useBulkImport from "../hooks/useBulkImport";
import { BULK_IMPORT_ACCEPTED_TYPES } from "../constants/skillOntologyConstants";

export default function BulkImportDrawer({ open, onClose, onImported }) {
  const bulk = useBulkImport();
  const fileInputRef = useRef(null);

  const handleClose = () => {
    bulk.reset();
    onClose();
  };

  const handleUpload = async () => {
    await bulk.upload();
    onImported?.();
  };

  return (
    <SkillDrawer
      open={open}
      onClose={handleClose}
      title="Bulk Import Skills"
      subtitle="Upload an Excel file of canonical skills."
      width="max-w-xl"
      footer={
        <Button variant="outline" size="small" onClick={handleClose}>
          Close
        </Button>
      }
    >
      <div
        className="rounded-xl p-6 border-2 border-dashed border-slate-200 bg-blue-50/40 text-center cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={BULK_IMPORT_ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={(e) => bulk.setFile(e.target.files?.[0] || null)}
        />
        <UploadCloud className="h-8 w-8 text-blue-600 mx-auto mb-2" />
        <div className="text-[13px] font-semibold text-slate-900">
          {bulk.file ? bulk.file.name : "Click to upload an .xlsx file"}
        </div>
        <div className="text-[11px] text-slate-400 mt-1">Supports .xlsx only</div>
      </div>

      {bulk.isUploading && (
        <div className="h-1.5 rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${bulk.progress}%` }} />
        </div>
      )}

      <Button variant="primary" size="small" onClick={handleUpload} disabled={!bulk.file} loading={bulk.isUploading} className="w-full">
        {bulk.isUploading ? `Uploading… ${bulk.progress}%` : "Upload"}
      </Button>

      {bulk.result && (
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 text-center">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
            <div className="text-[11px] text-emerald-700">Inserted</div>
            <div className="text-lg font-extrabold text-emerald-700">{bulk.result.inserted ?? 0}</div>
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
        </div>
      )}
    </SkillDrawer>
  );
}
