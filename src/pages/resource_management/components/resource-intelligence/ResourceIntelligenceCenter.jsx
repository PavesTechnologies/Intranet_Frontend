import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
    LayoutDashboard, Code2, Award, GitCompare,
    Lightbulb, ArrowLeft, Clock
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Lazy-loaded tabs ───────────────────────────────────────────────────────
const OverviewTab = lazy(() => import("./OverviewTab"));
const SkillsTab = lazy(() => import("./SkillsTab"));
const CertificationsTab = lazy(() => import("./CertificationsTab"));
const SkillGapTab = lazy(() => import("./SkillGapTab"));
const InsightsTab = lazy(() => import("./InsightsTab"));

const TABS = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "skills", label: "Skills Inventory", icon: Code2 },
    { id: "certifications", label: "Certifications", icon: Award },
    { id: "skillgap", label: "Skill Gap Analysis", icon: GitCompare },
    { id: "insights", label: "Strategy Board", icon: Lightbulb },
];

function TabSkeleton() {
    return (
        <div className="animate-pulse space-y-4 font-sans">
            <div className="grid grid-cols-12 gap-4">
                <div className="col-span-3 h-64 bg-white border border-slate-100 rounded-xl" />
                <div className="col-span-6 h-64 bg-white border border-slate-100 rounded-xl" />
                <div className="col-span-3 h-64 bg-white border border-slate-100 rounded-xl" />
            </div>
            <div className="h-48 bg-white border border-slate-100 rounded-xl" />
        </div>
    );
}

function StatusDot({ status }) {
    const map = {
        available: { color: "bg-emerald-500", label: "Available" },
        partial: { color: "bg-amber-500", label: "Partial" },
        allocated: { color: "bg-rose-500", label: "Active" },
    };
    const s = map[status] || { color: "bg-slate-400", label: "Unknown" };
    return (
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 font-sans">
            <span className={cn("h-2 w-2 rounded-full", s.color)} />
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">{s.label}</span>
        </div>
    );
}

export default function ResourceIntelligenceCenter() {
    const navigate = useNavigate();
    const location = useLocation();
    const resource = location.state?.resource;
    const [activeTab, setActiveTab] = useState("overview");

    useEffect(() => {
        if (!resource) navigate("/resource-management/workforce-availability", { replace: true });
    }, [resource, navigate]);

    if (!resource) return null;

    const isNotice = resource.noticeInfo?.isNoticePeriod;
    let noticeDaysRemaining = 0;
    if (isNotice && resource.noticeInfo.noticeEndDate) {
        const end = new Date(resource.noticeInfo.noticeEndDate);
        noticeDaysRemaining = Math.max(0, Math.ceil((end - new Date()) / 86400000));
    }

    const alloc = resource.currentAllocation || 0;
    const allocColor = alloc > 100 ? "bg-rose-500" : alloc > 70 ? "bg-amber-500" : alloc > 20 ? "bg-indigo-500" : "bg-emerald-500";

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-100">

            {/* ─── HEADER AREA ───────────────────────────────────── */}
            <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm font-sans">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
                    <div className="h-20 sm:h-16 flex items-center justify-between gap-4 py-2">
                        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate("/resource-management/workforce-availability")}
                                className="h-8 w-8 sm:h-9 sm:w-9 text-slate-400 hover:text-slate-900 border border-transparent hover:border-slate-200 rounded-lg sm:rounded-xl shrink-0"
                            >
                                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                            </Button>

                            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border-2 border-white shadow-sm shrink-0">
                                    <AvatarFallback className="text-[10px] sm:text-xs font-bold bg-indigo-50 text-indigo-600">
                                        {resource.name?.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 pr-1">
                                    <h1 className="text-sm sm:text-base font-heading font-bold text-slate-900 truncate leading-none">
                                        {resource.name}
                                    </h1>
                                    <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                                        <div className="text-[9px] sm:text-[10px] font-medium text-slate-500 uppercase tracking-wider truncate max-w-[100px] sm:max-w-none">{resource.role}</div>
                                        {resource.location && (
                                            <>
                                                <div className="h-0.5 w-0.5 sm:h-1 sm:w-1 rounded-full bg-slate-200" />
                                                <div className="text-[9px] sm:text-[10px] font-medium text-slate-500 uppercase tracking-wider truncate max-w-[80px] sm:max-w-none">{resource.location}</div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions / Status - Adapted for mobile */}
                        <div className="flex items-center gap-3 sm:gap-6">
                            {/* Allocation circular/tiny view for mobile */}
                            <div className="flex flex-col gap-0.5 w-16 sm:w-32">
                                <div className="flex justify-between items-center text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    <span className="sm:inline capitalize">Allocation </span>
                                    <span className="text-slate-900">{alloc}%</span>
                                </div>
                                <div className="h-1 sm:h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className={cn("h-full transition-all duration-1000 ease-out", allocColor)} style={{ width: `${Math.min(alloc, 100)}%` }} />
                                </div>
                            </div>

                            <div className="hidden sm:block h-8 w-px bg-slate-200" />

                            {/* Status and Notice */}
                            <div className="flex items-center gap-2">
                                <div className="hidden xs:block">
                                    <StatusDot status={resource.status} />
                                </div>
                                {isNotice && (
                                    <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-full bg-rose-50 border border-rose-100 text-rose-600 animate-pulse">
                                        <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                        <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">{noticeDaysRemaining}D</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Tabs */}
                    <div className="flex gap-1 sm:gap-4 overflow-x-auto no-scrollbar -mb-[1px] -mx-4 sm:mx-0 px-4 sm:px-0">
                        {TABS.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            const count = tab.id === 'skills' ? resource.skills?.length :
                                tab.id === 'certifications' ? (resource.certifications?.length || resource.certificationCount) : null;

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "group flex items-center gap-2 px-3 sm:px-4 py-3 sm:py-4 text-[11px] sm:text-xs font-bold transition-all border-b-2 relative font-sans whitespace-nowrap shrink-0",
                                        isActive
                                            ? "text-indigo-600 border-indigo-600"
                                            : "text-slate-400 border-transparent hover:text-slate-600 hover:border-slate-300"
                                    )}
                                >
                                    <Icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4 transition-colors", isActive ? "text-indigo-500" : "text-slate-400 group-hover:text-slate-500")} />
                                    {tab.label}
                                    {count != null && (
                                        <span className={cn(
                                            "ml-1 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold font-sans",
                                            isActive ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                                        )}>
                                            {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </header>

            {/* ─── SCROLLABLE ANALYTICS AREA ────────────────────────────── */}
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 lg:py-8 font-sans">
                    <Suspense fallback={<TabSkeleton />}>
                        {/* Preserve state by keeping tabs in DOM but hidden */}
                        <div className={cn(activeTab === "overview" ? "block" : "hidden")}>
                            <OverviewTab resource={resource} />
                        </div>
                        <div className={cn(activeTab === "skills" ? "block" : "hidden")}>
                            <SkillsTab resource={resource} />
                        </div>
                        <div className={cn(activeTab === "certifications" ? "block" : "hidden")}>
                            <CertificationsTab resource={resource} />
                        </div>
                        <div className={cn(activeTab === "skillgap" ? "block" : "hidden")}>
                            <SkillGapTab resource={resource} />
                        </div>
                        <div className={cn(activeTab === "insights" ? "block" : "hidden")}>
                            <InsightsTab resource={resource} />
                        </div>
                    </Suspense>
                </div>
            </main>
        </div>
    );
}
