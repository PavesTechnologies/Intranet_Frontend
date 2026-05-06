import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchDemands, getSkillGapAnalysis } from "../services/workforceService";
import { toast } from "react-toastify";

/**
 * useSkillGapAnalysis
 *
 * Manages the full lifecycle of the Skill Intelligence analytical layer:
 *  - Demand list fetching + search filtering
 *  - Selected demand state
 *  - Skill gap analysis request/response
 *  - Loading / error / empty states
 *
 * Designed for scalability: certificate gaps, AI recommendations,
 * multi-demand comparison can be added as extensions.
 */
export function useSkillGapAnalysis(resourceId) {
    // ── Demand List State ──────────────────────────────────────────────
    const [demands, setDemands] = useState([]);
    const [demandsLoading, setDemandsLoading] = useState(false);
    const [demandsError, setDemandsError] = useState(null);
    const [demandSearch, setDemandSearch] = useState("");
    const [selectedDemand, setSelectedDemand] = useState(null);

    // ── Skill Gap Analysis State ───────────────────────────────────────
    const [analysisResult, setAnalysisResult] = useState(null);
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const [analysisError, setAnalysisError] = useState(null);

    // ── Derived: Filtered demands for the searchable dropdown ──────────
    const filteredDemands = useMemo(() => {
        if (!demandSearch.trim()) return demands;
        const q = demandSearch.toLowerCase();
        return demands.filter(
            (d) =>
                d.demandName?.toLowerCase().includes(q) ||
                d.projectName?.toLowerCase().includes(q)
        );
    }, [demands, demandSearch]);

    // ── Fetch Demands ──────────────────────────────────────────────────
    const loadDemands = useCallback(async () => {
        setDemandsLoading(true);
        setDemandsError(null);
        try {
            const res = await fetchDemands();
            if (res?.success && Array.isArray(res.data)) {
                setDemands(res.data);
            } else {
                setDemands([]);
            }
        } catch (err) {
            console.error("Failed to fetch demands:", err);
            setDemandsError(
                err.response?.data?.message || "Failed to load demands"
            );
            toast.error(err.response?.data?.message || "Failed to load demands");
        } finally {
            setDemandsLoading(false);
        }
    }, []);

    // ── Run Skill Gap Analysis ─────────────────────────────────────────
    const runAnalysis = useCallback(async () => {
        if (!selectedDemand || !resourceId) return;
        setAnalysisLoading(true);
        setAnalysisError(null);
        setAnalysisResult(null);
        try {
            const res = await getSkillGapAnalysis(selectedDemand.demandId, resourceId);
            if (res?.success) {
                setAnalysisResult(res.data);
            } else {
                setAnalysisError(res?.message || "Analysis returned no data");
            }
        } catch (err) {
            console.error("Skill gap analysis failed:", err);
            const msg =
                err.response?.data?.message || "Skill gap analysis failed";
            setAnalysisError(msg);
            toast.error(msg);
        } finally {
            setAnalysisLoading(false);
        }
    }, [selectedDemand, resourceId]);

    // ── Reset all analysis state (when panel closes or resource changes) ─
    const resetAnalysis = useCallback(() => {
        setSelectedDemand(null);
        setAnalysisResult(null);
        setAnalysisError(null);
        setDemandSearch("");
    }, []);

    return {
        // Demand list
        demands,
        filteredDemands,
        demandsLoading,
        demandsError,
        demandSearch,
        setDemandSearch,
        selectedDemand,
        setSelectedDemand,
        loadDemands,

        // Analysis
        analysisResult,
        analysisLoading,
        analysisError,
        runAnalysis,
        resetAnalysis,

        // Convenience
        canRunAnalysis: !!selectedDemand && !!resourceId && !analysisLoading,
    };
}
