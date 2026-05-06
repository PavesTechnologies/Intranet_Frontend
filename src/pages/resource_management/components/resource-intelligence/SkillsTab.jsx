import { useState, useMemo } from "react";
import {
    Search, ArrowUpDown, AlertTriangle, CheckCircle2, Code2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Pagination from "../../../../components/Pagination/pagination";

// ── Proficiency Badge Colors ────────────────────────────────────────────────
function getProficiencyStyle(level) {
    const l = (level || "").toLowerCase();
    if (l === "expert" || l === "advance" || l === "advanced")
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (l === "intermediate")
        return "bg-blue-50 text-blue-700 border-blue-200";
    if (l === "beginner" || l === "basic")
        return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-slate-50 text-slate-600 border-slate-200";
}

function getProficiencyDots(level) {
    const l = (level || "").toLowerCase();
    if (l === "expert" || l === "advance" || l === "advanced") return 4;
    if (l === "intermediate") return 3;
    if (l === "beginner" || l === "basic") return 2;
    return 1;
}

// ── Recency Check ───────────────────────────────────────────────────────────
function getRecencyInfo(lastUsed) {
    if (!lastUsed) return { stale: false, years: 0 };
    const diff = (new Date() - new Date(lastUsed)) / (365.25 * 24 * 60 * 60 * 1000);
    return { stale: diff > 3, years: Math.floor(diff) };
}

export default function SkillsTab({ resource }) {
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState("proficiency");
    const [sortDir, setSortDir] = useState("desc");
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const rawSkills = useMemo(() => {
        if (resource.skillDetails && resource.skillDetails.length > 0) return resource.skillDetails;
        if (resource.skills && resource.skills.length > 0) {
            return resource.skills.map(s => ({ skillName: s, proficiencyLevel: null, lastUsedDate: null }));
        }
        return [];
    }, [resource.skillDetails, resource.skills]);

    const filtered = useMemo(() => {
        let result = [...rawSkills];
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(s => s.skillName?.toLowerCase().includes(q));
        }
        return result;
    }, [rawSkills, search]);

    const sorted = useMemo(() => {
        return [...filtered].sort((a, b) => {
            let cmp = 0;
            if (sortBy === "name") cmp = (a.skillName || "").localeCompare(b.skillName || "");
            else if (sortBy === "proficiency") {
                const order = { expert: 5, advance: 4, advanced: 4, intermediate: 3, beginner: 2, basic: 1 };
                cmp = (order[(a.proficiencyLevel || "").toLowerCase()] || 0) - (order[(b.proficiencyLevel || "").toLowerCase()] || 0);
            } else if (sortBy === "lastUsed") {
                cmp = new Date(a.lastUsedDate || 0) - new Date(b.lastUsedDate || 0);
            }
            return sortDir === "desc" ? -cmp : cmp;
        });
    }, [filtered, sortBy, sortDir]);

    const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
    const paginated = useMemo(() => {
        const start = (page - 1) * ITEMS_PER_PAGE;
        return sorted.slice(start, start + ITEMS_PER_PAGE);
    }, [sorted, page]);

    const toggleSort = (col) => {
        if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortBy(col); setSortDir("asc"); }
        setPage(1);
    };

    if (rawSkills.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-slate-100 rounded-3xl font-sans">
                <Code2 className="h-12 w-12 text-slate-200 mb-3" />
                <p className="text-sm font-bold text-slate-400">Inventory Empty</p>
                <p className="text-xs text-slate-300 mt-1">No skill profiles detected for this resource</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 font-sans">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="relative w-full sm:max-w-xs group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search skills inventory..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        className="w-full h-9 pl-10 pr-4 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm font-sans"
                    />
                </div>
                <Badge variant="outline" className="h-7 px-3 text-xs font-bold bg-indigo-50 text-indigo-600 border-indigo-100 rounded-full font-sans whitespace-nowrap">
                    {sorted.length} Records
                </Badge>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="text-left px-4 sm:px-5 py-3 min-w-[150px]">
                                    <button onClick={() => toggleSort("name")} className="flex items-center gap-2 text-xs font-heading font-bold text-slate-500 hover:text-indigo-600 transition-colors">
                                        Skill Identification
                                        <ArrowUpDown className="h-3.5 w-3.5" />
                                    </button>
                                </th>
                                <th className="text-left px-4 sm:px-5 py-3 min-w-[140px]">
                                    <button onClick={() => toggleSort("proficiency")} className="flex items-center gap-2 text-xs font-heading font-bold text-slate-500 hover:text-indigo-600 transition-colors">
                                        Expertise Level
                                        <ArrowUpDown className="h-3.5 w-3.5" />
                                    </button>
                                </th>
                                <th className="text-left px-4 sm:px-5 py-3 min-w-[130px]">
                                    <button onClick={() => toggleSort("lastUsed")} className="flex items-center gap-2 text-xs font-heading font-bold text-slate-500 hover:text-indigo-600 transition-colors">
                                        Usage Recency
                                        <ArrowUpDown className="h-3.5 w-3.5" />
                                    </button>
                                </th>
                                <th className="text-right px-4 sm:px-5 py-3 min-w-[120px]">
                                    <span className="text-xs font-heading font-bold text-slate-500">Validation</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginated.map((skill, idx) => {
                                const recency = getRecencyInfo(skill.lastUsedDate);
                                return (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 shadow-sm group-hover:bg-indigo-100 transition-colors">
                                                    <Code2 className="h-4 w-4 text-indigo-600" />
                                                </div>
                                                <span className="text-sm font-bold text-slate-900 font-sans">{skill.skillName}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            {skill.proficiencyLevel ? (
                                                <div className="flex items-center gap-4">
                                                    <Badge className={cn("text-[10px] font-bold px-2 py-0.5 border-none font-sans",
                                                        getProficiencyStyle(skill.proficiencyLevel).replace('border-', ''))}>
                                                        {skill.proficiencyLevel}
                                                    </Badge>
                                                    <div className="flex gap-1">
                                                        {[1, 2, 3, 4, 5].map(dot => (
                                                            <div key={dot} className={cn(
                                                                "h-1 w-3 rounded-full",
                                                                dot <= getProficiencyDots(skill.proficiencyLevel) ? "bg-indigo-500" : "bg-slate-200"
                                                            )} />
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-[11px] font-medium text-slate-400 italic font-sans">Unrated</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            {skill.lastUsedDate ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-slate-700 font-sans">
                                                        {new Date(skill.lastUsedDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                                                    </span>
                                                    {recency.stale && (
                                                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md font-sans">
                                                            Stale
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-[11px] font-medium text-slate-400 italic font-sans">N/A</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            {recency.stale ? (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-100 text-amber-600 font-sans">
                                                    <AlertTriangle className="h-3 w-3" />
                                                    <span className="text-[10px] font-bold">Low Confidence</span>
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 font-sans">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    <span className="text-[10px] font-bold">Verified</span>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {paginated.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center text-slate-400 font-medium font-sans">
                                        No matching skills found for "{search}"
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
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
            </div>
        </div>
    );
}
