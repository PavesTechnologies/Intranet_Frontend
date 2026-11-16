import React, { useCallback, useEffect, useState } from "react";
import { getTopCandidates } from "../services/dashboardService";
import { formatApiError } from "../../campaigns/services/campaignservice";
import { initialsOf } from "../utils/normalize";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import StateMessage from "./StateMessage";

export default function TopCandidatesCard() {
    const [candidates, setCandidates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [errorDetail, setErrorDetail] = useState("");

    const load = useCallback(async () => {
        setIsLoading(true);
        setHasError(false);
        try {
            const res = await getTopCandidates(5);
            // Matches TopCandidatesResponse: { candidates: [TopCandidateResponse] }
            setCandidates(res?.data?.candidates || []);
        } catch (error) {
            setHasError(true);
            setCandidates([]);
            const status = error?.response?.status;
            setErrorDetail(`${status ? `${status}: ` : ""}${formatApiError(error, "Unknown error")}`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    return (
        <PageCard className="h-full">
        <PageCardContent>
            <h3 className="font-bold text-sm text-slate-900 mb-3">Top candidates</h3>

            {isLoading ? (
                <div className="space-y-2.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-slate-100 animate-pulse shrink-0" />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
                                <div className="h-2.5 w-32 bg-slate-100 rounded animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : hasError ? (
                <StateMessage variant="error" title="Couldn't load top candidates." detail={errorDetail} onRetry={load} />
            ) : candidates.length === 0 ? (
                <StateMessage variant="empty" title="No candidates to show." />
            ) : (
                <div className="space-y-2.5">
                    {candidates.map((c) => (
                        <div key={c.campaign_candidate_id} className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                                {initialsOf(c.candidate_name)}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-900 truncate">{c.candidate_name || "—"}</p>
                                <p className="text-[11px] text-slate-500 truncate">{c.current_designation || c.campaign_name || "—"}</p>
                            </div>
                            <span className="h-6 w-6 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                {Math.round(c.composite_score)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </PageCardContent>
        </PageCard>
    );
}
