import { useCallback, useEffect, useState } from "react";
import { getTalentPoolFilters } from "../services/talentPoolService";

// M13 — GET /talentpoolfilters. Every categorical filter's option list comes
// from here, never hardcoded. `campaigns` keeps {id, name} pairs so the UI
// can display the name while the applied filter/state stays on the id.
const EMPTY_OPTIONS = {
  locations: [],
  designations: [],
  degreeLevels: [],
  educationFields: [],
  campaigns: [],
  pipelineStages: [],
};

export default function useTalentPoolFilterOptions() {
  const [options, setOptions] = useState(EMPTY_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getTalentPoolFilters();
      const data = res?.data ?? res ?? {};
      setOptions({
        locations: data.locations || [],
        designations: data.designations || [],
        degreeLevels: data.education?.degree_levels || [],
        educationFields: data.education?.fields || [],
        campaigns: data.campaigns || [],
        pipelineStages: data.pipeline_stages || [],
      });
    } catch (err) {
      setError(err);
      setOptions(EMPTY_OPTIONS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { options, loading, error, refetch: load };
}
