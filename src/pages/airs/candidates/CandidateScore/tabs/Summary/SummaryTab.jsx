import React from "react";
import { Sparkles } from "lucide-react";
import { getSummaryMock } from "./summaryMock";

const NOT_MENTIONED = "Not mentioned";

// textOrDash (candidateDataUtils) already turns missing values into "-"
// before they reach this component, so we treat "-" the same as empty here.
const isMissing = (v) => v === null || v === undefined || v === "" || v === "-";
const orNotMentioned = (v) => (isMissing(v) ? NOT_MENTIONED : v);

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
            <div className="font-semibold text-slate-900">{orNotMentioned(summary.contact.email)}</div>
            <div className="font-semibold text-slate-900">{orNotMentioned(summary.contact.phone)}</div>
          </div>
        </div>
      </div>

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
