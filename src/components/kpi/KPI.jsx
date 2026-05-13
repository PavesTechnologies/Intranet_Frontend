import { cn } from "@/lib/utils"

export function KPICard({ label, value, icon, color, active, onClick, suffix, className }) {
    return (
        <div className={cn("flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-all", active ? "ring-2 ring-primary bg-primary/5 border-primary/20" : "", className)}>
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", color || "bg-secondary text-secondary-foreground")}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500 mb-0.5 whitespace-nowrap">
                    {label}
                </p>
                <p className="text-2xl font-bold text-slate-900 tabular-nums tracking-tight">
                    {value}{suffix}
                </p>
            </div>
        </div>
    )
};