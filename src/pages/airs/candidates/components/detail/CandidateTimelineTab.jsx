import React from "react";

export default function CandidateTimelineTab({ candidate }) {
  const events = [
    ["Uploaded", "Resume ingested via bulk ZIP"],
    ["Parsed", "Sections extracted with 96% confidence"],
    ["Screened", "Passed mandatory skills & experience rules"],
    ["Matched", `Semantic similarity ${candidate.semantic}%`],
    ["Evaluated", `AI composite score ${candidate.composite}%`],
  ];

  return (
    <div className="space-y-4 pl-1">
      {events.map(([title, desc], i) => (
        <div key={title} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-2 h-2 rounded-full mt-1.5 bg-blue-600" />
            {i < events.length - 1 && <div className="w-px flex-1 bg-slate-200" />}
          </div>
          <div className="pb-1">
            <div className="text-[12.5px] font-semibold text-slate-900">{title}</div>
            <div className="text-[11.5px] text-slate-400">{desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
