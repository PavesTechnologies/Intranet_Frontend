import React from 'react';
import { cn } from "@/lib/utils";
import {
    Clock, AlertTriangle, CheckCircle2, ShieldAlert,
    TrendingUp, Shield, Zap, Target, Activity,
    Lock, ShieldCheck, HelpCircle, Flame
} from "lucide-react";

/**
 * FormalBadges: Evolved Enterprise Identifiers
 * Re-weighted for better visual hierarchy.
 */

export const PriorityBadge = ({ priority, className }) => {
    const p = String(priority || 'Medium');
    const config = {
        'CRITICAL': { className: 'bg-rose-600 text-white border-rose-700 shadow-rose-200', label: 'Critical', icon: Flame },
        'HIGH': { className: 'bg-amber-500 text-white border-amber-600 shadow-amber-200', label: 'High', icon: AlertTriangle },
        'MEDIUM': { className: 'bg-indigo-50 border-indigo-100 text-indigo-700', label: 'Medium', icon: Clock },
        'LOW': { className: 'bg-slate-50 border-slate-200 text-slate-500', label: 'Low', icon: Clock },
    };
    const c = config[p.toUpperCase()] || { className: 'bg-slate-100 border-slate-200 text-slate-600', label: p, icon: HelpCircle };

    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black tracking-tight border shadow-sm transition-all",
            c.className,
            className
        )}>
            <c.icon className="h-2.5 w-2.5" />
            {c.label}
        </span>
    );
};

export const StateBadge = ({ state, className }) => {
    const s = String(state || 'Pending').toUpperCase();
    const config = {
        'FULFILLED': { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', label: 'Fulfilled' },
        'APPROVED': { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', label: 'Approved' },
        'OPEN': { dot: 'bg-indigo-500', text: 'text-indigo-700', bg: 'bg-indigo-50', label: 'Open' },
        'ACTIVE': { dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50', label: 'Active' },
        'SOFT': { dot: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-50', label: 'Soft' },
        'PENDING': { dot: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50', label: 'Pending' },
        'REQUESTED': { dot: 'bg-violet-400', text: 'text-violet-700', bg: 'bg-violet-50', label: 'Requested' },
        'DRAFT': { dot: 'bg-slate-300', text: 'text-slate-600', bg: 'bg-slate-100', label: 'Draft' },
        'PROPOSED': { dot: 'bg-blue-300', text: 'text-blue-600', bg: 'bg-blue-50', label: 'Proposed' },
        'REJECTED': { dot: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50', label: 'Rejected' },
    };
    const c = config[s] || { dot: 'bg-slate-300', text: 'text-slate-500', bg: 'bg-slate-50', label: state || 'Unknown' };

    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight border border-transparent shadow-sm",
            c.bg, c.text, className
        )}>
            <div className={cn("h-1 w-1 rounded-full shrink-0 animate-pulse", c.dot)} />
            {c.label}
        </span>
    );
};

export const SLABadge = ({ days, isSoft }) => {
    if (isSoft) {
        return (
            <div className="flex flex-col items-center gap-0.5 px-2 py-0.5 rounded-lg border min-w-[80px] transition-all bg-slate-50 border-slate-100 text-slate-400">
                <div className="flex items-center gap-1">
                    <Clock className="h-2 w-2 opacity-40" />
                    <span className="text-[8px] font-black tracking-widest uppercase text-slate-400">SLA</span>
                </div>
                <span className="text-[11px] font-black tabular-nums">NO</span>
            </div>
        );
    }

    const isBreached = days < 0;
    const isAtRisk = days >= 0 && days <= 5;

    return (
        <div className={cn(
            "flex flex-col items-center gap-0.5 px-2 py-0.5 rounded-lg border min-w-[80px] transition-all",
            isBreached ? "bg-rose-50 border-rose-200 text-rose-700" :
                isAtRisk ? "bg-amber-50 border-amber-200 text-amber-700 shadow-sm" :
                    "bg-slate-50 border-slate-100 text-slate-500"
        )}>
            <div className="flex items-center gap-1">
                {isBreached ? <ShieldAlert className="h-2.5 w-2.5" /> : <Clock className="h-2 w-2" />}
                <span className="text-[8px] font-black tracking-widest uppercase">{isBreached ? 'Breached' : 'Remaining'}</span>
            </div>
            <span className="text-[11px] font-black tabular-nums">{isBreached ? `${Math.abs(days)}d Over` : `${days}d`}</span>
        </div>
    );
};

export const DemandTypeBadge = ({ type }) => {
    const t = String(type || 'Unknown');
    return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white border border-slate-200 text-[9px] font-bold tracking-tight text-slate-500 rounded-md">
            <Target className="h-2.5 w-2.5" />
            {t}
        </span>
    );
};

export const ScoreBadge = ({ score }) => {
    const val = Number(score || 0);
    return (
        <div className="flex flex-col items-center">
            <span className="text-base font-black text-slate-900 tracking-tighter leading-none">{val}</span>
            <span className="text-[8px] font-bold text-slate-400 tracking-[0.2em] mt-0.5 uppercase">Score</span>
        </div>
    );
};
