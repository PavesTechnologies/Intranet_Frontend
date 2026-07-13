import React from "react";
import { FileSearch, AlertTriangle, XCircle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../../../../components/ui/sheet";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { renderUploadStatusBadge } from "../utils/resumeIntakeUtils.jsx";

export default function ResumeFileDetailsDrawer({ file, onClose }) {
  return (
    <Sheet open={!!file} onOpenChange={(open) => !open && onClose()}>
      {file && (
        <SheetContent className="bg-white text-slate-900 w-full sm:max-w-md p-0 overflow-hidden flex flex-col">
          <SheetHeader className="p-5 pb-4 border-b border-slate-200 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <SheetTitle className="text-[15px] font-bold text-slate-900 truncate">{file.name}</SheetTitle>
              {renderUploadStatusBadge(file.status)}
            </div>
            <SheetDescription className="text-[12px] text-slate-500">
              {file.sizeLabel} · {file.fileCount} file{file.fileCount > 1 ? "s" : ""} · Uploaded by {file.uploadedBy} · {file.uploadedAt}
            </SheetDescription>
          </SheetHeader>

          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            {file.duplicateOf && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100">
                <AlertTriangle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
                <div className="text-[12.5px] text-rose-700">
                  Possible duplicate of <span className="font-semibold">{file.duplicateOf}</span>. Review before re-parsing.
                </div>
              </div>
            )}

            {(file.status === "Queued" || file.status === "Parsing") && (
              <div className="h-32 flex items-center justify-center">
                <LoadingSpinner text={file.status === "Queued" ? "Waiting in queue..." : "Parsing in progress..."} />
              </div>
            )}

            {file.status === "Failed" && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100">
                <XCircle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
                <div className="text-[12.5px] text-rose-700">
                  Parsing failed for this file. The file may be corrupted or in an unsupported format. Retry from the upload history list.
                </div>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
              <FileSearch className="h-8 w-8 mx-auto mb-2 text-slate-400" />
              <div className="text-[12px] text-slate-500">Resume preview is not available in this environment.</div>
            </div>

            {file.extraction && (
              <div>
                <div className="text-[12px] font-semibold mb-2 text-slate-600">Extracted data</div>
                <div className="grid grid-cols-2 gap-3 text-[12.5px] mb-3">
                  <div>
                    <div className="text-slate-400 text-[11px]">Candidate name</div>
                    <div className="font-semibold text-slate-900">{file.extraction.candidateName}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[11px]">Experience</div>
                    <div className="font-semibold text-slate-900">{file.extraction.experience}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[11px]">Parse confidence</div>
                    <div className="font-semibold text-slate-900">{file.extraction.confidence}%</div>
                  </div>
                </div>
                <div className="text-slate-400 text-[11px] mb-1.5">Detected skills</div>
                <div className="flex flex-wrap gap-1.5">
                  {file.extraction.detectedSkills.map((skill) => (
                    <span key={skill} className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      )}
    </Sheet>
  );
}
