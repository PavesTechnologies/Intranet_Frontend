import React from "react";
import { Briefcase, Inbox } from "lucide-react";
import { formatDateRange, formatExperienceYears } from "../../utils/intakeUtils.jsx";

const TAG_STYLE = {
  current: "bg-blue-50 text-blue-700 border-blue-200",
  internship: "bg-violet-50 text-violet-700 border-violet-200",
  volunteer: "bg-teal-50 text-teal-700 border-teal-200",
};

function EntryTags({ entry }) {
  const tags = [];
  if (entry.is_current) tags.push(["current", "Current"]);
  if (entry.is_internship) tags.push(["internship", "Internship"]);
  if (entry.is_volunteer) tags.push(["volunteer", "Volunteer"]);
  if (tags.length === 0) return null;
  return (
    <div className="flex gap-1.5 mt-1">
      {tags.map(([key, label]) => (
        <span key={key} className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${TAG_STYLE[key]}`}>
          {label}
        </span>
      ))}
    </div>
  );
}

export default function ExperienceSection({ workExperience, totalExperienceYears }) {
  const totalLabel = formatExperienceYears(totalExperienceYears);
  const entries = workExperience || [];

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-[13.5px] font-bold text-slate-900 flex items-center gap-2">
          <Briefcase size={15} className="text-slate-400" /> Experience
        </h2>
        <div className="text-right">
          <div className="text-[11px] text-slate-400 leading-none">Total experience</div>
          <div className={`text-[15px] font-bold leading-tight ${totalLabel ? "text-slate-900" : "text-slate-400"}`}>
            {totalLabel || "Not available"}
          </div>
        </div>
      </div>

      <div className="p-5">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Inbox size={22} className="text-slate-300 mb-2" />
            <div className="text-[12.5px] text-slate-500">No work experience was extracted from this resume.</div>
          </div>
        ) : (
          <ol className="space-y-0">
            {entries.map((entry, i) => (
              <li key={i} className="flex gap-3">
                <div className="flex flex-col items-center pt-1">
                  <div className="w-2 h-2 rounded-full bg-slate-400" />
                  {i !== entries.length - 1 && <div className="w-px flex-1 bg-slate-200 my-1" style={{ minHeight: 28 }} />}
                </div>
                <div className={`pb-5 flex-1 min-w-0`}>
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="text-[13px] font-semibold text-slate-900">
                      {entry.title} <span className="text-slate-400 font-normal">@ {entry.company}</span>
                    </div>
                    <div className="text-[11.5px] text-slate-500 shrink-0 font-mono">
                      {formatDateRange(entry.start_date, entry.end_date, entry.is_current)}
                    </div>
                  </div>
                  <EntryTags entry={entry} />
                  {entry.description && <p className="text-[12.5px] text-slate-600 mt-1.5 leading-relaxed">{entry.description}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
