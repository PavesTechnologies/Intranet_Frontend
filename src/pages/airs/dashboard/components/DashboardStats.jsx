import React, { useCallback, useEffect, useState } from "react";
import { Megaphone, Users, Clock, Award, RotateCcw } from "lucide-react";
import { getDashboardStats } from "../services/dashboardService";
import { formatApiError } from "../../campaigns/services/campaignservice";
import { KPICard } from "../../../../components/kpi/KPI";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";

// Matches DashboardStatsResponse from the AIRS OpenAPI schema: four
// StatTileResponse fields, each { value, unit, delta, delta_label, is_estimate }.
const TILES = [
    { key: "open_campaigns", label: "Open campaigns", icon: Megaphone, color: "bg-blue-50 text-blue-600" },
    { key: "candidates_in_pipeline", label: "Candidates in pipeline", icon: Users, color: "bg-indigo-50 text-indigo-600" },
    { key: "avg_time_to_hire_days", label: "Avg. time to hire", icon: Clock, color: "bg-emerald-50 text-emerald-600" },
    { key: "offers_this_quarter", label: "Offers this quarter", icon: Award, color: "bg-amber-50 text-amber-600" },
];

export default function DashboardStats() {
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [errorDetail, setErrorDetail] = useState("");

    const load = useCallback(async () => {
        setIsLoading(true);
        setHasError(false);
        try {
            const res = await getDashboardStats();
            setStats(res?.data ?? null);
        } catch (error) {
            setHasError(true);
            setStats(null);
            const status = error?.response?.status;
            setErrorDetail(`${status ? `${status}: ` : ""}${formatApiError(error, "Unknown error")}`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    if (hasError && !isLoading) {
        return (
            <PageCard className="mb-4">
                <PageCardContent className="flex items-center justify-between gap-4">
                    <span className="text-xs font-semibold text-red-600 truncate">
                        Couldn't load dashboard stats.{errorDetail && <span className="text-slate-400 font-normal ml-1">{errorDetail}</span>}
                    </span>
                    <button onClick={load} className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 shrink-0">
                        <RotateCcw className="h-3 w-3" /> Retry
                    </button>
                </PageCardContent>
            </PageCard>
        );
    }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {TILES.map((tile) => {
                const tileData = stats?.[tile.key];
                const Icon = tile.icon;
                const value = isLoading
                    ? <span className="inline-block h-6 w-14 bg-slate-100 rounded animate-pulse" />
                    : `${tileData?.value ?? "—"}${tileData?.unit ? ` ${tileData.unit}` : ""}`;
                return (
                    <KPICard
                        key={tile.key}
                        label={tile.label}
                        value={value}
                        icon={<Icon className="h-5 w-5" />}
                        color={tile.color}
                    />
                );
            })}
        </div>
    );
}
