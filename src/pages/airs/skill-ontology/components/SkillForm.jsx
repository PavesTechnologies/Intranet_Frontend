import React, { useEffect, useRef, useState } from "react";
import { X, Loader2 } from "lucide-react";
import FilterListbox from "../../../../components/filter/FilterListbox";
import AliasEditor from "./AliasEditor";
import { searchParents, getCategories } from "../services/skillOntologyService";
import { CONFIDENCE_FORM_OPTIONS, STATUS_FORM_OPTIONS } from "../constants/skillOntologyConstants";

const PARENT_SEARCH_MIN_CHARS = 2;

// Shared field markup for both AddSkillModal and EditSkillModal — a pure
// controlled component; the wrapper owns values/errors/validation/submit.
//
// categoryOptions is optional: SkillOntologyPage already has these (from its
// own list fetch) and passes them straight through, so opening Add/Edit there
// never fires a second categories request. SkillDetailPage's Edit modal has
// no such list to borrow from, so when the prop is omitted this falls back to
// fetching its own — deduped/logged by the service layer either way.
export default function SkillForm({ values, errors, onFieldChange, excludeSkillId, categoryOptions: categoryOptionsProp }) {
  const [fetchedCategoryOptions, setFetchedCategoryOptions] = useState([]);
  const categoryOptions = categoryOptionsProp ?? fetchedCategoryOptions;
  const [parentQuery, setParentQuery] = useState(values.parentSkillName || "");
  const [parentResults, setParentResults] = useState([]);
  const [parentOpen, setParentOpen] = useState(false);
  const [isSearchingParent, setIsSearchingParent] = useState(false);
  const [parentSearchError, setParentSearchError] = useState(false);
  const debounceRef = useRef(null);

  const hasCategoryOptionsProp = Boolean(categoryOptionsProp);
  useEffect(() => {
    if (hasCategoryOptionsProp) return; // parent already fetched these — don't duplicate the request
    getCategories()
      .then((res) => setFetchedCategoryOptions((res?.data || []).map((c) => ({ label: c.category, value: c.category }))))
      .catch(() => setFetchedCategoryOptions([]));
  }, [hasCategoryOptionsProp]);

  useEffect(() => {
    if (!parentOpen) return;
    if (parentQuery.trim().length < PARENT_SEARCH_MIN_CHARS) {
      setParentResults([]);
      setIsSearchingParent(false);
      setParentSearchError(false);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsSearchingParent(true);
      setParentSearchError(false);
      try {
        const res = await searchParents(parentQuery.trim());
        const items = (res?.data || []).filter((s) => s.id !== excludeSkillId);
        setParentResults(items);
      } catch {
        setParentResults([]);
        setParentSearchError(true);
      } finally {
        setIsSearchingParent(false);
      }
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [parentQuery, parentOpen, excludeSkillId]);

  const selectParent = (skill) => {
    onFieldChange("parentSkillId", skill.id);
    setParentQuery(skill.canonicalName);
    setParentOpen(false);
  };

  const clearParent = () => {
    onFieldChange("parentSkillId", "");
    setParentQuery("");
  };

  return (
    <>
      <div>
        <label className="text-[12px] font-semibold text-slate-600">Canonical name</label>
        <input
          type="text"
          value={values.canonicalName}
          onChange={(e) => onFieldChange("canonicalName", e.target.value)}
          placeholder="e.g. Kubernetes"
          className="w-full mt-1 px-3 py-2.5 rounded-lg border border-slate-200 text-[13px] outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.canonicalName && <p className="text-[11px] text-rose-600 mt-1">{errors.canonicalName}</p>}
      </div>

      <div>
        <label className="text-[12px] font-semibold text-slate-600">Category</label>
        <div className="mt-1">
          <FilterListbox
            options={[{ label: "Select a category…", value: "" }, ...categoryOptions]}
            value={values.category}
            onChange={(v) => onFieldChange("category", v)}
          />
        </div>
        {errors.category && <p className="text-[11px] text-rose-600 mt-1">{errors.category}</p>}
      </div>

      <div>
        <label className="text-[12px] font-semibold text-slate-600">Aliases</label>
        <div className="mt-1">
          <AliasEditor
            aliases={values.aliases}
            onAdd={(alias) => onFieldChange("aliases", [...values.aliases, alias])}
            onRemove={(alias) => onFieldChange("aliases", values.aliases.filter((a) => a !== alias))}
          />
        </div>
      </div>

      <div className="relative">
        <label className="text-[12px] font-semibold text-slate-600">Parent skill</label>
        <div className="mt-1 relative">
          <input
            type="text"
            value={parentQuery}
            onChange={(e) => {
              setParentQuery(e.target.value);
              setParentOpen(true);
            }}
            onFocus={() => setParentOpen(true)}
            placeholder="Type at least 2 characters to search…"
            className="w-full px-3 py-2.5 pr-8 rounded-lg border border-slate-200 text-[13px] outline-none focus:ring-2 focus:ring-blue-500"
          />
          {values.parentSkillId && (
            <button onClick={clearParent} className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
          {parentOpen && parentQuery.trim().length >= PARENT_SEARCH_MIN_CHARS && (
            <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {isSearchingParent ? (
                <div className="flex items-center gap-2 px-3 py-2.5 text-[12.5px] text-slate-400">
                  <Loader2 size={13} className="animate-spin" /> Searching…
                </div>
              ) : parentSearchError ? (
                <p className="px-3 py-2.5 text-[12.5px] text-rose-500">Couldn't load parent skills. Try again.</p>
              ) : parentResults.length === 0 ? (
                <p className="px-3 py-2.5 text-[12.5px] text-slate-400">No skills found.</p>
              ) : (
                parentResults.map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => selectParent(skill)}
                    className="w-full text-left px-3 py-2 text-[12.5px] hover:bg-slate-50 text-slate-700"
                  >
                    {skill.canonicalName}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[12px] font-semibold text-slate-600">Confidence</label>
          <div className="mt-1">
            <FilterListbox
              options={CONFIDENCE_FORM_OPTIONS}
              value={values.confidence}
              onChange={(v) => onFieldChange("confidence", v)}
            />
          </div>
          {errors.confidence && <p className="text-[11px] text-rose-600 mt-1">{errors.confidence}</p>}
        </div>
        <div>
          <label className="text-[12px] font-semibold text-slate-600">Status</label>
          <div className="mt-1">
            <FilterListbox
              options={STATUS_FORM_OPTIONS}
              value={values.status}
              onChange={(v) => onFieldChange("status", v)}
            />
          </div>
          {errors.status && <p className="text-[11px] text-rose-600 mt-1">{errors.status}</p>}
        </div>
      </div>
    </>
  );
}
