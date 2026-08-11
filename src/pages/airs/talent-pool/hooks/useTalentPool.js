import { useCallback, useEffect, useState } from "react";
import { searchTalentPoolCandidates } from "../services/talentPoolService";
import { TALENT_POOL_PAGE_SIZE } from "../constants/talentPoolConstants";

// Real Talent Pool list — GET /talent-pool/candidates. Already deduped to
// one row per candidate and already carries summary/skills/
// best_composite_score for the card, so no per-candidate follow-up calls
// are needed here. skills/locations (multiple, OR'd), designation
// (substring), and experienceMin/experienceMax (range) are all real
// server-side filters — never applied client-side.
export default function useTalentPool() {
  const [skills, setSkills] = useState([]);
  const [designation, setDesignation] = useState("");
  const [locations, setLocations] = useState([]);
  const [experienceMin, setExperienceMin] = useState("");
  const [experienceMax, setExperienceMax] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [results, setResults] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const addSkill = (value) => {
    const trimmed = value.trim();
    if (!trimmed || skills.includes(trimmed)) return;
    setSkills((prev) => [...prev, trimmed]);
    setCurrentPage(1);
  };

  const removeSkill = (value) => {
    setSkills((prev) => prev.filter((s) => s !== value));
    setCurrentPage(1);
  };

  const setDesignationFilter = (value) => {
    setDesignation(value);
    setCurrentPage(1);
  };

  // One toggle per checkbox — checked adds the location term, unchecked removes it.
  const toggleLocation = (value) => {
    setLocations((prev) => (prev.includes(value) ? prev.filter((l) => l !== value) : [...prev, value]));
    setCurrentPage(1);
  };

  const setExperienceMinFilter = (value) => {
    setExperienceMin(value);
    setCurrentPage(1);
  };

  const setExperienceMaxFilter = (value) => {
    setExperienceMax(value);
    setCurrentPage(1);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await searchTalentPoolCandidates({
        skills,
        designation: designation.trim() || undefined,
        locations,
        experienceMin: experienceMin !== "" ? Number(experienceMin) : undefined,
        experienceMax: experienceMax !== "" ? Number(experienceMax) : undefined,
        page: currentPage,
        size: TALENT_POOL_PAGE_SIZE,
      });
      const data = res?.data ?? res;
      setResults(data?.items || []);
      setTotalResults(data?.total || 0);
    } catch (err) {
      setError(err);
      setResults([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skills.join("|"), designation, locations.join("|"), experienceMin, experienceMax, currentPage]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    results,
    loading,
    error,
    refetch: load,
    skills,
    addSkill,
    removeSkill,
    designation,
    setDesignation: setDesignationFilter,
    locations,
    toggleLocation,
    experienceMin,
    setExperienceMin: setExperienceMinFilter,
    experienceMax,
    setExperienceMax: setExperienceMaxFilter,
    hasActiveFilters:
      skills.length > 0 || !!designation.trim() || locations.length > 0 || experienceMin !== "" || experienceMax !== "",
    currentPage,
    setCurrentPage,
    totalPages: Math.max(1, Math.ceil(totalResults / TALENT_POOL_PAGE_SIZE)),
    totalResults,
  };
}
