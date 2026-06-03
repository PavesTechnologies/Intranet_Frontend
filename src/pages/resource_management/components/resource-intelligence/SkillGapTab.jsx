import { useState, useEffect, useMemo, Fragment } from "react";
import {
    Search, Loader2, AlertTriangle, CheckCircle2,
    XCircle, Shield, Zap, BarChart3, Target, ChevronsUpDown,
    Award, Info, ArrowUpRight, Clock, FileText, Activity
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Combobox, Transition } from "@headlessui/react";
import { fetchDemands, getSkillGapAnalysis } from "../../services/workforceService";
import { fetchResources } from "../../services/resource";
import { notify } from "../../utils/notify";
import Pagination from "../../../../components/Pagination/pagination";
import GenericTable from "../../../../components/Table/table";

// ── Match Gauge Component ────────────────────────────────────────────────────
function MatchGauge({ percentage, size = 48 }) {
    const p = Math.min(Math.max(percentage || 0, 0), 100);
    const radius = size * 0.42;
    const strokeWidth = size * 0.12;
    const circ = 2 * Math.PI * radius;
    const offset = circ - (p / 100) * circ;

    let color = "stroke-emerald-500";
    if (p < 50) color = "stroke-rose-500";
    else if (p < 80) color = "stroke-amber-500";

    return (
        <div className="relative flex items-center justify-center font-sans">
            <svg width={size} height={size} className="transform -rotate-90">
                <circle cx={size / 2} cy={size / 2} r={radius} className="stroke-slate-100" strokeWidth={strokeWidth} fill="none" />
                <circle cx={size / 2} cy={size / 2} r={radius} className={cn(color, "transition-all duration-1000 ease-out")} strokeWidth={strokeWidth} fill="none" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
            </svg>
            <span className="absolute text-[8px] font-black text-slate-900 leading-none font-sans">{p.toFixed(0)}%</span>
        </div>
    );
}

// ── KPI Card Component ──────────────────────────────────────────────────────
function KPICard({ label, value, subValue, icon: Icon, colorClass, children }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm transition-all hover:shadow-md hover:border-indigo-100 flex items-center gap-3 group h-20 relative">
            {Icon && (
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center transition-colors shrink-0",
                    colorClass || "bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500")}>
                    <Icon className="h-5 w-5" />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-slate-600 font-sans mb-0.5 whitespace-nowrap">{label}</div>
                <div className="flex items-baseline gap-1.5 min-w-0">
                    <div className="text-xl font-black text-slate-900 font-sans tracking-tight shrink-0">{value}</div>
                    {subValue && <div className="text-[9px] font-bold text-slate-400 font-sans truncate">{subValue}</div>}
                </div>
            </div>
            <div className="flex-shrink-0 flex items-center justify-center pt-2">
                {children}
            </div>
        </div>
    );
}

export default function SkillGapTab({ resource, demand }) {
    const [selectionList, setSelectionList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [query, setQuery] = useState("");
    const [analysis, setAnalysis] = useState(null);
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const [analysisError, setAnalysisError] = useState(null);

    // Pagination state
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    useEffect(() => {
        let c = false;
        (async () => {
            setLoading(true);
            try {
                // If resource is provided, we fetch demands to compare against.
                // If demand is provided, we fetch resources to compare against.
                const response = resource ? await fetchDemands() : await fetchResources();
                const data = resource ? response : response.data; // resource.js returns the full response object
                if (!c) setSelectionList(Array.isArray(data) ? data : []);
            }
            catch (err) { console.error("Failed to fetch selection list:", err); }
            finally { if (!c) setLoading(false); }
        })();
        return () => { c = true; };
    }, [resource, demand]);

    const filteredItems = useMemo(() => {
        if (!selectionList) return [];
        return query === ""
            ? selectionList
            : selectionList.filter((item) => {
                const name = (item.demandName || item.name || item.resourceName || "").toLowerCase();
                const subText = (item.projectName || item.role || item.location || item.resourceRole || "").toLowerCase();
                const q = query.toLowerCase();
                return name.includes(q) || subText.includes(q);
            });
    }, [selectionList, query]);

    const runAnalysis = async () => {
        if (!selectedItem && !demand && !resource) return;
        setAnalysisLoading(true); setAnalysisError(null); setAnalysis(null);
        setPage(1); // Reset page on new analysis
        try {
            const rId = resource ? (resource.resourceId || resource.id) : (selectedItem?.resourceId || selectedItem?.id);
            const dId = demand ? (demand.demandId || demand.id) : (selectedItem?.demandId || selectedItem?.id);

            if (!rId || !dId) throw new Error("Missing ID for analysis");

            const data = await getSkillGapAnalysis(dId, rId);
            setAnalysis(data);
            notify.success("Intelligence Analysis Completed Successfully.");
        } catch (err) {
            setAnalysisError(err.message || "Analysis Failed");
            notify.error(err, "Skill Gap Analysis Failed.");
        }
        finally { setAnalysisLoading(false); }
    };

    const matchesCount = (analysis?.skillComparisons || []).filter(s => s.status?.toUpperCase() === 'MATCH').length;
    const gapsCount = (analysis?.skillComparisons || []).filter(s => s.status?.toUpperCase() === 'GAP').length;

    const totalPages = analysis ? Math.ceil(analysis.skillComparisons.length / ITEMS_PER_PAGE) : 0;
    const paginatedSkills = useMemo(() => {
        if (!analysis) return [];
        const start = (page - 1) * ITEMS_PER_PAGE;
        return analysis.skillComparisons.slice(start, start + ITEMS_PER_PAGE);
    }, [analysis, page]);

    return (
        <div className="space-y-6 font-sans">

            {/* ── ROW 1: SELECTION & CONTROLS ────────────────────────────── */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex flex-col md:flex-row items-stretch md:items-end gap-5">
                    <div className="flex-1 w-full md:max-w-[320px] space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">
                            {resource ? "Target Demand Pipeline" : "Target Resource Selection"}
                        </label>
                        <div className="relative group">
                            <Combobox value={selectedItem} onChange={setSelectedItem}>
                                <div className="relative">
                                    <div className="relative w-full cursor-default overflow-hidden rounded-xl bg-slate-50 border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all">
                                        <Combobox.Button as="div" className="w-full">
                                            <Combobox.Input
                                                className="w-full border-none py-3 pl-4 pr-10 text-xs font-bold text-slate-900 bg-transparent focus:ring-0 outline-none placeholder:text-slate-400 font-sans"
                                                displayValue={(item) => item ? (item.demandName || item.name || item.resourceName) : ""}
                                                onChange={(e) => setQuery(e.target.value)}
                                                placeholder={resource ? "Search Demand..." : "Search Resource..."}
                                            />
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                <ChevronsUpDown className="h-4 w-4 text-slate-400" />
                                            </div>
                                        </Combobox.Button>
                                    </div>
                                    <Transition as={Fragment} afterLeave={() => setQuery("")}>
                                        <Combobox.Options className="absolute mt-2 max-h-60 w-full overflow-auto rounded-xl bg-white py-1.5 text-xs shadow-2xl ring-1 ring-black/5 z-[60] border border-slate-100 font-sans">
                                            {loading ? (
                                                <div className="p-5 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-indigo-500" /></div>
                                            ) : filteredItems.length === 0 ? (
                                                <div className="p-5 text-center text-slate-400 font-medium font-sans">No Matches Found</div>
                                            ) : (
                                                filteredItems.map((item) => (
                                                    <Combobox.Option key={item.demandId || item.id || item.resourceId} className={({ active }) => cn("px-4 py-2.5 cursor-pointer transition-colors", active ? "bg-indigo-50" : "bg-white")} value={item}>
                                                        <div className="font-bold text-slate-900 font-sans">{item.demandName || item.name || item.resourceName}</div>
                                                        <div className="text-[10px] text-slate-500 font-medium mt-0.5 font-sans">{item.projectName || item.role || item.location || item.resourceRole}</div>
                                                    </Combobox.Option>
                                                ))
                                            )}
                                        </Combobox.Options>
                                    </Transition>
                                </div>
                            </Combobox>
                        </div>
                    </div>
                    <Button
                        onClick={runAnalysis}
                        disabled={!selectedItem || analysisLoading}
                        className="h-11 md:h-12 px-8 text-xs font-bold gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 border-none transition-all hover:-translate-y-0.5 w-full md:w-auto"
                    >
                        {analysisLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 fill-white/20" />}
                        RUN ANALYSIS
                    </Button>
                </div>
            </div>

            {/* ── ROW 2: KPI INSIGHTS ────────────────────────────────────── */}
            {analysis ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
                    <KPICard label="Total Match Score" value={`${Number(analysis.matchPercentage || 0).toFixed(2)}%`} icon={Target} colorClass="bg-indigo-50 text-indigo-500">
                        <MatchGauge percentage={analysis.matchPercentage} size={40} />
                    </KPICard>

                    <KPICard label="Risk Assessment Tier" value={analysis.riskLevel} icon={Shield}
                        colorClass={analysis.riskLevel === 'HIGH' ? "bg-rose-50 text-rose-500" : analysis.riskLevel === 'MEDIUM' ? "bg-amber-50 text-amber-500" : "bg-emerald-50 text-emerald-500"}>
                        <div className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase border whitespace-nowrap shrink-0",
                            analysis.allocationAllowed ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100")}>
                            {analysis.allocationAllowed ? "Clear To Deploy" : "Deployment Restricted"}
                        </div>
                    </KPICard>

                    <KPICard label="Mandatory Compliance" value={matchesCount} subValue={`/ ${matchesCount + gapsCount}`} icon={CheckCircle2} colorClass="bg-emerald-50 text-emerald-500">
                        <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0">
                            <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${(matchesCount / (matchesCount + gapsCount)) * 100}%` }} />
                        </div>
                    </KPICard>

                    <KPICard label="Total Skill Gaps" value={gapsCount} subValue="CRITICAL DELTA" icon={XCircle} colorClass="bg-rose-50 text-rose-500" />
                </div>
            ) : analysisLoading ? (
                <div className="h-20 flex items-center justify-center rounded-xl bg-indigo-50/30 border border-indigo-100/50 border-dashed">
                    <div className="flex items-center gap-3 text-indigo-600">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-xs font-bold animate-pulse uppercase tracking-wider">Analyzing Skill Architecture...</span>
                    </div>
                </div>
            ) : null}

            {/* ── ROW 3: DETAILED ANALYSIS (Split Layout) ───────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Main Content: Table */}
                <div className="lg:col-span-8 space-y-4">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2 capitalize tracking-wider">
                                <Activity className="h-4 w-4 text-indigo-500" /> Skill Comparison Workbench
                            </h4>
                            {/* {analysis && (
                                <Badge variant="secondary" className="bg-white text-slate-500 text-[10px] font-bold border-slate-200">
                                    Ref: {resource ? `ID-${selectedItem?.demandId || "000"}` : `Res-${selectedItem?.resourceId || "000"}`}
                                </Badge>
                            )} */}
                        </div>

                        {analysis ? (
                            <>
                                <div className="overflow-x-auto flex-1 no-scrollbar">
                                    <GenericTable
                                        headers={["Skill Layer", "Target", "Asset", "Status"]}
                                        columns={["skill_layer_info", "target_info", "asset_info", "status_info"]}
                                        rows={paginatedSkills.map((sc, i) => {
                                            const isGap = sc.status?.toUpperCase() === 'GAP';
                                            return {
                                                ...sc,
                                                skill_layer_info: (
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border",
                                                            isGap ? "bg-rose-50 border-rose-100 text-rose-500" : "bg-emerald-50 border-emerald-100 text-emerald-500")}>
                                                            <Target className="h-4 w-4" />
                                                        </div>
                                                        <div className="text-left">
                                                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                                                {sc.skill || sc.skillName}
                                                                {sc.mandatory && <span className="text-[8px] font-black text-white bg-rose-500 px-1 rounded uppercase tracking-tighter">Crit</span>}
                                                            </div>
                                                            <div className="text-[10px] font-bold text-indigo-500 mt-0.5">{sc.subSkillName || sc.subskillName || sc.subSkill || sc.sub_skill_name || sc.subskill || "Primary Focus"}</div>
                                                        </div>
                                                    </div>
                                                ),
                                                target_info: (
                                                    <div className="text-center">
                                                        <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">{sc.requiredProficiency}</span>
                                                    </div>
                                                ),
                                                asset_info: (
                                                    <div className="text-center">
                                                        <span className={cn("text-[10px] font-bold px-2 py-1 rounded border shadow-sm",
                                                            isGap ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100")}>
                                                            {sc.resourceProficiency || "Deficit"}
                                                        </span>
                                                    </div>
                                                ),
                                                status_info: (
                                                    <div className="text-center">
                                                        <div className={cn("inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full",
                                                            isGap ? "text-rose-600 bg-rose-50" : "text-emerald-600 bg-emerald-50")}>
                                                            {isGap ? <XCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />} {sc.status}
                                                        </div>
                                                    </div>
                                                ),
                                                rowClass: isGap && sc.mandatory ? "bg-rose-50/20" : ""
                                            };
                                        })}
                                    />
                                </div>
                                {totalPages > 1 && (
                                    <div className="p-4 border-t border-slate-100">
                                        <Pagination
                                            currentPage={page}
                                            totalPages={totalPages}
                                            onPrevious={() => setPage(p => Math.max(1, p - 1))}
                                            onNext={() => setPage(p => Math.min(totalPages, p + 1))}
                                        />
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-40 opacity-40">
                                <FileText className="h-16 w-16 text-slate-200 mb-4" />
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Workbench Empty</p>
                                <p className="text-[10px] text-slate-300 mt-1">Initialize Analysis To Populate Comparison Matrix.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Content: Advisory */}
                <div className="lg:col-span-4 space-y-6">

                    {/* Compliance Sidebar */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-6 h-full">
                        <h4 className="text-[10px] font-bold text-slate-900 flex items-center gap-2 capitalize tracking-widest border-b border-slate-50 pb-3">
                            <Shield className="h-4 w-4 text-indigo-500" /> Intelligence Advisory
                        </h4>

                        <div className="space-y-6">
                            {/* Exit Notice Warning */}
                            {((resource && resource.noticeInfo?.isNoticePeriod) || (selectedItem && selectedItem.noticeInfo?.isNoticePeriod)) && (
                                <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex gap-3 shadow-sm shadow-rose-50">
                                    <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-rose-700">Notice Period Active</p>
                                        <p className="text-[10px] text-rose-600 font-medium mt-1 leading-relaxed">
                                            Resource Matches Demand But Availability Is Terminal. Permanent Allocation Restricted.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Recency Index */}
                            {analysis?.recencyWarnings?.length > 0 ? (
                                <div className="space-y-3">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Recency Drift Index</span>
                                    {analysis.recencyWarnings.map((w, i) => (
                                        <div key={i} className="p-3 bg-slate-50 border border-slate-100 rounded-xl group hover:border-amber-200 transition-colors">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] font-bold text-slate-700">{w.skillName} {(w.subSkillName || w.subskillName || w.subSkill || w.sub_skill_name) && <span className="font-medium text-slate-400">/ {w.subSkillName || w.subskillName || w.subSkill || w.sub_skill_name}</span>}</span>
                                                <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Drift</span>
                                            </div>
                                            <div className="flex justify-between text-[9px] font-medium text-slate-400">
                                                <span>UpSkill</span>
                                                <span>{w.lastUsedDate}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : analysis && (
                                <div className="p-8 text-center border border-dashed border-slate-100 rounded-xl">
                                    <CheckCircle2 className="h-6 w-6 text-emerald-200 mx-auto mb-2" />
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Optimal Skill Recency</p>
                                </div>
                            )}

                            {/* Strategic Upskilling Sprint */}
                            {/* {analysis && gapsCount > 0 && (
                                <div className="bg-slate-900 p-5 rounded-xl text-white relative overflow-hidden group shadow-lg shadow-slate-200">
                                    <div className="absolute -right-4 -top-4 text-white/5 group-hover:scale-125 transition-transform duration-500">
                                        <Zap className="h-20 w-20 fill-current" />
                                    </div>
                                    <div className="relative">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Zap className="h-3.5 w-3.5 text-amber-400" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-white/90">Strategic Sprint</span>
                                        </div>
                                        <p className="text-[10px] font-medium text-slate-400 leading-relaxed font-sans mt-2">
                                            Immediate <span className="text-white font-bold">14-day training sprint</span> recommended to address gaps in mandatory stack.
                                        </p>
                                        <Button variant="ghost" className="h-8 mt-4 w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 text-[10px] font-bold rounded-lg gap-2">
                                            Initiate Plan <ArrowUpRight className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            )} */}
                        </div>

                        {/* Methodology Info */}
                        <div className="pt-4 mt-auto border-t border-slate-50 flex items-start gap-4">
                            <Info className="h-4 w-4 text-indigo-400 shrink-0" />
                            <p className="text-[9px] font-medium text-slate-400 leading-relaxed italic">
                                Scores Reflect A Weighted Delta Between Resource Proficiency And Mandatory Demand Requirements.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
