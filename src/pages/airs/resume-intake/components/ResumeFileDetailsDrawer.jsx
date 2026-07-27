import React, { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle2, XCircle, X, Terminal, FileText, Check } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../../../../components/ui/sheet";
import { Badge } from "../../../../components/ui/badge";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { STAGE_LABELS } from "../intake/constants/intakeConstants";
import { renderParseStatusBadge, formatResumeDate } from "../utils/resumeIntakeUtils.jsx";

function Field({ label, children }) {
  return (
    <div className="min-w-0">
      <div className="text-slate-400 text-[10.5px] uppercase tracking-wider font-semibold mb-0.5">{label}</div>
      <div className="font-semibold text-slate-800 text-[13px] truncate">{children || "—"}</div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <div className="text-[11.5px] font-bold text-slate-500 mb-3 border-b border-slate-100 pb-1 uppercase tracking-wide">{children}</div>;
}

export default function ResumeFileDetailsDrawer({ file, detailsData, isLoading, error, onClose }) {
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (file) {
      setActiveTab("overview");
    }
  }, [file]);

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
          <SheetHeader className="p-5 pb-4 border-b border-slate-200 shrink-0 bg-slate-50">
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
                className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </SheetHeader>

          {/* TAB HEADER TABS */}
          {!isLoading && !error && detailsData && (
            <div className="flex border-b border-slate-200 shrink-0 px-5 bg-slate-50">
              {["overview", "metrics", "logs"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 px-1 border-b-2 font-bold text-[10.5px] uppercase tracking-wider transition-colors mr-6 ${
                    activeTab === tab
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-400 hover:text-slate-700"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}

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
                {/* OVERVIEW TAB */}
                {activeTab === "overview" && (
                  <div className="space-y-6">
                    <div>
                      <SectionTitle>Candidate Information</SectionTitle>
                      <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                        <Field label="Full name">{candidate?.full_name}</Field>
                        <Field label="Email">{candidate?.email}</Field>
                        <Field label="Jurisdiction">{candidate?.jurisdiction}</Field>
                        <Field label="Consent given">
                          {candidate?.consent_given ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-semibold">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Yes
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-600 text-xs font-semibold">
                              <XCircle className="h-3.5 w-3.5" /> No
                            </span>
                          )}
                        </Field>
                      </div>
                    </div>

                    <div>
                      <SectionTitle>File Details</SectionTitle>
                      <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                        <div className="col-span-2">
                          <Field label="File path">
                            <span className="font-mono text-[11px] block break-all whitespace-pre-wrap">{resume?.file_path || "—"}</span>
                          </Field>
                        </div>
                        <Field label="File format">{resume?.file_format}</Field>
                        <Field label="Version">
                          v{resume?.version_number ?? "—"} {resume?.is_active_version && <span className="text-blue-600 text-[11px] font-bold">(active)</span>}
                        </Field>
                        <Field label="Page count">{resume?.page_count}</Field>
                        <Field label="Uploaded">{formatResumeDate(resume?.created_at)}</Field>
                        <Field label="Upload source">{resume?.bulk_upload_job_id ? "Bulk ZIP Batch" : "Individual Intake"}</Field>
                      </div>
                    </div>
                  </div>
                )}

                {/* METRICS TAB */}
                {activeTab === "metrics" && (
                  <div className="space-y-6">
                    <div>
                      <SectionTitle>Skill Audit Metrics</SectionTitle>
                      <div className="grid grid-cols-3 gap-3 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-150 text-center">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 font-bold">TOTAL</span>
                          <span className="text-lg font-extrabold text-slate-800 mt-0.5">{skillSummary?.total_skills ?? 0}</span>
                        </div>
                        <div className="flex flex-col border-x border-slate-200">
                          <span className="text-[10px] text-emerald-600 font-bold">MATCHED</span>
                          <span className="text-lg font-extrabold text-emerald-600 mt-0.5">{skillSummary?.matched ?? 0}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-rose-500 font-bold">UNMATCHED</span>
                          <span className="text-lg font-extrabold text-rose-500 mt-0.5">{skillSummary?.unmatched ?? 0}</span>
                        </div>
                      </div>

                      {skillTiers.length > 0 ? (
                        <div className="space-y-2">
                          <div className="text-[11px] font-semibold text-slate-400">NORMALIZATION DETAILS BY MATCH TIER</div>
                          <div className="flex flex-wrap gap-2">
                            {skillTiers.map(([tier, count]) => (
                              <span key={tier} className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1.5 capitalize">
                                <FileText size={10} /> {tier.replace("_", " ")}: {count}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-400 text-xs text-center italic py-4">No skills mapped.</div>
                      )}
                    </div>

                    <div>
                      <SectionTitle>AI Embeddings status</SectionTitle>
                      <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100 grid grid-cols-2 gap-4">
                        <Field label="Embedding generated">
                          {embeddingStatus?.exists ? (
                            <span className="text-emerald-700 font-semibold inline-flex items-center gap-1"><Check size={13} /> Generated</span>
                          ) : "No"}
                        </Field>
                        <Field label="Generated Date">{formatResumeDate(embeddingStatus?.generated_at)}</Field>
                      </div>
                    </div>
                  </div>
                )}

                {/* LOGS TAB */}
                {activeTab === "logs" && (
                  <div className="space-y-6">
                    <div>
                      <SectionTitle>Processing Pipeline Logs</SectionTitle>
                      <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-3 rounded-lg border border-slate-100 mb-4">
                        <Field label="Current status">{processing?.current_status}</Field>
                        <Field label="Current stage">
                          {processing?.current_stage ? STAGE_LABELS[processing.current_stage] || processing.current_stage : "—"}
                        </Field>
                        <Field label="Attempt number">{processing?.attempt_number}</Field>
                        <Field label="Retry count">{processing?.retry_count}</Field>
                        <Field label="Parser used">{parserInfo?.parser_used}</Field>
                        <Field label="Parser version">{parserInfo?.parser_version || resume?.parser_version}</Field>
                      </div>
                    </div>

                    {hasFailure ? (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-[12.5px] font-bold text-rose-800">
                              {failure.failed_stage ? `${STAGE_LABELS[failure.failed_stage] || failure.failed_stage} failed` : "Processing failed"}
                            </div>
                            {failure.classification && (
                              <div className="text-[11px] text-rose-700 mt-0.5">Classification: {failure.classification}</div>
                            )}
                            {failure.moved_to_dlq && (
                              <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-semibold px-2 py-0.5 text-[9.5px] mt-1.5">
                                Moved to dead-letter queue
                              </Badge>
                            )}
                            {failure.error_message && (
                              <div className="mt-3">
                                <div className="text-[10px] text-rose-600 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <Terminal size={11} /> Trace Output
                                </div>
                                <div className="text-[10.5px] text-rose-600 font-mono bg-rose-100/50 border border-rose-100 p-2.5 rounded-lg break-all max-h-48 overflow-y-auto">
                                  {failure.error_message}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                        <div className="text-[12.5px] font-semibold text-emerald-800">
                          Parsing pipeline completed successfully with no errors reported.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </SheetContent>
      )}
    </Sheet>
  );
}
