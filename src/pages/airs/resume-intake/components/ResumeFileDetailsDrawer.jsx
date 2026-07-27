import React from "react";
import { AlertTriangle, CheckCircle2, XCircle, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../../../../components/ui/sheet";
import { Badge } from "../../../../components/ui/badge";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { STAGE_LABELS } from "../intake/constants/intakeConstants";
import { renderParseStatusBadge, formatResumeDate } from "../utils/resumeIntakeUtils.jsx";

function Field({ label, children }) {
  return (
    <div>
      <div className="text-slate-400 text-[11px]">{label}</div>
      <div className="font-semibold text-slate-900 text-[12.5px] truncate">{children}</div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <div className="text-[12px] font-bold text-slate-600 mb-2">{children}</div>;
}

export default function ResumeFileDetailsDrawer({ file, detailsData, isLoading, error, onClose }) {
  const resume = detailsData?.resume;
  const candidate = detailsData?.candidate;
  const processing = detailsData?.processing;
  const skillSummary = detailsData?.skill_summary;
  const embeddingStatus = detailsData?.embedding_status;
  const parserInfo = detailsData?.parser_info;
  const failure = detailsData?.failure;

  const parseStatus = resume?.parse_status || file?.parse_status;
  const hasFailure = parseStatus === "FAILED" && (failure?.error_message || failure?.failed_stage);
  const skillTiers = skillSummary?.by_tier ? Object.entries(skillSummary.by_tier) : [];

  return (
    <Sheet open={!!file} onOpenChange={(open) => !open && onClose()}>
      {file && (
        <SheetContent className="bg-white text-slate-900 w-full sm:max-w-md p-0 overflow-hidden flex flex-col">
          <SheetHeader className="p-5 pb-4 border-b border-slate-200 shrink-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <SheetTitle className="text-[15px] font-bold text-slate-900 truncate">
                    {candidate?.full_name || file.candidate_full_name}
                  </SheetTitle>
                  {renderParseStatusBadge(parseStatus)}
                </div>
                <SheetDescription className="text-[12px] text-slate-500">
                  {candidate?.email || file.candidate_email}
                </SheetDescription>
              </div>
              <button
                type="button"
                onClick={onClose}
                title="Close"
                className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </SheetHeader>

          <div className="p-5 space-y-5 overflow-y-auto flex-1">
            {isLoading && (
              <div className="h-32 flex items-center justify-center">
                <LoadingSpinner text="Loading resume details..." />
              </div>
            )}

            {!isLoading && error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100">
                <XCircle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
                <div className="text-[12.5px] text-rose-700">{error}</div>
              </div>
            )}

            {!isLoading && !error && detailsData && (
              <>
                {hasFailure && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-bold text-rose-800">
                          {failure.failed_stage ? `${STAGE_LABELS[failure.failed_stage] || failure.failed_stage} failed` : "Processing failed"}
                        </div>
                        {failure.classification && (
                          <div className="text-[11.5px] text-rose-700 mt-0.5">Classification: {failure.classification}</div>
                        )}
                        {failure.moved_to_dlq && (
                          <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-semibold px-2 py-0.5 text-[10px] mt-1.5">
                            Moved to dead-letter queue
                          </Badge>
                        )}
                        {failure.error_message && (
                          <details className="mt-2">
                            <summary className="text-[11.5px] text-rose-500 cursor-pointer select-none">Technical details</summary>
                            <div className="text-[11px] text-rose-500 font-mono mt-1 break-all whitespace-pre-wrap">
                              {failure.error_message}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <SectionTitle>Candidate</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Full name">{candidate?.full_name || "—"}</Field>
                    <Field label="Email">{candidate?.email || "—"}</Field>
                    <Field label="Jurisdiction">{candidate?.jurisdiction || "—"}</Field>
                    <Field label="Consent given">
                      {candidate?.consent_given ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-600">
                          <XCircle className="h-3.5 w-3.5" /> No
                        </span>
                      )}
                    </Field>
                  </div>
                </div>

                <div>
                  <SectionTitle>Resume file</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Field label="File path">{resume?.file_path || "—"}</Field>
                    </div>
                    <Field label="File format">{resume?.file_format || "—"}</Field>
                    <Field label="Version">
                      v{resume?.version_number ?? "—"} {resume?.is_active_version && <span className="text-blue-600">(active)</span>}
                    </Field>
                    <Field label="Page count">{resume?.page_count ?? "—"}</Field>
                    <Field label="Uploaded">{formatResumeDate(resume?.created_at)}</Field>
                    <Field label="Upload source">{resume?.bulk_upload_job_id ? "Bulk batch" : "Individual"}</Field>
                  </div>
                </div>

                <div>
                  <SectionTitle>Processing</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Current status">{processing?.current_status || "—"}</Field>
                    <Field label="Current stage">
                      {processing?.current_stage ? STAGE_LABELS[processing.current_stage] || processing.current_stage : "—"}
                    </Field>
                    <Field label="Attempt number">{processing?.attempt_number ?? "—"}</Field>
                    <Field label="Retry count">{processing?.retry_count ?? "—"}</Field>
                  </div>
                </div>

                <div>
                  <SectionTitle>Skill summary</SectionTitle>
                  <div className="grid grid-cols-3 gap-3 mb-2">
                    <Field label="Total">{skillSummary?.total_skills ?? 0}</Field>
                    <Field label="Matched">{skillSummary?.matched ?? 0}</Field>
                    <Field label="Unmatched">{skillSummary?.unmatched ?? 0}</Field>
                  </div>
                  {skillTiers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {skillTiers.map(([tier, count]) => (
                        <span key={tier} className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700">
                          {tier}: {count}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <SectionTitle>Embedding &amp; parser</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Embedding generated">{embeddingStatus?.exists ? "Yes" : "No"}</Field>
                    <Field label="Generated at">{formatResumeDate(embeddingStatus?.generated_at)}</Field>
                    <Field label="Parser used">{parserInfo?.parser_used || "—"}</Field>
                    <Field label="Parser version">{parserInfo?.parser_version || resume?.parser_version || "—"}</Field>
                  </div>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      )}
    </Sheet>
  );
}
