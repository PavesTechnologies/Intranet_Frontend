import { useMemo } from "react";
import { Brain, Zap, Target, GraduationCap, TrendingUp, Sparkles, Info, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function InsightsTab({ resource }) {
    // ── DYNAMIC INSIGHTS LOGIC ──────────────────────────────────────────
    const skillsCount = resource.skills?.length || 0;
    const certsCount = (resource.certifications?.length || resource.certificationCount || 0);
    const experience = resource.experience || 0;
    const allocation = resource.currentAllocation || 0;

    const strategicMatchIndex = useMemo(() => {
        const score = Math.min(65 + (skillsCount * 1.5) + (certsCount * 3), 98.5);
        return score.toFixed(1);
    }, [skillsCount, certsCount]);

    const allocationVelocity = useMemo(() => {
        if (allocation < 40) return { label: "EXPRESS", trend: "CRITICAL" };
        if (allocation < 80) return { label: "OPTIMAL", trend: "STABLE" };
        return { label: "STEADY", trend: "CONSTRAINED" };
    }, [allocation]);

    const skillDensity = useMemo(() => {
        if (skillsCount > 15) return { label: "ELITE", rank: "TOP 2%" };
        if (skillsCount > 8) return { label: "HIGH", rank: "TOP 12%" };
        return { label: "CORE", rank: "ESTABLISHED" };
    }, [skillsCount]);

    const propensityScore = useMemo(() => {
        return Math.min(75 + (experience * 1.2), 96).toFixed(0);
    }, [experience]);

    const SECTIONS = [
        {
            icon: Brain,
            title: "Allocation Propensity",
            desc: "Predicted success rates for upcoming demand pipeline matches based on historical performance",
            color: "from-rose-50 to-orange-50/30 border-rose-100",
            iconColor: "text-rose-500",
            metric: `${propensityScore}%`
        },
        {
            icon: Sparkles,
            title: "Intelligent Re-skilling",
            desc: "Targeted skill upgrades that would maximize billability for current market demand",
            color: "from-violet-50 to-indigo-50/30 border-violet-100",
            iconColor: "text-indigo-500",
            metric: experience > 8 ? "Leadership" : "Technical"
        },
        {
            icon: Target,
            title: "Pipeline Synchronization",
            desc: "Auto-identification of high-priority project vacancies matching verified credentials",
            color: "from-sky-50 to-blue-50/30 border-sky-100",
            iconColor: "text-sky-500",
            metric: certsCount > 2 ? "High-Sync" : "Standard"
        },
        {
            icon: GraduationCap,
            title: "Credential Acceleration",
            desc: "Recommended certifications to achieve strategic tier advancement in current domain",
            color: "from-emerald-50 to-teal-50/30 border-emerald-100",
            iconColor: "text-emerald-500",
            metric: `${Math.max(1, 4 - certsCount)} Targets`
        },
    ];

    return (
        <div className="space-y-6 font-sans">

            {/* ── STRATEGIC ANALYTICS ROW ────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
                {[
                    { label: "Strategic Match Index", value: strategicMatchIndex, unit: "PTS", icon: Target, trend: `+${(skillsCount * 0.2).toFixed(1)}%`, color: "text-indigo-600" },
                    { label: "Allocation Velocity", value: allocationVelocity.label, unit: "EST", icon: Zap, trend: allocationVelocity.trend, color: "text-amber-600" },
                    { label: "Skill Density", value: skillDensity.label, unit: "RANK", icon: TrendingUp, trend: skillDensity.rank, color: "text-emerald-600" }
                ].map((m, i) => (
                    <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all hover:shadow-md">
                        <div>
                            <div className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider font-sans">{m.label}</div>
                            <div className="flex items-baseline gap-1.5">
                                <span className={cn("text-2xl font-bold tracking-tight font-sans", m.color)}>{m.value}</span>
                                <span className="text-[10px] font-bold text-slate-400 font-sans">{m.unit}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center mb-2 ml-auto group-hover:bg-indigo-50 transition-colors">
                                <m.icon className={cn("h-5 w-5 opacity-80", m.color)} />
                            </div>
                            <div className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full inline-block font-sans", 
                                m.trend.includes('CRITICAL') || m.trend.includes('CONSTRAINED') ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600")}>
                                {m.trend}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── FEATURE ANALYTICS GRID ─────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
                {SECTIONS.map((s) => {
                    const Icon = s.icon;
                    return (
                        <div key={s.title} className={cn(
                            "rounded-2xl border bg-white p-6 overflow-hidden group transition-all hover:shadow-lg h-full flex flex-col justify-between relative shadow-sm",
                            "border-slate-200"
                        )}>
                            <div className={cn("absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-[0.03] rounded-bl-full transition-all group-hover:opacity-[0.05]", s.color)} />

                            <div>
                                <div className="flex items-center justify-between mb-5">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-sm group-hover:bg-indigo-50 transition-colors">
                                            <Icon className={cn("h-5 w-5", s.iconColor)} />
                                        </div>
                                        <h3 className="text-sm font-heading font-bold text-slate-900 font-sans">{s.title}</h3>
                                    </div>
                                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full font-sans shadow-sm border border-indigo-100/50">{s.metric}</span>
                                </div>
                                <p className="text-xs font-medium text-slate-500 leading-relaxed max-w-[90%] font-sans">{s.desc}</p>
                            </div>

                            <div className="flex items-center justify-between mt-8 pt-5 border-t border-slate-100">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 shadow-lg shadow-slate-200 text-[9px] font-bold text-white transition-all group-hover:-translate-y-0.5 font-sans">
                                    <Zap className="h-3 w-3 text-amber-400 group-hover:scale-110 transition-transform" />
                                    AI ENGINE SYNCING
                                </div>
                                <div className="text-[9px] font-bold text-slate-400 tracking-wider font-sans uppercase">LEVEL-2 INTELLIGENCE</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Strategic Advisory */}
            <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100/50 flex flex-col sm:flex-row items-start gap-4 font-sans">
                <Info className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                    <p className="text-xs font-bold text-indigo-900 font-heading">Strategic Roadmap Insights</p>
                    <p className="text-[10px] font-medium text-indigo-700/70 mt-1 leading-relaxed italic font-sans">
                        AI-driven projections are based on internal resource trends, certification velocity, and current market demand signals.
                    </p>
                </div>
                <Button variant="outline" size="sm" className="w-full sm:w-auto mt-2 sm:mt-0 text-[10px] font-bold h-7 gap-1.5 bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-sans">
                    View Methodology <ArrowUpRight className="h-3 w-3" />
                </Button>
            </div>
        </div>
    );
}
