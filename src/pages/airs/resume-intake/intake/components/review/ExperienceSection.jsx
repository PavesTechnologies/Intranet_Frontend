import React from "react";
import { Briefcase, Inbox, Plus, Trash2 } from "lucide-react";
import { formatDateRange, formatExperienceYears } from "../../utils/intakeUtils.jsx";
import { Input } from "../../../../../../components/ui/input";

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

export default function ExperienceSection({ workExperience, totalExperienceYears, isEditing, onChange, onTotalYearsChange }) {
  const totalLabel = formatExperienceYears(totalExperienceYears);
  const entries = workExperience || [];

  const handleUpdate = (index, key, val) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], [key]: val };
    onChange(updated);
  };

  const handleAdd = () => {
    const newEntry = {
      title: "New Role",
      company: "Company Name",
      start_date: "Month Year",
      end_date: null,
      is_current: false,
      is_internship: false,
      is_volunteer: false,
      description: "",
    };
    onChange([...entries, newEntry]);
  };

  const handleDelete = (index) => {
    const updated = entries.filter((_, idx) => idx !== index);
    onChange(updated);
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-[13.5px] font-bold text-slate-900 flex items-center gap-2">
          <Briefcase size={15} className="text-slate-400" /> Experience
        </h2>
        <div className="text-right">
          {isEditing ? (
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400 mb-0.5">Total experience (years)</span>
              <Input
                type="number"
                step="0.5"
                value={totalExperienceYears ?? ""}
                onChange={(e) => {
                  const val = e.target.value === "" ? null : parseFloat(e.target.value);
                  onTotalYearsChange?.(val);
                }}
                className="w-20 h-7 text-xs text-right font-semibold"
              />
            </div>
          ) : (
            <>
              <div className="text-[11px] text-slate-400 leading-none">Total experience</div>
              <div className={`text-[15px] font-bold leading-tight ${totalLabel ? "text-slate-900" : "text-slate-400"}`}>
                {totalLabel || "Not available"}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="p-5">
        {entries.length === 0 && !isEditing ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Inbox size={22} className="text-slate-300 mb-2" />
            <div className="text-[12.5px] text-slate-500">No work experience was extracted from this resume.</div>
          </div>
        ) : (
          <div className="space-y-4">
            <ol className="space-y-0">
              {entries.map((entry, i) => (
                <li key={i} className="flex gap-3">
                  <div className="flex flex-col items-center pt-1">
                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                    {i !== entries.length - 1 && <div className="w-px flex-1 bg-slate-200 my-1" style={{ minHeight: 28 }} />}
                  </div>
                  <div className="pb-5 flex-1 min-w-0">
                    {isEditing ? (
                      <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-slate-400">ROLE #{i + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleDelete(i)}
                            className="text-rose-600 hover:text-rose-800 transition"
                            title="Delete this role"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-[10px] text-slate-500 font-semibold block mb-1">Role Title</span>
                            <Input
                              value={entry.title || ""}
                              onChange={(e) => handleUpdate(i, "title", e.target.value)}
                              placeholder="e.g. Software Engineer"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-semibold block mb-1">Company</span>
                            <Input
                              value={entry.company || ""}
                              onChange={(e) => handleUpdate(i, "company", e.target.value)}
                              placeholder="e.g. Acme Corp"
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-[10px] text-slate-500 font-semibold block mb-1">Start Date</span>
                            <Input
                              value={entry.start_date || ""}
                              onChange={(e) => handleUpdate(i, "start_date", e.target.value)}
                              placeholder="e.g. Jan 2021"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-semibold block mb-1">End Date</span>
                            <Input
                              value={entry.end_date || ""}
                              onChange={(e) => handleUpdate(i, "end_date", e.target.value)}
                              placeholder="e.g. Dec 2023 or Present"
                              disabled={entry.is_current}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={entry.is_current || false}
                              onChange={(e) => {
                                handleUpdate(i, "is_current", e.target.checked);
                                if (e.target.checked) handleUpdate(i, "end_date", null);
                              }}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            Current job
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={entry.is_internship || false}
                              onChange={(e) => handleUpdate(i, "is_internship", e.target.checked)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            Internship
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={entry.is_volunteer || false}
                              onChange={(e) => handleUpdate(i, "is_volunteer", e.target.checked)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            Volunteer
                          </label>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-500 font-semibold block mb-1">Description</span>
                          <textarea
                            value={entry.description || ""}
                            onChange={(e) => handleUpdate(i, "description", e.target.value)}
                            placeholder="Detail job responsibilities and achievements..."
                            className="w-full rounded-md border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ol>

            {isEditing && (
              <button
                type="button"
                onClick={handleAdd}
                className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-xs font-semibold text-blue-600 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition"
              >
                <Plus size={14} /> Add Work Experience
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
