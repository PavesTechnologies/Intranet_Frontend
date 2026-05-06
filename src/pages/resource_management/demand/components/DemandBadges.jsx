import React from 'react';
import { cn } from "@/lib/utils";
import {
    Clock, AlertTriangle, CheckCircle2, ShieldAlert,
    TrendingUp, Shield, Zap, Target
} from "lucide-react";

export const PriorityBadge = ({ priority }) => {
    const p = String(priority).toUpperCase();
    const config = {
        'CRITICAL': { color: 'bg-rose-50 text-rose-700 border-rose-100', icon: ShieldAlert },
        'HIGH': { color: 'bg-amber-50 text-amber-700 border-amber-100', icon: AlertTriangle },
        'MEDIUM': { color: 'bg-indigo-50 text-indigo-700 border-indigo-100', icon: Clock },
        'LOW': { color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: Clock },
    };
    const c = config[p] || { color: 'bg-slate-50 text-slate-600 border-slate-100', icon: Clock };

    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border shadow-sm",
            c.color
        )}>
            <c.icon className="h-3 w-3" />
            {p}
        </span>
    );
};

export const StateBadge = ({ state }) => {
    const s = String(state).toUpperCase();
    const config = {
        'APPROVED': { color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle2 },
        'OPEN': { color: 'bg-indigo-50 text-indigo-700 border-indigo-100', icon: Zap },
        'SOFT': { color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Shield },
        'PENDING': { color: 'bg-amber-50 text-amber-600 border-amber-100', icon: Clock },
        'REJECTED': { color: 'bg-rose-50 text-rose-600 border-rose-100', icon: Target },
    };
    const c = config[s] || { color: 'bg-slate-50 text-slate-500 border-slate-100', icon: Clock };

    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-tight border",
            c.color
        )}>
            <c.icon className="h-3 w-3" />
            {s}
        </span>
    );
};

export const SLABadge = ({ days }) => {
    const isBreached = days < 0;
    const isAtRisk = days >= 0 && days <= 5;

    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold border tabular-nums",
            isBreached ? "bg-rose-950 text-white border-rose-900" :
                isAtRisk ? "bg-amber-50 text-amber-700 border-amber-200" :
                    "bg-emerald-50 text-emerald-700 border-emerald-100"
        )}>
            {isBreached ? <ShieldAlert className="h-3 w-3 text-rose-400" /> : <Clock className="h-3 w-3" />}
            {isBreached ? `BREACHED (${Math.abs(days)}d)` : `${days} DAYS LEFT`}
        </span>
    );
};

export const DemandTypeBadge = ({ type }) => {
    const t = String(type).toUpperCase();
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-black uppercase tracking-widest">
            {t}
        </span>
    );
};

export const ScoreBadge = ({ score }) => {
    const val = Number(score);
    let color = "bg-indigo-500";
    if (val >= 90) color = "bg-emerald-500";
    else if (val <= 60) color = "bg-rose-500";

    return (
        <div className="flex items-center gap-2">
            <span className="text-[11px] font-black text-slate-900 tabular-nums">{val}%</span>
            <div className="h-1.5 w-8 bg-slate-100 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${val}%` }} />
            </div>
        </div>
    );
};
