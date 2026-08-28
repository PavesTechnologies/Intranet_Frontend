import React from "react";
import { Sparkles, Tags, BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getSummaryMock } from "./summaryMock";

const NOT_MENTIONED = "Not mentioned";

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

      {summary.aiCandidateSummary && (
        <div className="p-4 rounded-xl bg-purple-50">
          <div className="flex items-center gap-1.5 text-[12px] font-bold mb-1.5 text-purple-700">
            <Sparkles size={13} /> AI candidate summary
          </div>
          <p className="text-[12.5px] leading-relaxed text-slate-900">{summary.aiCandidateSummary}</p>
        </div>
      )}
    </div>
  );
}
