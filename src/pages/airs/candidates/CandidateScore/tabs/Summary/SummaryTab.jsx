import React from "react";
import { Sparkles, Tags, BadgeCheck, FileText, ThumbsUp, ThumbsDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getSummaryMock } from "./summaryMock";

const NOT_MENTIONED = "Not mentioned";

const RECOMMENDATION_TONE = {
  SHORTLIST: "bg-emerald-100 text-emerald-700",
  SELECT: "bg-emerald-100 text-emerald-700",
  HOLD: "bg-amber-100 text-amber-700",
  REJECT: "bg-rose-100 text-rose-700",
};

// textOrDash (candidateDataUtils) already turns missing values into "-"
// before they reach this component, so we treat "-" the same as empty here.
const isMissing = (v) => v === null || v === undefined || v === "" || v === "-";

const FIELD_ROWS = [
  ["currentDesignation", "Current designation"],
  ["department", "Department"],
  ["experienceYears", "Experience", (v) => `${v} yrs`],
  ["location", "Location"],
  ["currentCompany", "Current company"],
  ["education", "Education"],
  ["appliedOn", "Applied on"],
  ["status", "Status"],
];

export default function SummaryTab({ candidate }) {
  const summary = getSummaryMock(candidate);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[12.5px]">
          {FIELD_ROWS.map(([key, label, format]) => (
            <div key={key}>
              <div className="text-slate-400">{label}</div>
              <div className="font-semibold text-slate-900">
                {isMissing(summary[key]) ? NOT_MENTIONED : format ? format(summary[key]) : summary[key]}
              </div>
            </div>
          ))}
          <div>
            <div className="text-slate-400">Contact</div>
            {isMissing(summary.contact.email) && isMissing(summary.contact.phone) ? (
              <div className="font-semibold text-slate-900">{NOT_MENTIONED}</div>
            ) : (
              <>
                {!isMissing(summary.contact.email) && (
                  <div className="font-semibold text-slate-900">{summary.contact.email}</div>
                )}
                {!isMissing(summary.contact.phone) && (
                  <div className="font-semibold text-slate-900">{summary.contact.phone}</div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Resume-parsed data, mapped in alongside the campaign-candidate
          fields above — a quick-glance overview without switching to the
          full Resume tab. */}
      {summary.skills.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-1.5 text-[12px] font-bold mb-2.5 text-slate-900">
            <Tags size={13} className="text-slate-400" /> Skills extracted
          </div>
          <div className="flex flex-wrap gap-1.5">
            {summary.skills.map((s) => (
              <Badge key={s} className="bg-slate-100 text-slate-700 border-slate-200 font-medium px-2.5 py-1 text-[11px]">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {summary.certifications.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-1.5 text-[12px] font-bold mb-2.5 text-slate-900">
            <BadgeCheck size={13} className="text-slate-400" /> Certifications
          </div>
          <ul className="text-[12.5px] text-slate-900 space-y-1.5">
            {summary.certifications.map((c) => (
              <li key={c} className="flex items-center gap-1.5">
                <BadgeCheck size={13} className="text-emerald-600 shrink-0" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isMissing(summary.resumeSummary) && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-1.5 text-[12px] font-bold mb-1.5 text-slate-900">
            <FileText size={13} className="text-slate-400" /> Resume summary
          </div>
          <p className="text-[12.5px] leading-relaxed text-slate-700">{summary.resumeSummary}</p>
        </div>
      )}

      {summary.aiCandidateSummary && (
        <div className="p-4 rounded-xl bg-purple-50">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-[12px] font-bold text-purple-700">
              <Sparkles size={13} /> AI candidate summary
            </div>
            {summary.aiCandidateSummary.recommendation && (
              <Badge
                className={`font-bold px-2 py-0.5 text-[10px] border-0 ${
                  RECOMMENDATION_TONE[summary.aiCandidateSummary.recommendation] || "bg-slate-200 text-slate-700"
                }`}
              >
                {summary.aiCandidateSummary.recommendation}
              </Badge>
            )}
          </div>

          {summary.aiCandidateSummary.text && (
            <p className="text-[12.5px] leading-relaxed text-slate-900 mb-2">{summary.aiCandidateSummary.text}</p>
          )}

          {(summary.aiCandidateSummary.strengths.length > 0 || summary.aiCandidateSummary.weaknesses.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
              {summary.aiCandidateSummary.strengths.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 mb-1">
                    <ThumbsUp size={11} /> Strengths
                  </div>
                  <ul className="space-y-1">
                    {summary.aiCandidateSummary.strengths.map((s, i) => (
                      <li key={i} className="text-[12px] text-slate-800 flex gap-1.5">
                        <span className="mt-[6px] w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {summary.aiCandidateSummary.weaknesses.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 mb-1">
                    <ThumbsDown size={11} /> Weaknesses
                  </div>
                  <ul className="space-y-1">
                    {summary.aiCandidateSummary.weaknesses.map((w, i) => (
                      <li key={i} className="text-[12px] text-slate-800 flex gap-1.5">
                        <span className="mt-[6px] w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
