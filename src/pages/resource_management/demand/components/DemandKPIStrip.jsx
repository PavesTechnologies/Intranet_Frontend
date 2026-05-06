import React from 'react';
import {
    Users, Briefcase, Activity, Clock,
    AlertTriangle, CheckCircle2, ShieldAlert,
    Shield, Zap, Target, Layers
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * DemandKPIStrip: Workforce Edition
 * Directly matches AvailabilityKPIs.jsx style used in Workforce page.
 */

const KPICard = ({ label, value, icon: Icon, colorClass, active, onClick, suffix, className, isLoading }) => {
    if (isLoading) {
        return (
            <div className="h-20 rounded-xl border border-slate-100 bg-white p-3 flex items-center gap-3 animate-pulse">
                <div className="h-8 w-8 rounded-lg bg-slate-100 shrink-0" />
                <div className="space-y-2 flex-1">
                    <div className="h-2 w-2/3 bg-slate-100 rounded" />
                    <div className="h-4 w-1/3 bg-slate-100 rounded" />
                </div>
            </div>
        );
    }

    return (
        <div className={cn(
            "flex items-center gap-3 rounded-xl border bg-white p-4 text-left transition-all shadow-sm",
            active ? "ring-2 ring-indigo-600 bg-indigo-50 border-indigo-200" : "border-slate-100 hover:border-slate-200 hover:shadow-md",
            className
        )}>
            <div className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg shadow-sm transition-transform",
                colorClass || "bg-slate-100 text-slate-600"
            )}>
                <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500 mb-0.5 whitespace-nowrap tracking-tight">
                    {label}
                </p>
                <div className="flex items-baseline gap-1">
                    <p className="text-2xl font-bold text-slate-900 tabular-nums tracking-tight">
                        {value}
                    </p>
                    {suffix && <span className="text-sm font-bold text-slate-400">{suffix}</span>}
                </div>
            </div>
        </div>
    );
};

const DemandKPIStrip = ({ data, isLoading }) => {
    const kpiConfig = {
        "Total": { icon: Layers, color: "bg-slate-100 text-slate-600" },
        "Active": { icon: Activity, color: "bg-indigo-100 text-indigo-600" },
        "Fulfilled": { icon: CheckCircle2, color: "bg-emerald-100 text-emerald-600" },
        "Approved": { icon: Shield, color: "bg-blue-100 text-blue-600" },
        "Pending": { icon: Clock, color: "bg-amber-100 text-amber-600" },
        "Soft": { icon: Zap, color: "bg-slate-100 text-slate-600" },
        "SLA At Risk": { icon: AlertTriangle, color: "bg-rose-100 text-orange-600" },
        "SLA Breached": { icon: ShieldAlert, color: "bg-rose-100 text-rose-600" }
    };

    if (isLoading || !data || data.length === 0) {
        const skeletonCount = 5;
        return (
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${skeletonCount} gap-4`}>
                {[...Array(skeletonCount)].map((_, i) => <KPICard key={i} isLoading={true} />)}
            </div>
        );
    }

    const colCount = data.length;

    return (
        <div
            className={cn(
                "grid gap-4",
                colCount === 3 && "grid-cols-1 sm:grid-cols-3",
                colCount === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
                colCount === 5 && "grid-cols-1 sm:grid-cols-3 lg:grid-cols-5",
                colCount === 6 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-6",
                !([3, 4, 5, 6].includes(colCount)) && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            )}
        >
            {data.map((item, idx) => {
                const config = kpiConfig[item.label] || { icon: Target, color: "bg-slate-100 text-slate-400" };
                return (
                    <KPICard
                        key={idx}
                        label={item.label}
                        value={item.count}
                        icon={config.icon}
                        colorClass={config.color}
                        className="w-full"
                    />
                );
            })}
        </div>
    );
};

export default DemandKPIStrip;
