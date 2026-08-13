import React, { useEffect, useRef, useState } from "react";
import { Search, MapPin, ChevronDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TALENT_POOL_LOCATION_OPTIONS } from "../constants/talentPoolConstants";

// GET /talent-pool/candidates' real filters — all server-side, never a
// client-side refine over the current page: `skills` (repeatable, OR'd),
// `designation` (substring), `locations` (repeatable, OR'd — the dropdown
// checkbox list), and experience_min/experience_max (range).
//
// One search box covers both designation and skills: typing filters by
// designation live; pressing Enter turns the current text into a skill
// chip instead (multi-skill search) and clears the designation side of it.
export default function TalentPoolFilters({
  skills,
  addSkill,
  removeSkill,
  designation,
  setDesignation,
  locations,
  toggleLocation,
  experienceMin,
  setExperienceMin,
  experienceMax,
  setExperienceMax,
}) {
  const [searchInput, setSearchInput] = useState(designation);
  const [locationOpen, setLocationOpen] = useState(false);
  const locationRef = useRef(null);

  useEffect(() => {
    if (!locationOpen) return;
    const handleClickOutside = (e) => {
      if (locationRef.current && !locationRef.current.contains(e.target)) {
        setLocationOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [locationOpen]);

  const handleSearchChange = (value) => {
    setSearchInput(value);
    setDesignation(value);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (!searchInput.trim()) return;
    addSkill(searchInput);
    setSearchInput("");
    setDesignation("");
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 flex-1 min-w-[260px] flex-wrap">
        <Search size={15} className="text-slate-400 shrink-0" />
        {skills.map((s) => (
          <Badge
            key={s}
            className="bg-indigo-50 text-indigo-700 border-indigo-100 font-semibold px-2 py-0.5 text-[11px] gap-1 shrink-0"
          >
            {s}
            <button type="button" onClick={() => removeSkill(s)} className="hover:text-indigo-900">
              <X size={11} />
            </button>
          </Badge>
        ))}
        <input
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search designation, or type a skill + Enter"
          className="outline-none text-[13px] flex-1 min-w-[140px] bg-transparent text-slate-900"
        />
      </div>

      <div className="relative" ref={locationRef}>
        <button
          type="button"
          onClick={() => setLocationOpen((o) => !o)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-[13px] text-slate-600 hover:bg-slate-50"
        >
          <MapPin size={14} className="text-slate-400" />
          Location{locations.length > 0 ? ` (${locations.length})` : ""}
          <ChevronDown size={14} className="text-slate-400" />
        </button>
        {locationOpen && (
          <div className="absolute z-10 mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-lg p-2.5 space-y-1.5">
            {TALENT_POOL_LOCATION_OPTIONS.map((loc) => (
              <label key={loc} className="flex items-center gap-2 cursor-pointer select-none px-1 py-0.5 rounded hover:bg-slate-50">
                <input
                  type="checkbox"
                  className="accent-indigo-600 h-3.5 w-3.5"
                  checked={locations.includes(loc)}
                  onChange={() => toggleLocation(loc)}
                />
                <span className="text-[12.5px] text-slate-700">{loc}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min="0"
          value={experienceMin}
          onChange={(e) => setExperienceMin(e.target.value)}
          placeholder="Min yrs"
          className="w-20 px-2.5 py-2 rounded-xl bg-white border border-slate-200 outline-none text-[13px] text-slate-900"
        />
        <span className="text-slate-400 text-[12px]">–</span>
        <input
          type="number"
          min="0"
          value={experienceMax}
          onChange={(e) => setExperienceMax(e.target.value)}
          placeholder="Max yrs"
          className="w-20 px-2.5 py-2 rounded-xl bg-white border border-slate-200 outline-none text-[13px] text-slate-900"
        />
      </div>
    </div>
  );
}
