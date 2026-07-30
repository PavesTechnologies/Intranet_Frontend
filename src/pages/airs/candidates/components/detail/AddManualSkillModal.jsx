import React, { useEffect, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { toast } from "react-toastify";
import Modal from "../../../../../components/ui/Modal";
import Button from "../../../../../components/Button/Button";
import { getSkills } from "../../../skill-ontology/services/skillOntologyService";

const SEARCH_MIN_CHARS = 2;

// M07-E01/S04 — searches the real, existing skill ontology (same getSkills
// call the Skill Ontology list page itself uses) rather than a separate/
// duplicated search implementation. Adding a skill never touches scoring —
// it's a local, informational addition to the candidate's profile only.
export default function AddManualSkillModal({ open, excludeSkillNames = [], onClose, onAdd }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [selected, setSelected] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (open) return;
    setQuery("");
    setResults([]);
    setSelected(null);
    setSearchError(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (query.trim().length < SEARCH_MIN_CHARS) {
      setResults([]);
      setIsSearching(false);
      setSearchError(false);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(false);
      try {
        const res = await getSkills({ search: query.trim(), page: 1, page_size: 10 });
        const items = res?.data?.items || [];
        setResults(items.filter((s) => !excludeSkillNames.includes(s.canonicalName)));
      } catch {
        setResults([]);
        setSearchError(true);
      } finally {
        setIsSearching(false);
      }
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [query, open, excludeSkillNames]);

  const handleAdd = async () => {
    if (!selected) return;
    setIsSaving(true);
    try {
      await onAdd(selected);
      toast.success(`"${selected.canonicalName}" added to this candidate.`);
    } catch {
      toast.error("Failed to add the skill. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Add Skill Manually" width="440px">
      <div className="space-y-4">
        <p className="text-[12px] text-slate-500">
          Search the skill ontology and select a skill to add to this candidate's profile.
        </p>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
            }}
            placeholder="Search skills (min 2 characters)..."
            className="w-full pl-9 pr-8 py-2.5 rounded-lg border border-slate-200 text-[13px] outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Search skill ontology"
          />
          {selected && (
            <button
              onClick={() => {
                setSelected(null);
                setQuery("");
              }}
              className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-600"
              aria-label="Clear selection"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {!selected && query.trim().length >= SEARCH_MIN_CHARS && (
          <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
            {isSearching ? (
              <div className="flex items-center gap-2 px-3 py-2.5 text-[12.5px] text-slate-400">
                <Loader2 size={13} className="animate-spin" /> Searching…
              </div>
            ) : searchError ? (
              <p className="px-3 py-2.5 text-[12.5px] text-rose-500">Couldn't search skills. Try again.</p>
            ) : results.length === 0 ? (
              <p className="px-3 py-2.5 text-[12.5px] text-slate-400">No skills found.</p>
            ) : (
              results.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => {
                    setSelected(skill);
                    setQuery(skill.canonicalName);
                  }}
                  className="w-full text-left px-3 py-2 text-[12.5px] hover:bg-slate-50 text-slate-700"
                >
                  {skill.canonicalName}
                </button>
              ))
            )}
          </div>
        )}

        {selected && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-[12.5px] text-emerald-700">
            Selected: <span className="font-semibold">{selected.canonicalName}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="small" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" size="small" onClick={handleAdd} disabled={!selected} loading={isSaving}>
            Add Skill
          </Button>
        </div>
      </div>
    </Modal>
  );
}
