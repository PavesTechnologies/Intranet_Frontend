// Reusable data-fetching hook for Epic 4 Phase 3 (RMS Asset Integration), mirroring the
// loading/data/error hook shape already used elsewhere in the codebase (e.g.
// src/pages/resource_management/hooks/useAvailability.js). account_receivable itself has no
// existing hooks/ folder — its pages currently call services directly from useEffect (see
// ToolPricingPage.jsx) — but this hook exists specifically so future Invoice pages can get
// RMS project assets with loading/error handling already wired up, without knowing whether the
// data comes from RMS or the temporary mock in rmsProjectAssetService.ts.
import { useEffect, useState } from "react";
import { getBillableAssetsForProject } from "../services/rmsProjectAssetService";

export function useProjectBillableAssets(projectId) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(Boolean(projectId));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!projectId) {
      setAssets([]);
      setLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    getBillableAssetsForProject(projectId)
      .then((result) => {
        if (isMounted) setAssets(Array.isArray(result) ? result : []);
      })
      .catch((err) => {
        if (isMounted) {
          setError(err);
          setAssets([]);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  return { assets, loading, error };
}
