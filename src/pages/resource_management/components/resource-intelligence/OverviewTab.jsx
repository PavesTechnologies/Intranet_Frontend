import { useState, useEffect, useMemo } from "react";
import {
    Users, MapPin, Briefcase, Calendar, Percent,
    TrendingUp, FolderKanban, ArrowRight, Shield,
    CheckCircle2, AlertTriangle, Award, Building2, Clock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getDashboardSummaryDateRange } from "../../services/workforceService";
import Pagination from "../../../../components/Pagination/pagination";

// ── Date Helpers ───────────────────────────────────────────────────────────
const parseDate = (str) => {
    if (!str) return new Date();
    if (str instanceof Date) return str;
    const parts = str.split(/[-/]/);
    if (parts.length === 3) {
        // Assume YYYY-MM-DD or DD-MM-YYYY
        const year = parts[0].length === 4 ? parts[0] : parts[2];
        const month = parts[0].length === 4 ? parts[1] : parts[1];
        const day = parts[0].length === 4 ? parts[2] : parts[0];
        return new Date(year, month - 1, day);
    }
    return new Date(str);
};

const formatDate = (date) => {
    return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatShortDate = (date) => {
    return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const formatApiDate = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatHours = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return "0h";
    return `${number.toFixed(2).replace(/\.00$/, "")}h`;
};

const resolveResourceId = (resource) => (
    resource?.employeeId ||
    resource?.resourceId ||
    resource?.userId ||
    resource?.id
);

const buildUtilizationMonths = (today = new Date()) => {
    const months = [];
    for (let offset = 3; offset >= 0; offset -= 1) {
        const start = new Date(today.getFullYear(), today.getMonth() - offset, 1);
        const isCurrentMonth = offset === 0;
        const end = isCurrentMonth
            ? new Date(today.getFullYear(), today.getMonth(), today.getDate())
            : new Date(today.getFullYear(), today.getMonth() - offset + 1, 0);

        months.push({
            startDate: formatApiDate(start),
            endDate: formatApiDate(end),
            period: start.toLocaleDateString(undefined, { month: "short" }),
        });
    }
    return months;
};

const findEmployeeSummary = (summary, resourceId) => {
    const list = Array.isArray(summary)
        ? summary
        : Array.isArray(summary?.data)
            ? summary.data
            : Array.isArray(summary?.users)
                ? summary.users
                : Array.isArray(summary?.resourceSummaries)
                    ? summary.resourceSummaries
                    : Array.isArray(summary?.employeeProductivity)
                        ? summary.employeeProductivity
                        : null;

    if (!list) return summary;

    return list.find((item) => String(item.employeeId || item.userId || item.resourceId || item.id) === String(resourceId)) || {};
};

const normalizeBillableSummary = (summary) => {
    const billableHours = Number(summary?.billableActivity?.billableHours ?? summary?.billableHours ?? summary?.billable) || 0;
    const nonBillableHours = Number(summary?.billableActivity?.nonBillableHours ?? summary?.nonBillableHours ?? summary?.nonBillable) || 0;
    const totalHours = Number(summary?.totalHours) || billableHours + nonBillableHours;
    const billablePercentage = Number(summary?.billableActivity?.billablePercentage ?? summary?.billablePercentage) || 0;

    return {
        billableHours,
        nonBillableHours,
        totalHours,
        billablePercentage,
        dateRange: summary?.dateRange,
    };
};

// ── Mini Info Row ──────────────────────────────────────────────────────────
function MiniInfoRow({ label, value, icon: Icon }) {
    return (
        <div className="flex flex-wrap items-center justify-between py-2 border-b border-slate-50 last:border-0 font-sans gap-2">
            <div className="flex items-center gap-2 text-slate-400 min-w-[100px]">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-[11px] sm:text-xs font-medium text-slate-500 whitespace-nowrap">{label}</span>
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-900 truncate max-w-[120px] sm:max-w-none">{value || "—"}</span>
        </div>
    );
}

// ── Utilization Chart ──────────────────────────────────────────────────────
function UtilizationChart({ data }) {
    const list = Array.isArray(data) ? data : (data?.data && Array.isArray(data.data) ? data.data : []);

    if (!list || list.length === 0) {
        return <div className="flex items-center justify-center h-full text-[10px] text-slate-400 font-medium font-sans">No Trend Data Available</div>;
    }
    const maxVal = Math.max(...list.map(d => (d.billable || 0) + (d.nonBillable || 0)), 1);

    return (
        <div className="flex-1 w-full flex items-end gap-1.5 min-h-[80px]">
            {list.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                    <div className="w-full flex flex-col justify-end flex-1 min-h-[40px]">
                        <div
                            className="w-full bg-emerald-400 rounded-t-[2px] transition-all hover:brightness-95"
                            style={{ height: `${((d.billable || 0) / maxVal) * 100}%` }}
                        />
                        <div
                            className="w-full bg-slate-100 rounded-b-[2px]"
                            style={{ height: `${((d.nonBillable || 0) / maxVal) * 100}%` }}
                        />
                    </div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight whitespace-nowrap">{d.period}</span>
                </div>
            ))}
        </div>
    );
}

// ── Timeline Bar ───────────────────────────────────────────────────────────
function TimelineBar({ resource }) {
    const blocks = resource.allocationTimeline || []
    if (blocks.length === 0) {
        return <div className="h-2 w-full bg-slate-100 rounded-full" />
    }

    const earliest = Math.min(...blocks.map((b) => parseDate(b.startDate).getTime()))
    const latest = Math.max(...blocks.map((b) => parseDate(b.endDate).getTime()))
    const totalSpan = latest - earliest || 1
    const today = Date.now()

    return (
        <div className="relative pt-4 pb-2 font-sans">
            <div className="relative h-6 sm:h-8 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden shadow-inner">
                {blocks.map((block, i) => {
                    const start = parseDate(block.startDate).getTime()
                    const end = parseDate(block.endDate).getTime()
                    const leftPct = ((start - earliest) / totalSpan) * 100
                    const widthPct = ((end - start) / totalSpan) * 100

                    let color = "bg-emerald-400/80"
                    if (block.allocation > 100) color = "bg-rose-400/80"
                    else if (block.allocation > 70) color = "bg-amber-400/80"
                    else if (block.allocation > 20) color = "bg-indigo-400/80"

                    return (
                        <div
                            key={`${block.project}-${i}`}
                            className={cn(
                                "absolute top-0 h-full border-r border-white/20 transition-all hover:brightness-110",
                                block.tentative ? "bg-slate-300/40 border-r border-dashed border-slate-400" : color
                            )}
                            style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 1)}%` }}
                            title={`${block.project}: ${block.allocation}% (${formatShortDate(block.startDate)} - ${formatShortDate(block.endDate)})`}
                        />
                    )
                })}
                {today >= earliest && today <= latest && (
                    <div
                        className="absolute top-0 h-full w-0.5 bg-indigo-600 z-10 shadow-[0_0_8px_rgba(79,70,229,0.5)]"
                        style={{ left: `${((today - earliest) / totalSpan) * 100}%` }}
                    />
                )}
            </div>
            <div className="flex justify-between mt-2 px-0.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{formatShortDate(earliest)}</span>
                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded">Current</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{formatShortDate(latest)}</span>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function OverviewTab({ resource }) {
    const [utilization, setUtilization] = useState(null);
    const [utilLoading, setUtilLoading] = useState(true);
    const [billableSummary, setBillableSummary] = useState(null);

    // Pagination for Quick Views
    const [certPage, setCertPage] = useState(1);
    const [projPage, setProjPage] = useState(1);
    const ITEMS_PER_PAGE = 4;

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setUtilLoading(true);
            try {
                const id = resolveResourceId(resource);
                if (!id) {
                    throw new Error("Resource id missing");
                }

                const monthWindows = buildUtilizationMonths();
                const summaries = await Promise.all(
                    monthWindows.map(async (month) => {
                        const summary = await getDashboardSummaryDateRange(id, month.startDate, month.endDate);
                        const normalized = normalizeBillableSummary(findEmployeeSummary(summary, id));
                        return {
                            ...normalized,
                            period: month.period,
                            dateRange: normalized.dateRange || {
                                startDate: month.startDate,
                                endDate: month.endDate,
                            },
                        };
                    }),
                );

                const billableHours = summaries.reduce((sum, item) => sum + item.billableHours, 0);
                const nonBillableHours = summaries.reduce((sum, item) => sum + item.nonBillableHours, 0);
                const totalHours = summaries.reduce((sum, item) => sum + item.totalHours, 0);
                const billablePercentage = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;

                const trendData = summaries.map((item) => ({
                    billable: item.billableHours,
                    nonBillable: item.nonBillableHours,
                    period: item.period,
                }));

                if (!cancelled) {
                    setBillableSummary({
                        billableHours,
                        nonBillableHours,
                        totalHours,
                        billablePercentage,
                        dateRange: {
                            startDate: monthWindows[0].startDate,
                            endDate: monthWindows[monthWindows.length - 1].endDate,
                        },
                    });
                    setUtilization(trendData);
                }
            } catch {
                if (!cancelled) {
                    setBillableSummary(null);
                    setUtilization(null);
                }
            } finally {
                if (!cancelled) setUtilLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [resource.employeeId, resource.resourceId, resource.userId, resource.id]);

    const isNotice = resource.noticeInfo?.isNoticePeriod;
    const currentProjects = useMemo(() => {
        if (!resource.currentProject) return [];
        if (Array.isArray(resource.currentProject)) return resource.currentProject;
        if (typeof resource.currentProject === "string") {
            return resource.currentProject.split(",").map(p => p.trim()).filter(Boolean);
        }
        return [];
    }, [resource.currentProject]);

    const hasExpiredCerts = useMemo(() => {
        return resource.certifications?.some(c => c.expiryDate && parseDate(c.expiryDate) < new Date());
    }, [resource.certifications]);

    const sortedTimeline = useMemo(() => {
        return [...(resource.allocationTimeline || [])].sort((a, b) => parseDate(a.startDate) - parseDate(b.startDate));
    }, [resource.allocationTimeline]);

    // Paginated Computations
    const paginatedCerts = useMemo(() => {
        if (!resource.certifications) return [];
        const start = (certPage - 1) * ITEMS_PER_PAGE;
        return resource.certifications.slice(start, start + ITEMS_PER_PAGE);
    }, [resource.certifications, certPage]);

    const totalCertPages = Math.ceil((resource.certifications?.length || 0) / ITEMS_PER_PAGE);

    const paginatedProjs = useMemo(() => {
        const start = (projPage - 1) * ITEMS_PER_PAGE;
        return currentProjects.slice(start, start + ITEMS_PER_PAGE);
    }, [currentProjects, projPage]);

    const totalProjPages = Math.ceil(currentProjects.length / ITEMS_PER_PAGE);

    return (
        <div className="space-y-6 font-sans">

            {/* ── TOP METRICS GRID (3-Columns) ───────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 font-sans">

                {/* COLUMN 1: Profile Summary (25%) */}
                <div className="md:col-span-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm h-full flex flex-col transition-all hover:shadow-md">
                    <h3 className="text-sm font-heading font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Users className="h-4 w-4 text-indigo-500" /> Profile Summary
                    </h3>
                    <div className="space-y-1.5">
                        <MiniInfoRow icon={MapPin} label="Location" value={resource.location} />
                        <MiniInfoRow icon={Briefcase} label="Experience" value={`${resource.experience || 0} Yrs`} />
                        <MiniInfoRow icon={Calendar} label="Available From" value={resource.availableFrom} />
                        <MiniInfoRow icon={Percent} label="Employment" value={resource.employmentType} />
                        {resource.currentProject && (
                            <MiniInfoRow icon={FolderKanban} label="Current Assignment" value={Array.isArray(resource.currentProject) ? resource.currentProject[0] : resource.currentProject} />
                        )}
                        {resource.nextAssignment && (
                            <MiniInfoRow icon={ArrowRight} label="Next Assignment" value={resource.nextAssignment} />
                        )}
                    </div>
                </div>

                {/* COLUMN 2: Allocation Metrics (45%) */}
                <div className="md:col-span-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm h-full transition-all hover:shadow-md">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
                        <h3 className="text-sm font-heading font-bold text-slate-900 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-indigo-500" /> Performance & Utilization
                        </h3>
                        {!utilLoading && (
                            <div className="flex flex-wrap gap-3 sm:gap-4 text-[9px] sm:text-[10px] font-bold font-sans">
                                <div className="flex items-center gap-1.5 text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Billable</div>
                                <div className="flex items-center gap-1.5 text-slate-400"><span className="h-2 w-2 rounded-full bg-slate-200" /> Non-Billable</div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-end">
                        <div className="space-y-4">
                            <div className="flex justify-between items-baseline pt-2">
                                <span className="text-xs font-black text-slate-400 font-sans uppercase tracking-widest">Active Workload</span>
                                <span className="text-3xl font-black text-indigo-600 font-sans tabular-nums tracking-tighter">{resource.currentAllocation || 0}%</span>
                            </div>

                            <TimelineBar resource={{ ...resource, allocationTimeline: sortedTimeline }} />

                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
                                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Billable</p>
                                    <p className="mt-1 text-lg font-black text-emerald-700 tabular-nums">{formatHours(billableSummary?.billableHours)}</p>
                                </div>
                                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Non-Billable</p>
                                    <p className="mt-1 text-lg font-black text-slate-800 tabular-nums">{formatHours(billableSummary?.nonBillableHours)}</p>
                                </div>
                            </div>

                            <div className="bg-indigo-50/30 rounded-lg p-3 border border-indigo-100/50">
                                <p className="text-[10px] font-bold text-indigo-700/70 font-sans uppercase tracking-[0.2em]">
                                    {billableSummary?.dateRange?.startDate && billableSummary?.dateRange?.endDate
                                        ? `${formatShortDate(billableSummary.dateRange.startDate)} - ${formatShortDate(billableSummary.dateRange.endDate)}`
                                        : "Current + Previous 3 Months"}
                                </p>
                                <p className="text-[11px] font-medium text-indigo-900 mt-1 leading-relaxed">
                                    Total Logged Hours Are <span className="font-black">{formatHours(billableSummary?.totalHours)}</span>, With Billable Utilization At <span className="font-black">{(billableSummary?.billablePercentage || 0).toFixed(2).replace(/\.00$/, "")}%</span>.
                                </p>
                            </div>
                        </div>

                        <div className="h-36 flex flex-col pb-1">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] font-black text-slate-400 font-sans uppercase tracking-widest">Monthly Hours</span>
                            </div>
                            {utilLoading ? (
                                <div className="h-full w-full bg-slate-50 animate-pulse rounded-lg" />
                            ) : (
                                <UtilizationChart data={utilization} />
                            )}
                        </div>
                    </div>
                </div>

                {/* COLUMN 3: Allocation Timeline & Risk (30%) */}
                <div className="md:col-span-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm h-full flex flex-col transition-all hover:shadow-md">
                    <h3 className="text-sm font-heading font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Percent className="h-4 w-4 text-indigo-500" /> Allocation Breakdown
                    </h3>

                    <div className="flex-1 space-y-4">
                        {/* Breakdown List */}
                        <div className="space-y-3">
                            {sortedTimeline.length > 0 ? (
                                sortedTimeline.map((block, i) => (
                                    <div key={i} className="flex items-center justify-between group/item">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <div className={cn(
                                                    "h-1.5 w-1.5 rounded-full shrink-0",
                                                    new Date() > parseDate(block.endDate) ? "bg-slate-300" :
                                                        block.allocation > 70 ? "bg-amber-400" : "bg-emerald-400"
                                                )} />
                                                <p className="text-[11px] font-bold text-slate-900 truncate font-sans group-hover/item:text-indigo-600 transition-colors">{block.project}</p>
                                            </div>
                                            <p className="text-[9px] font-medium text-slate-400 pl-3 font-sans uppercase tracking-tight">
                                                {formatShortDate(block.startDate)} - {formatShortDate(block.endDate)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[11px] font-black text-slate-900 font-sans tabular-nums">{block.allocation}%</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-[10px] text-slate-400 italic">No Detailed Timeline Available</p>
                            )}
                        </div>

                        <div className="h-px bg-slate-50 my-2" />

                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                            <Shield className="h-3 w-3" /> Risk Status
                        </h3>

                        {isNotice ? (
                            <div className="bg-rose-50 border border-rose-100 p-3 rounded-lg">
                                <div className="flex items-center gap-2 text-rose-600 mb-1">
                                    <AlertTriangle className="h-4 w-4" />
                                    <span className="text-xs font-bold font-sans tracking-tight">Critical Outcome</span>
                                </div>
                                <p className="text-[10px] font-medium text-rose-500 leading-tight font-sans">Serving Notice Period. Immediate Bench Risk Upon Completion.</p>
                            </div>
                        ) : resource.currentAllocation === 0 ? (
                            <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg">
                                <div className="flex items-center gap-2 text-amber-600 mb-1">
                                    <AlertTriangle className="h-4 w-4" />
                                    <span className="text-xs font-bold font-sans tracking-tight">Bench Risk</span>
                                </div>
                                <p className="text-[10px] font-medium text-amber-500 leading-tight font-sans">Resource Unallocated. Prioritize Project Matching.</p>
                            </div>
                        ) : (
                            <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg">
                                <div className="flex items-center gap-2 text-emerald-600 mb-1">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span className="text-xs font-bold font-sans tracking-tight">Stable Capacity</span>
                                </div>
                                <p className="text-[10px] font-medium text-emerald-500 leading-tight font-sans">Active Allocation Within Optimal Performance Range.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── SECONDARY METRICS ────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-sans">

                {/* Certifications Quick View */}
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md">
                    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <h3 className="text-sm font-heading font-bold text-slate-900 flex items-center gap-2">
                            <Award className="h-4.5 w-4.5 text-indigo-500" /> Certification Inventory
                        </h3>
                        <Badge className="bg-indigo-50 text-indigo-600 text-[10px] font-bold border-none px-2.5 font-sans">{resource.certifications?.length || 0} Records</Badge>
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                        {paginatedCerts.length > 0 ? (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                                    {paginatedCerts.map((c, i) => {
                                        const name = typeof c === 'string' ? c : (c.certificateName || c.name);
                                        const provider = typeof c === 'string' ? 'Verified' : c.providerName;
                                        const isExpired = c.expiryDate && new Date(c.expiryDate) < new Date();

                                        return (
                                            <div key={i} className="flex items-start gap-4 p-3 rounded-xl border border-slate-100 bg-slate-50/30 group hover:border-indigo-200 hover:bg-white transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                                <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center text-indigo-500 shrink-0 border border-slate-100 shadow-sm transition-colors group-hover:bg-indigo-50">
                                                    <Award className="h-5 w-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-slate-900 leading-snug truncate font-sans">{name}</p>
                                                    <p className={cn("text-[10px] font-medium mt-0.5 font-sans", isExpired ? "text-rose-500" : "text-slate-500")}>
                                                        {isExpired ? "Expired" : provider}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {totalCertPages > 1 && (
                                    <div className="mt-4 pt-4 border-t border-slate-50">
                                        <Pagination
                                            currentPage={certPage}
                                            totalPages={totalCertPages}
                                            onPrevious={() => setCertPage(p => Math.max(1, p - 1))}
                                            onNext={() => setCertPage(p => Math.min(totalCertPages, p + 1))}
                                        />
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center py-8 text-slate-300 font-sans">
                                <Award className="h-8 w-8 mb-2 opacity-20" />
                                <p className="text-xs font-bold">No Active Records Found</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Active Projects Quick View */}
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md">
                    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <h3 className="text-sm font-heading font-bold text-slate-900 flex items-center gap-2">
                            <FolderKanban className="h-4.5 w-4.5 text-indigo-500" /> Employment History
                        </h3>
                        <Badge className="bg-slate-100 text-slate-600 text-[10px] font-bold border-none px-2.5 font-sans whitespace-nowrap">{currentProjects.length} Projects</Badge>
                    </div>
                    <div className="p-0 flex-1 flex flex-col">
                        {paginatedProjs.length > 0 ? (
                            <>
                                <div className="divide-y divide-slate-100 flex-1">
                                    {paginatedProjs.map((projectName, i) => (
                                        <div key={i} className="px-5 py-4 hover:bg-slate-50 transition-colors flex items-center justify-between group font-sans">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                                                    <FolderKanban className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-900 font-sans">{projectName}</p>
                                                    <p className="text-[10px] font-medium text-slate-500 mt-0.5 whitespace-nowrap font-sans">Active Client Engagement</p>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ArrowRight className="h-4 w-4 text-slate-400" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                {totalProjPages > 1 && (
                                    <div className="p-4 border-t border-slate-50">
                                        <Pagination
                                            currentPage={projPage}
                                            totalPages={totalProjPages}
                                            onPrevious={() => setProjPage(p => Math.max(1, p - 1))}
                                            onNext={() => setProjPage(p => Math.min(totalProjPages, p + 1))}
                                        />
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="py-16 text-center font-sans">
                                <FolderKanban className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                                <p className="text-xs font-bold text-slate-400">No Active Project Engagements Found</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};