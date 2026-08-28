import React, { useCallback, useEffect, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Cell } from "recharts";
import { getHiringFunnel } from "../services/dashboardService";
import { formatApiError } from "../../campaigns/services/campaignservice";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import StateMessage from "./StateMessage";

const PERIOD_OPTIONS = [7, 30, 90];

export default function HiringFunnelCard() {
    const [days, setDays] = useState(30);
    const [rows, setRows] = useState([]);
    const [totalCandidates, setTotalCandidates] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [errorDetail, setErrorDetail] = useState("");

    const load = useCallback(async () => {
        setIsLoading(true);
        setHasError(false);
        try {
            const res = await getHiringFunnel(days);
            const data = res?.data;
            // Matches HiringFunnelResponse: { range_days, total_candidates, stages: [{ stage, label, count }] }
            setRows((data?.stages || []).map((s) => ({ stage: s.label, count: s.count })));
            setTotalCandidates(data?.total_candidates ?? null);
        } catch (error) {
            setHasError(true);
            setRows([]);
            const status = error?.response?.status;
            setErrorDetail(`${status ? `${status}: ` : ""}${formatApiError(error, "Unknown error")}`);
        } finally {
            setIsLoading(false);
        }
    }, [days]);

    useEffect(() => { load(); }, [load]);

    return (
        <PageCard className="h-full">
        <PageCardContent>
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h3 className="font-bold text-sm text-slate-900">Hiring funnel</h3>
                    {totalCandidates != null && (
                        <p className="text-[11px] text-slate-400 mt-0.5">{totalCandidates} candidates in range</p>
                    )}
                </div>
                <select
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="text-[11px] font-semibold text-blue-700 bg-blue-50 border-none rounded-full px-3 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                    {PERIOD_OPTIONS.map((d) => (
                        <option key={d} value={d}>Last {d} days</option>
                    ))}
                </select>
            </div>

            {isLoading ? (
                <div className="space-y-2.5 py-1" style={{ minHeight: 220 }}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-5 bg-slate-100 rounded animate-pulse" style={{ width: `${90 - i * 10}%` }} />
                    ))}
                </div>
            ) : hasError ? (
                <StateMessage variant="error" title="Couldn't load the hiring funnel." detail={errorDetail} onRetry={load} minHeight={220} />
            ) : rows.length === 0 ? (
                <StateMessage variant="empty" title="No funnel data for this period." minHeight={220} />
            ) : (
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16 }}>
                        <CartesianGrid stroke="#E6E9F0" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: "#5B6472" }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <YAxis type="category" dataKey="stage" width={90} tick={{ fontSize: 12, fill: "#334155" }} axisLine={false} tickLine={false} />
                        <RTooltip contentStyle={{ borderRadius: 10, border: "1px solid #E6E9F0", fontSize: 12 }} cursor={{ fill: "#F1F5F9" }} />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
                            {rows.map((_, i) => (
                                <Cell key={i} fill="#2563EB" />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            )}
        </PageCardContent>
        </PageCard>
    );
}
