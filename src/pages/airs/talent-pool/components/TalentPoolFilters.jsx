import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Filter, Search as SearchIcon } from "lucide-react";
import Button from "@/components/Button/Button";
import { TALENT_POOL_SEARCH_MODES } from "../constants/talentPoolConstants";
import TalentPoolFilterPanel from "./TalentPoolFilterPanel";

function countActiveFilters(filters) {
  return (
    filters.locations.length +
    filters.designations.length +
    filters.degreeLevels.length +
    filters.educationFields.length +
    filters.campaignIds.length +
    filters.pipelineStages.length +
    (filters.experienceMin !== "" || filters.experienceMax !== "" ? 1 : 0) +
    (filters.scoreMin !== "" || filters.scoreMax !== "" ? 1 : 0)
  );
}

const SEARCH_MODE_OPTIONS = [
  { value: TALENT_POOL_SEARCH_MODES.NORMAL, label: "Normal" },
  { value: TALENT_POOL_SEARCH_MODES.SEMANTIC, label: "Semantic" },
];

const NORMAL_PLACEHOLDER = "Search candidate name, designation, or skills...";

const SEMANTIC_PLACEHOLDERS = [
  "Search based on resume text...",
  "Search based on candidate profile...",
  "Search based on job description...",
  "Describe the candidate you're looking for...",
  "Describe the skills and experience you need...",
  "Describe the role and requirements you're looking for...",
];

// Every placeholder types itself out character-by-character, holds briefly
// once fully typed, then rotates to the next one.
const TYPING_SPEED_MS = 45;
const TYPED_HOLD_MS = 1200;

// M13 main search row — the search-mode selector (Normal/Semantic) sits
// beside the free-text input. Typing debounces straight into a candidate
// request (see useTalentPool) — there's no explicit Search action.
//
// The Filters button sits beside it and opens a portal-positioned panel
// anchored to the button's own getBoundingClientRect (recalculated on open/
// scroll/resize), matching the project's existing "Client Filters" pattern
// (FilterBar.jsx under resource_management) rather than a fixed screen
// position.
export default function TalentPoolFilters({
  searchInput,
  setSearchInput,
  searchMode,
  setSearchMode,
  filters,
  applyFilters,
  clearAllFilters,
  filterOptions,
  filterOptionsLoading,
  filterOptionsError,
}) {
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState(null);
  const buttonRef = useRef(null);
  const activeCount = useMemo(() => countActiveFilters(filters), [filters]);

  const [modeOpen, setModeOpen] = useState(false);
  const modeWrapperRef = useRef(null);
  const selectedMode = SEARCH_MODE_OPTIONS.find((o) => o.value === searchMode) ?? SEARCH_MODE_OPTIONS[0];
  const isSemantic = searchMode === TALENT_POOL_SEARCH_MODES.SEMANTIC;

  // Rotates through a set of example prompts while Semantic mode is active —
  // purely a placeholder hint, doesn't touch searchInput/searchText. Each one
  // types itself out a character at a time before advancing to the next.
  const [semanticPlaceholder, setSemanticPlaceholder] = useState(SEMANTIC_PLACEHOLDERS[0]);
  useEffect(() => {
    if (!isSemantic) return;
    let cancelled = false;
    let timeoutId;

    const runIndex = (index) => {
      const text = SEMANTIC_PLACEHOLDERS[index];
      const next = () => {
        if (!cancelled) runIndex((index + 1) % SEMANTIC_PLACEHOLDERS.length);
      };

      let charCount = 0;
      const typeChar = () => {
        if (cancelled) return;
        charCount += 1;
        setSemanticPlaceholder(text.slice(0, charCount));
        timeoutId = setTimeout(charCount < text.length ? typeChar : next, charCount < text.length ? TYPING_SPEED_MS : TYPED_HOLD_MS);
      };
      typeChar();
    };

    runIndex(0);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [isSemantic]);

  const searchPlaceholder = isSemantic ? semanticPlaceholder : NORMAL_PLACEHOLDER;

  useEffect(() => {
    if (!modeOpen) return;
    const handleOutsideClick = (e) => {
      if (modeWrapperRef.current && !modeWrapperRef.current.contains(e.target)) {
        setModeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [modeOpen]);

  useEffect(() => {
    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const panelWidth = 360;
      const panelHeight = 390;

      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const align = spaceBelow < panelHeight && spaceAbove > spaceBelow ? "up" : "down";

      let horizontalPos = { left: rect.left };
      if (rect.left + panelWidth > viewportWidth) {
        horizontalPos = { right: Math.max(16, viewportWidth - rect.right) };
        delete horizontalPos.left;
      }

      setDropdownPos({
        top: align === "up" ? "auto" : rect.bottom + 8,
        bottom: align === "up" ? viewportHeight - rect.top + 8 : "auto",
        ...horizontalPos,
        align,
        maxHeight: Math.min(viewportHeight * 0.85, align === "up" ? spaceAbove - 24 : spaceBelow - 24),
      });
    };

    if (open) {
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
    }
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  return (
    <div className="flex w-full flex-col sm:flex-row sm:items-center justify-end gap-2.5 font-sans">
      <div ref={modeWrapperRef} className="relative w-28 shrink-0">
        <Button
          variant="secondary"
          size="small"
          className="h-10 w-full justify-between rounded-lg px-3 py-0"
          onClick={() => setModeOpen((o) => !o)}
        >
          <span className="truncate">{selectedMode.label}</span>
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${modeOpen ? "rotate-180" : ""}`} />
        </Button>

        {modeOpen && (
          <div className="absolute left-0 top-full z-20 mt-1 w-32 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
            {SEARCH_MODE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setSearchMode(option.value);
                  setModeOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-[#B83280]/10"
              >
                {option.label}
                {option.value === searchMode && <Check className="h-3.5 w-3.5 text-[#B83280]" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={`relative w-full transition-all ${isSemantic ? "sm:flex-1" : "sm:w-[360px]"}`}>
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-10 w-full border border-slate-400 rounded-md bg-white pl-9 pr-3 text-xs outline-none focus:border-indigo-500 text-slate-700 placeholder:text-slate-500"
        />
      </div>

      <div ref={buttonRef} className="shrink-0">
        <Button
          variant={open ? "primary" : "outline"}
          size="small"
          className="relative h-10 rounded-lg px-5 py-0"
          onClick={() => setOpen((o) => !o)}
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
          {activeCount > 0 && (
            <span className={`flex h-4 min-w-4 px-1 items-center justify-center rounded-full text-[10px] font-bold ${
              open ? "bg-white text-[#0A0082]" : "bg-[#0A0082] text-white"
            }`}>
              {activeCount}
            </span>
          )}
        </Button>
      </div>

      {open &&
        dropdownPos &&
        createPortal(
          <TalentPoolFilterPanel
            open={open}
            appliedFilters={filters}
            options={filterOptions}
            optionsLoading={filterOptionsLoading}
            optionsError={filterOptionsError}
            onApply={applyFilters}
            onClear={clearAllFilters}
            onClose={() => setOpen(false)}
            positionStyle={{
              top: dropdownPos.top === "auto" ? "auto" : `${dropdownPos.top}px`,
              bottom: dropdownPos.bottom === "auto" ? "auto" : `${dropdownPos.bottom}px`,
              right: dropdownPos.right !== undefined ? `${dropdownPos.right}px` : "auto",
              left: dropdownPos.left !== undefined ? `${dropdownPos.left}px` : "auto",
              maxHeight: `${dropdownPos.maxHeight}px`,
            }}
            align={dropdownPos.align}
          />,
          document.body,
        )}
    </div>
  );
}
