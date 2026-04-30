import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
    ArrowLeft, Calendar, UserPlus, ShieldAlert, ShieldCheck,
    Globe, Database, Briefcase, MapPin,
    Target, Clock, ChevronRight, Activity,
    LayoutDashboard, CheckCircle2, MoreVertical,
    FileText, Zap, Shield, AlertTriangle,
    Mail, ExternalLink, PenTool, XCircle, Info,
    UserCheck, FileSearch, History, Star, Settings2, Download,
    TrendingUp, Award, Layers, Hash, Building2, GitCompare, Code2, Percent, Plus,
    Users, Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import SkillGapTab from '../../components/resource-intelligence/SkillGapTab';
import AllocationModal from '../components/AllocationModal';
import AllocationModificationTab from '../components/AllocationModificationTab';
import demandService from '../services/demandService';
import { useAuth } from '../../../../contexts/AuthContext';
import { PriorityBadge, StateBadge } from '../components/FormalBadges';
import { Button } from "@/components/ui/button";
import Pagination from '../../../../components/Pagination/pagination';
import { fetchResourcesByDemandId } from '../../services/resource';


/**
 * --- INTERNAL SUB-COMPONENTS ---
 */

const DetailCard = ({ title, icon: Icon, children, className, rightElement }) => (
    <div className={cn("bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md", className)}>
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 tracking-tight">
                {Icon && <Icon className="h-4 w-4 text-indigo-500" />} {title}
            </h3>
            {rightElement}
        </div>
        <div className="p-6 flex-1">
            {children}
        </div>
    </div>
);

const InfoRow = ({ label, value, icon: Icon, colorClass = "text-slate-900" }) => (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
        <div className="flex items-center gap-2 text-slate-400">
            {Icon && <Icon className="h-3.5 w-3.5" />}
            <span className="text-[10px] font-bold text-slate-500 tracking-tight">{label}</span>
        </div>
        <span className={cn("text-xs font-bold text-right ml-4", colorClass)}>{value || "—"}</span>
    </div>
);

/**
 * --- TAB 1: OVERVIEW ---
 */
const OverviewTab = ({ demand, project, sla, passedClientName }) => {
    console.log("Demand: ", demand);
    const warningThreshold = sla?.warningThresholdDays || 5;
    const remainingDays = sla?.remainingDays ?? 0;
    const progress = Math.min(100, Math.max(0, ((sla?.slaDurationDays - remainingDays) / sla?.slaDurationDays) * 100)) || 0;

    let slaColor = "bg-emerald-500";
    if (remainingDays < 0) slaColor = "bg-rose-500";
    else if (remainingDays <= warningThreshold) slaColor = "bg-orange-500";

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Card 1: Demand Summary */}
            <DetailCard title="Demand Summary" icon={FileText}>
                <div className="space-y-1">
                    <InfoRow label="Demand Name" value={demand.demandName} />
                    <InfoRow label="Demand Type" value={demand.demandType} />
                    <InfoRow label="Priority" value={<PriorityBadge priority={demand.demandPriority} />} />
                    <InfoRow label="Resources Required" value={demand.resourcesRequired || demand.resourceRequired || "1"} />
                    <InfoRow label="Min Experience" value={`${demand.minExp || 0} Years`} />
                    <InfoRow label="Commitment Status" value={demand.demandCommitment || "CONFIRMED"} colorClass="text-indigo-600" />
                </div>
            </DetailCard>

            {/* Card 2: Project & Client Info */}
            <DetailCard title="Project & Client Info" icon={Building2}>
                <div className="space-y-1">
                    <InfoRow label="Project Name" value={project.name || "N/A"} icon={Briefcase} />
                    <InfoRow label="Client" value={passedClientName || demand.clientName || demand.client || "N/A"} icon={UserCheck} />
                    <InfoRow label="Delivery Model" value={project.deliveryModel || demand.deliveryModel || "Onsite"} icon={Globe} />
                    <InfoRow label="Location" value={project.primaryLocation || "N/A"} icon={MapPin} />
                    <InfoRow label="Lifecycle" value={project.lifecycleStage || "N/A"} colorClass="text-emerald-600" />
                    <InfoRow label="Risk Level" value={
                        <div className={cn(
                            "px-2 py-0.5 rounded text-[9px] font-bold border",
                            project.riskLevel?.toUpperCase() === 'HIGH' ? "bg-rose-50 text-rose-600 border-rose-100" :
                                project.riskLevel?.toUpperCase() === 'MEDIUM' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                    "bg-emerald-50 text-emerald-600 border-emerald-100"
                        )}>
                            {project.riskLevel || "Low"}
                        </div>
                    } />
                    <InfoRow label="Staffing Readiness" value={project.staffingReadinessStatus || "Ready"} colorClass="text-indigo-600" />
                </div>
            </DetailCard>

            {/* Card 3: SLA Health Indicator */}
            {!sla?.slaDurationDays ? (
                <DetailCard title="SLA Health Indicator" icon={Activity} rightElement={
                    <div className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded text-[9px] font-bold border border-slate-200">No SLA</div>
                }>
                    <div className="flex flex-col items-center justify-center h-full py-10 gap-4 text-slate-300">
                        <div className="h-14 w-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
                            <Clock className="h-6 w-6 text-slate-300" />
                        </div>
                        <div className="text-center">
                            <p className="text-[11px] font-black text-slate-400 tracking-widest">NO SLA ASSIGNED</p>
                            <p className="text-[9px] font-bold text-slate-300 mt-1">This demand has no SLA configuration</p>
                        </div>
                    </div>
                </DetailCard>
            ) : (
                <DetailCard title="SLA Health Indicator" icon={Activity} rightElement={
                    <div className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-bold border border-emerald-100">Healthy Stable</div>
                }>
                    <div className="flex flex-col h-full">
                        <div className="text-center py-4 mb-4">
                            <span className={cn("text-3xl font-black tracking-tighter", remainingDays < 0 ? "text-rose-600" : remainingDays <= 5 ? "text-orange-600" : "text-emerald-600")}>
                                {remainingDays < 0 ? `${Math.abs(remainingDays)} Days Over` : `${remainingDays} Days Remaining`}
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                    <span className="text-[9px] font-black text-slate-400 block mb-1">Created</span>
                                    <span className="text-xs font-bold text-slate-900 block">{sla?.slaCreatedAt ? new Date(sla.slaCreatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : "N/A"}</span>
                                </div>
                                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                    <span className="text-[9px] font-black text-slate-400 block mb-1">Due Date</span>
                                    <span className="text-xs font-bold text-slate-900 block">{sla?.slaDueAt ? new Date(sla.slaDueAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : "N/A"}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-[10px] font-black tracking-widest text-slate-400">
                                    <span>Progress</span>
                                    <span>{Math.round(progress)}%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                    <div className={cn("h-full transition-all duration-1000", slaColor)} style={{ width: `${progress}%` }} />
                                </div>
                                <div className="flex justify-between items-center text-[9px] font-bold text-slate-400">
                                    <span>Threshold: {warningThreshold} Days</span>
                                    <span>SLA Target: {sla?.slaDurationDays || 30} Days</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </DetailCard>
            )}
        </div>
    );
};

/**
 * --- TAB 2: DELIVERY ROLE INFO ---
 */
const RoleInfoTab = ({ demand, role }) => {
    const [page, setPage] = useState(1);
    const [pageSize] = useState(5);

    // Group skills for the table
    const skills = useMemo(() => {
        if (!role.skill) return [];
        return [{
            primary: role.skill.name || "N/A",
            sub: role.subSkill?.name || "N/A",
            proficiency: role.proficiencyLevel?.proficiencyName || "N/A",
            mandatory: role.mandatoryFlag || false,
            status: role.status || "Active"
        }];
    }, [role]);

    const totalElements = skills.length;
    const totalPages = Math.ceil(totalElements / pageSize);

    const paginatedSkills = useMemo(() => {
        const start = (page - 1) * pageSize;
        return skills.slice(start, start + pageSize);
    }, [skills, page, pageSize]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Role Header */}
            <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-xl overflow-hidden relative">
                <div className="absolute right-0 top-0 p-8 opacity-5 scale-150"><Target className="h-32 w-32" /></div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative">
                    <div className="flex items-center gap-5">
                        <div className="h-12 w-12 sm:h-14 sm:w-14 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shrink-0">
                            <Code2 className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black tracking-tight">{role.role?.roleName || "N/A"}</h2>
                            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-1">
                                <span className="text-[9px] sm:text-[10px] font-black text-indigo-400 tracking-widest">Allocation: {demand.allocationPercentage || 0}%</span>
                                <div className="hidden sm:block h-1 w-1 rounded-full bg-white/20" />
                                <span className="text-[9px] sm:text-[10px] font-black text-white/40 tracking-widest">Min Exp: {demand.minExp || 0} Years</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-4 sm:mt-0">
                        <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] sm:text-[10px] font-black tracking-widest text-indigo-400">Mandatory: {role.mandatoryFlag ? "Yes" : "No"}</div>
                        <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] sm:text-[10px] font-black tracking-widest text-indigo-400">Structural Valid</div>
                    </div>
                </div>
            </div>

            {/* Skills Table */}
            <DetailCard title="Technical Blueprint & Skills Matrix" icon={Award}>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="text-center py-4 px-4 text-[10px] font-black text-slate-400 tracking-widest">Primary Skill</th>
                                <th className="text-center py-4 px-4 text-[10px] font-black text-slate-400 tracking-widest">Sub Skill</th>
                                <th className="text-center py-4 px-4 text-[10px] font-black text-slate-400 tracking-widest">Proficiency</th>
                                <th className="text-center py-4 px-4 text-[10px] font-black text-slate-400 tracking-widest">Mandatory</th>
                                <th className="text-center py-4 px-4 text-[10px] font-black text-slate-400 tracking-widest">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-center">
                            {paginatedSkills.map((skill, i) => (
                                <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="py-4 px-4">
                                        <span className="text-xs font-black text-slate-900 tracking-tight">{skill.primary}</span>
                                    </td>
                                    <td className="py-4 px-4 text-xs font-bold text-slate-500 tracking-tight">{skill.sub}</td>
                                    <td className="py-4 px-4">
                                        <div className="flex flex-col items-center gap-1.5 w-32 mx-auto">
                                            <span className="text-[9px] font-black text-indigo-600 italic">{skill.proficiency}</span>
                                            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-indigo-500" style={{ width: '60%' }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex justify-center">
                                            {skill.mandatory ? (
                                                <div className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" title="Mandatory" />
                                            ) : (
                                                <div className="h-2 w-2 rounded-full bg-slate-200" title="Optional" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-black border border-emerald-100">Active</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <Pagination
                            currentPage={page}
                            totalPages={totalPages}
                            onPrevious={() => setPage(p => Math.max(1, p - 1))}
                            onNext={() => setPage(p => Math.min(totalPages, p + 1))}
                        />
                    </div>
                )}
            </DetailCard>
        </div>
    );
};

/**
 * --- TAB 3: APPROVAL FLOW ---
 *
 * Stages:
 *  1. Created                  → Always complete (demand exists)
 *  2. Delivery Manager Approved → complete when status = APPROVED | FULFILLED | ACTIVE | REJECTED
 *  3. Resource Manager Approved → complete if FULFILLED/ACTIVE, rejected if REJECTED, pending if APPROVED
 *  4. Final Confirmation        → complete if FULFILLED | ACTIVE
 */
const ApprovalFlowTab = ({ demand }) => {
    const rawStatus = demand?.demandStatus?.toUpperCase() || '';
    const dmRejection = demand?.dmRejectionReason || (rawStatus === 'REJECTED' && !demand?.rmRejectionReason ? demand?.rejectionReason : null);
    const rmRejection = demand?.rmRejectionReason || (rawStatus === 'REJECTED' && !!demand?.rmRejectionReason ? demand?.rejectionReason : null);

    // ── Derive step statuses from real demand status ──────────────────────────
    const dmDone = ['APPROVED', 'FULFILLED', 'ACTIVE'].includes(rawStatus) || (rawStatus === 'REJECTED' && !!rmRejection);
    const dmRejected = rawStatus === 'REJECTED' && !!dmRejection;
    const dmPending = rawStatus === 'REQUESTED' || rawStatus === 'DRAFT';

    const rmDone = ['FULFILLED', 'ACTIVE'].includes(rawStatus);
    const rmRejected = rawStatus === 'REJECTED' && !!rmRejection;
    const rmPending = rawStatus === 'APPROVED';

    const finalDone = ['FULFILLED', 'ACTIVE'].includes(rawStatus);

    const steps = [
        {
            label: "Created",
            subLabel: rawStatus === 'DRAFT' ? 'DRAFT' : rawStatus === 'REQUESTED' ? 'REQUESTED' : null,
            status: "complete",
        },
        {
            label: "Delivery Manager Approved",
            status: dmDone ? "complete" : dmRejected ? "rejected" : dmPending ? "pending" : "future",
            rejectionReason: dmRejected ? dmRejection : null,
        },
        {
            label: "Resource Manager Approved",
            status: rmDone ? "complete" : rmRejected ? "rejected" : rmPending ? "pending" : "future",
            rejectionReason: rmRejected ? rmRejection : null,
        },
        {
            label: "Final Confirmation",
            status: finalDone ? "complete" : "future",
        },
    ];

    // ── Step visual config ────────────────────────────────────────────────────
    const stepStyle = {
        complete: {
            circle: "bg-emerald-50 border-emerald-500 text-emerald-600 shadow-emerald-500/10",
            text: "text-slate-900",
            icon: <CheckCircle2 className="h-5 w-5" />,
        },
        pending: {
            circle: "bg-amber-50 border-amber-500 text-amber-600 animate-pulse shadow-amber-500/10",
            text: "text-amber-600",
            icon: <History className="h-5 w-5" />,
        },
        rejected: {
            circle: "bg-rose-50 border-rose-500 text-rose-600 shadow-rose-500/10",
            text: "text-rose-600",
            icon: <XCircle className="h-5 w-5" />,
        },
        future: {
            circle: "bg-white border-slate-200 text-slate-300",
            text: "text-slate-400",
            icon: <div className="h-2 w-2 rounded-full bg-slate-200" />,
        },
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

            {/* ── STEPPER CARD ─────────────────────────────────────────────── */}
            <DetailCard title="Sequential Governance Pipeline" icon={ShieldCheck}>
                <div className="py-6 sm:py-12 px-2 sm:px-6">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between relative gap-8 md:gap-0">

                        {/* Connecting line — desktop */}
                        <div className="hidden md:block absolute top-5 left-0 w-full h-0.5 bg-slate-100 z-0" />
                        {/* Connecting line — mobile */}
                        <div className="md:hidden absolute left-5 top-0 w-0.5 h-full bg-slate-100 z-0" />

                        {steps.map((step, i) => {
                            const style = stepStyle[step.status] || stepStyle.future;
                            return (
                                <div
                                    key={i}
                                    className="flex flex-row md:flex-col items-center md:items-center gap-4 relative z-10 w-full md:w-1/4"
                                >
                                    {/* Circle icon */}
                                    <div className={cn(
                                        "h-10 w-10 min-w-[40px] rounded-full flex items-center justify-center border-2 transition-all shadow-sm",
                                        style.circle
                                    )}>
                                        {style.icon}
                                    </div>

                                    {/* Label block */}
                                    <div className="text-left md:text-center px-0 md:px-2">
                                        <p className={cn(
                                            "text-[10px] font-black tracking-tight mb-0.5",
                                            style.text
                                        )}>
                                            {step.label}
                                        </p>

                                        {/* Sub-label for Created step (shows current raw status) */}
                                        {step.subLabel && (
                                            <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[8px] font-black tracking-widest">
                                                {step.subLabel}
                                            </span>
                                        )}

                                        {/* Rejected badge + reason on Stage 3 */}
                                        {step.status === 'rejected' && (
                                            <div className="flex flex-col items-start md:items-center gap-1 mt-1">
                                                <span className="inline-block px-2 py-0.5 bg-rose-100 text-rose-600 rounded text-[8px] font-black tracking-widest border border-rose-200">
                                                    REJECTED
                                                </span>
                                                {step.rejectionReason && (
                                                    <span
                                                        title={step.rejectionReason}
                                                        className="text-[9px] font-bold text-rose-500 italic max-w-[120px] truncate"
                                                    >
                                                        &ldquo;{step.rejectionReason}&rdquo;
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Pending badge */}
                                        {step.status === 'pending' && (
                                            <span className="inline-block mt-1 px-2 py-0.5 bg-amber-100 text-amber-600 rounded text-[8px] font-black tracking-widest border border-amber-200">
                                                AWAITING
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </DetailCard>

            {/* ── CONDITIONAL STATUS BANNER ───────────────────────────────── */}

            {/* REJECTED — DM rejected the demand */}
            {dmRejected && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 text-rose-700">
                            <XCircle className="h-5 w-5 shrink-0" />
                            <span className="text-[10px] sm:text-[11px] font-bold tracking-wider">
                                This demand was <strong>rejected by the Delivery Manager</strong>. Please review the requirements and resubmit.
                            </span>
                        </div>
                        <div className="w-full sm:w-auto text-center px-4 py-2 bg-rose-600 text-white rounded-xl text-[9px] sm:text-[10px] font-black tracking-[0.15em] shadow-lg shadow-rose-600/20 whitespace-nowrap">
                            DM REJECTED
                        </div>
                    </div>

                    {dmRejection && (
                        <div className="mx-4 sm:mx-5 mb-4 sm:mb-5 p-4 bg-white border border-rose-200 rounded-xl">
                            <p className="text-[9px] font-black text-rose-400 uppercase tracking-[0.15em] mb-2 flex items-center gap-1.5">
                                <AlertTriangle className="h-3 w-3" />
                                DM Rejection Reason
                            </p>
                            <p className="text-sm font-bold text-rose-700 leading-relaxed">
                                &ldquo;{dmRejection}&rdquo;
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* REJECTED — RM rejected the demand */}
            {rmRejected && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 text-rose-700">
                            <XCircle className="h-5 w-5 shrink-0" />
                            <span className="text-[10px] sm:text-[11px] font-bold tracking-wider">
                                This demand was <strong>rejected by the Resource Manager</strong>. Please review the requirements and resubmit.
                            </span>
                        </div>
                        <div className="w-full sm:w-auto text-center px-4 py-2 bg-rose-600 text-white rounded-xl text-[9px] sm:text-[10px] font-black tracking-[0.15em] shadow-lg shadow-rose-600/20 whitespace-nowrap">
                            RM REJECTED
                        </div>
                    </div>

                    {rmRejection && (
                        <div className="mx-4 sm:mx-5 mb-4 sm:mb-5 p-4 bg-white border border-rose-200 rounded-xl">
                            <p className="text-[9px] font-black text-rose-400 uppercase tracking-[0.15em] mb-2 flex items-center gap-1.5">
                                <AlertTriangle className="h-3 w-3" />
                                RM Rejection Reason
                            </p>
                            <p className="text-sm font-bold text-rose-700 leading-relaxed">
                                &ldquo;{rmRejection}&rdquo;
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* APPROVED — DM approved, waiting on RM */}
            {rmPending && (
                <div className="p-4 sm:p-6 bg-amber-50 border border-amber-100 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-4 text-amber-700">
                        <Info className="h-5 w-5 shrink-0" />
                        <span className="text-[10px] sm:text-[11px] font-bold tracking-wider">
                            Delivery Manager has approved this demand. Awaiting <strong>Resource Manager approval</strong> to proceed to final confirmation.
                        </span>
                    </div>
                    <div className="w-full sm:w-auto text-center px-4 py-2 bg-amber-600 text-white rounded-xl text-[9px] sm:text-[10px] font-black tracking-[0.15em] shadow-lg shadow-amber-600/20 whitespace-nowrap">
                        AWAITING RM
                    </div>
                </div>
            )}

            {/* REQUESTED/DRAFT — waiting on DM */}
            {dmPending && (
                <div className="p-4 sm:p-6 bg-blue-50 border border-blue-100 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-4 text-blue-700">
                        <Info className="h-5 w-5 shrink-0" />
                        <span className="text-[10px] sm:text-[11px] font-bold tracking-wider">
                            This demand has been created and is awaiting <strong>Delivery Manager approval</strong>.
                        </span>
                    </div>
                    <div className="w-full sm:w-auto text-center px-4 py-2 bg-blue-600 text-white rounded-xl text-[9px] sm:text-[10px] font-black tracking-[0.15em] shadow-lg shadow-blue-600/20 whitespace-nowrap">
                        AWAITING DM
                    </div>
                </div>
            )}

            {/* FULFILLED/ACTIVE — all stages complete */}
            {finalDone && (
                <div className="p-4 sm:p-6 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-4 text-emerald-700">
                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                        <span className="text-[10px] sm:text-[11px] font-bold tracking-wider">
                            All approvals complete. This demand has been <strong>fulfilled</strong> and a resource has been successfully allocated.
                        </span>
                    </div>
                    <div className="w-full sm:w-auto text-center px-4 py-2 bg-emerald-600 text-white rounded-xl text-[9px] sm:text-[10px] font-black tracking-[0.15em] shadow-lg shadow-emerald-600/20 whitespace-nowrap">
                        FULFILLED
                    </div>
                </div>
            )}

        </div>
    );
};

/**
 * --- TAB 4: SLA INSIGHTS ---
 */
/**
 * --- TAB 5: ALLOCATION RESULTS ---
 */
const AllocationResultsTab = ({ results }) => {
    const [activeSubTab, setActiveSubTab] = useState('Successful');
    const [selectedItem, setSelectedItem] = useState(null);

    const successfulList = results?.data?.savedAllocations || [];
    const failedList = results?.data?.failedResources || [];
    const successCount = results?.data?.successCount || 0;
    const failureCount = results?.data?.failureCount || 0;

    useEffect(() => {
        if (activeSubTab === 'Successful' && successfulList.length > 0) {
            setSelectedItem(successfulList[0]);
        } else if (activeSubTab === 'Failed' && failedList.length > 0) {
            setSelectedItem(failedList[0]);
        } else {
            setSelectedItem(null);
        }
    }, [activeSubTab, successfulList, failedList]);

    const items = activeSubTab === 'Successful' ? successfulList : failedList;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Title Section */}
            <div>
                <h2 className="text-xl font-bold text-slate-900 mb-6">Allocation Results</h2>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="h-10 w-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Success</p>
                            <p className="text-2xl font-black text-slate-900">{successCount}</p>
                        </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="h-10 w-10 bg-rose-50 rounded-lg flex items-center justify-center text-rose-600">
                            <XCircle className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Failed</p>
                            <p className="text-2xl font-black text-slate-900">{failureCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Result Tabs */}
            <div className="flex gap-8 border-b border-slate-200">
                {['Successful', 'Failed'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveSubTab(tab)}
                        className={cn(
                            "pb-4 text-xs font-bold tracking-widest uppercase relative transition-all",
                            activeSubTab === tab ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        {tab}
                        {activeSubTab === tab && (
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Layout (Two-column) */}
            <div className="flex bg-white border border-slate-200 rounded-2xl overflow-hidden min-h-[450px] shadow-sm">

                {/* Left Panel: Resource List (30%) */}
                <div className="w-[30%] border-r border-slate-100 bg-slate-50/20 overflow-y-auto">
                    <div className="p-2 space-y-1">
                        {items.map((item, idx) => (
                            <button
                                key={idx}
                                onClick={() => setSelectedItem(item)}
                                className={cn(
                                    "w-full text-left px-5 py-4 rounded-xl text-xs font-bold transition-all relative group",
                                    selectedItem === item
                                        ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-100"
                                        : "text-slate-500 hover:bg-slate-50"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "h-1.5 w-1.5 rounded-full",
                                        activeSubTab === 'Successful' ? "bg-emerald-500" : "bg-rose-500"
                                    )} />
                                    <span>{item.resourceName || `Resource ${item.resourceId}`}</span>
                                </div>
                                {selectedItem === item && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-indigo-600 rounded-full" />}
                            </button>
                        ))}
                        {items.length === 0 && (
                            <div className="p-12 text-center opacity-40">
                                <Database className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">No records found</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Details (70%) */}
                <div className="flex-1 p-10 overflow-y-auto">
                    {selectedItem ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-300">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-3">
                                    <UserPlus className={cn("h-5 w-5", activeSubTab === 'Successful' ? "text-indigo-600" : "text-rose-600")} />
                                    {selectedItem.resourceName || `Resource ${selectedItem.resourceId}`}
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    {activeSubTab === 'Successful' ? "Allocation successfully confirmed" : "Allocation failure analysis"}
                                </p>
                            </div>

                            <div className="grid gap-6 pt-6 border-t border-slate-50">
                                {activeSubTab === 'Successful' ? (
                                    <>
                                        <div className="grid grid-cols-[140px,1fr] items-center py-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resource</span>
                                            <span className="text-sm font-bold text-slate-900">{selectedItem.resourceName}</span>
                                        </div>
                                        <div className="grid grid-cols-[140px,1fr] items-center py-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Project</span>
                                            <span className="text-sm font-bold text-slate-900">{selectedItem.projectName || "Stable Coin"}</span>
                                        </div>
                                        <div className="grid grid-cols-[140px,1fr] items-center py-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Allocation</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-bold text-indigo-600">{selectedItem.allocationPercentage}%</span>
                                                <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-500" style={{ width: `${selectedItem.allocationPercentage}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-[140px,1fr] items-center py-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Start Date</span>
                                            <span className="text-sm font-bold text-slate-900">{selectedItem.allocationStartDate}</span>
                                        </div>
                                        <div className="grid grid-cols-[140px,1fr] items-center py-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">End Date</span>
                                            <span className="text-sm font-bold text-slate-900">{selectedItem.allocationEndDate}</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-[140px,1fr] items-center py-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resource</span>
                                            <span className="text-sm font-bold text-slate-900">{selectedItem.resourceName || selectedItem.resourceId}</span>
                                        </div>
                                        <div className="space-y-3 p-6 bg-rose-50/50 border border-rose-100 rounded-2xl relative overflow-hidden group">
                                            <div className="absolute right-0 top-0 p-4 opacity-[0.03] scale-150 rotate-12">
                                                <AlertTriangle className="h-24 w-24 text-rose-900" />
                                            </div>
                                            <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
                                                <Zap className="h-3 w-3" /> Failure Reason
                                            </label>
                                            <p className="text-sm font-bold text-rose-700 leading-relaxed">
                                                {selectedItem.reason}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-50">
                            <FileSearch className="h-10 w-10 text-slate-200" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Select a record to view details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


const SLAInsightsTab = ({ sla }) => {
    const totalDays = sla?.slaDurationDays || 30;
    const remaining = sla?.remainingDays || 0;
    const warningDays = sla?.warningThresholdDays || 5;

    // Position marker for "Today"
    const todayPos = ((totalDays - remaining) / totalDays) * 100;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <DetailCard title="SLA Compliance Vision" icon={Clock}>
                <div className="p-4">
                    <div className="relative mb-6 py-6">
                        {/* Timeline Track */}
                        <div className="h-1 w-full bg-slate-100 rounded-full flex overflow-hidden shadow-inner">
                            <div className="h-full bg-emerald-500" style={{ width: `${((totalDays - warningDays) / totalDays) * 100}%` }} />
                            <div className="h-full bg-orange-500" style={{ width: `${(warningDays / totalDays) * 100}%` }} />
                        </div>

                        {/* Threshold Labels */}
                        <div className="absolute top-0 right-0 translate-y-3">
                            <div className="flex flex-col items-end">
                                <span className="text-[8px] font-black text-slate-400 tracking-widest mb-1">Breach Zone</span>
                                <div className="h-8 w-px bg-rose-200 border-l border-dashed border-rose-300" />
                            </div>
                        </div>

                        {/* Today Marker */}
                        <div className="absolute top-0" style={{ left: `${todayPos}%`, transform: 'translateX(-50%)' }}>
                            <div className="flex flex-col items-center">
                                <div className="px-0.5 py-0.5 bg-indigo-600 text-white rounded text-[6px] font-black mb-0.5 shadow-lg ring-4 ring-white">Today</div>
                                <div className="h-8 w-1 bg-indigo-600 shadow-[0_0_12px_rgba(79,70,229,0.4)]" />
                            </div>
                        </div>

                        {/* Endpoints */}
                        <div className="flex justify-between items-center mt-2 text-[7px] font-black tracking-widest text-slate-400">
                            <div className="flex flex-col">
                                <span className="text-slate-900">Created</span>
                                <span className="font-mono">T+0</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-rose-600">SLA Due</span>
                                <span className="font-mono">T+{totalDays}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-50">
                        <div className="text-center">
                            <span className="text-2xl font-black text-slate-900 tracking-tighter">{remaining}</span>
                            <p className="text-[8px] font-bold text-slate-400 tracking-widest mt-1">Days Remaining</p>
                        </div>
                        <div className="text-center">
                            <span className="text-2xl font-black text-amber-600 tracking-tighter">{warningDays}</span>
                            <p className="text-[8px] font-bold text-slate-400 tracking-widest mt-1">Warning Threshold</p>
                        </div>
                        <div className="text-center">
                            <span className="text-2xl font-black text-rose-600 tracking-tighter">{remaining < 0 ? Math.abs(remaining) : 0}</span>
                            <p className="text-[8px] font-bold text-slate-400 tracking-widest mt-1">Current Overdue</p>
                        </div>
                    </div>
                </div>
            </DetailCard>
        </div>
    );
};

/**
 * --- TAB 6: DEMAND RESOURCES ---
 */
const DemandResourcesTable = ({ demandId }) => {
    const [allocations, setAllocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        const loadResources = async () => {
            try {
                setLoading(true);
                const response = await fetchResourcesByDemandId(demandId);
                if (response.success) {
                    setAllocations(response.data || []);
                } else {
                    setError(response.message || "Failed to fetch resources");
                }
            } catch (err) {
                console.error("Error fetching demand resources:", err);
                setError("An error occurred while fetching resources");
            } finally {
                setLoading(false);
            }
        };

        if (demandId) {
            loadResources();
            setPage(1);
        }
    }, [demandId]);

    useEffect(() => {
        setPage(1);
    }, [searchTerm]);

    const filteredAllocations = allocations.filter(item =>
        item.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredAllocations.length / itemsPerPage);
    const paginatedAllocations = filteredAllocations.slice(
        (page - 1) * itemsPerPage,
        page * itemsPerPage
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <div className="h-8 w-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
                <p className="text-sm text-slate-400 font-bold tracking-widest animate-pulse uppercase">Synchronizing resources...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl flex items-center gap-3">
                <AlertTriangle className="h-5 w-5" />
                <p className="text-xs font-bold">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h3 className="text-sm font-black flex items-center gap-2 text-slate-900 tracking-tight">
                    <UserPlus className="h-4 w-4 text-indigo-500" />
                    Allocated Resources ({allocations.length})
                </h3>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search resources..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {allocations.length === 0 ? (
                <div className="bg-white p-16 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center shadow-sm">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                        <Users className="text-slate-200 h-10 w-10" />
                    </div>
                    <h4 className="text-lg font-black text-slate-900 tracking-tight">No Resources Allocated</h4>
                    <p className="text-sm text-slate-400 max-w-[320px] mt-2 font-medium leading-relaxed">
                        There are currently no resources assigned to this specific demand requirement.
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/50">
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                                <tr>
                                    <th className="p-5">Resource</th>
                                    <th className="p-5 text-center">Allocation</th>
                                    <th className="p-5 text-center">Period</th>
                                    <th className="p-5 text-center">Status</th>
                                    <th className="p-5 text-center">Created By</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {paginatedAllocations.map((item) => (
                                    <tr key={item.allocationId} className="hover:bg-slate-50/30 transition-colors group">
                                        <td className="p-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-11 h-11 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs shrink-0 border border-indigo-100 uppercase shadow-sm group-hover:scale-105 transition-transform">
                                                    {item.fullName.split(" ").map(n => n[0]).join("")}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-black text-slate-900 truncate tracking-tight">{item.fullName}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold truncate mt-0.5">{item.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <span className={`text-[11px] font-black ${item.allocationPercentage >= 80 ? "text-rose-600" :
                                                    item.allocationPercentage >= 50 ? "text-indigo-600" : "text-emerald-600"
                                                    }`}>
                                                    {item.allocationPercentage}%
                                                </span>
                                                <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-1000 ${item.allocationPercentage >= 80 ? "bg-rose-500" :
                                                            item.allocationPercentage >= 50 ? "bg-indigo-500" : "bg-emerald-500"
                                                            }`}
                                                        style={{ width: `${item.allocationPercentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5 text-center">
                                            <div className="flex flex-col items-center">
                                                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                                                    <Calendar className="h-3 w-3 text-indigo-400" />
                                                    <span className="text-[10px] text-slate-700 font-black">{item.allocationStartDate}</span>
                                                    <ChevronRight className="h-2.5 w-2.5 text-slate-300" />
                                                    <span className="text-[10px] text-slate-700 font-black">{item.allocationEndDate}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border ${item.allocationStatus === "ACTIVE"
                                                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                : "bg-amber-50 text-amber-600 border-amber-100"
                                                }`}>
                                                {item.allocationStatus}
                                            </span>
                                        </td>
                                        <td className="p-5 text-center">
                                            <div className="inline-flex items-center gap-2 text-[10px] text-slate-500 font-black bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                                                <UserCheck className="h-3.5 w-3.5 text-indigo-500" />
                                                <span>{item.createdBy || "System"}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="py-6 px-6 border-t border-slate-100 bg-slate-50/30">
                            <Pagination
                                currentPage={page}
                                totalPages={totalPages}
                                onPrevious={() => setPage(p => Math.max(1, p - 1))}
                                onNext={() => setPage(p => Math.min(totalPages, p + 1))}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const DemandResourcesTab = ({ demandId, demand, user }) => {
    const [activeSubTab, setActiveSubTab] = useState('resources');

    const subTabs = [
        { id: 'resources', label: 'Resources' },
        { id: 'allocation-modifications', label: 'Allocation Modifications' }
    ];

    return (
        <div className="space-y-6">
            <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
                {subTabs.map((tab) => {
                    const isActive = activeSubTab === tab.id;

                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveSubTab(tab.id)}
                            className={cn(
                                "rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-[0.12em] transition-all sm:px-5",
                                isActive
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                            )}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {activeSubTab === 'resources' && <DemandResourcesTable demandId={demandId} />}
            {activeSubTab === 'allocation-modifications' && (
                <AllocationModificationTab
                    demandId={demandId}
                    demand={demand}
                    user={user}
                />
            )}
        </div>
    );
};

const DemandDetailPage = ({ demandId: propDemandId, onBack: propOnBack }) => {
    const { demandId: urlDemandId } = useParams();
    const demandId = propDemandId || urlDemandId;
    const { state } = useLocation();
    const passedClientName = state?.clientName;
    const navigate = useNavigate();
    const { user } = useAuth();

    const isRM = user?.roles?.includes("RESOURCE-MANAGER");
    const isDM = user?.roles?.includes("DELIVERY-MANAGER");

    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
    const [allocationResults, setAllocationResults] = useState(null);

    useEffect(() => {
        const fetchDetail = async () => {
            setIsLoading(true);
            try {
                const result = await demandService.getDemandById(demandId);
                setData(result);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        if (demandId) fetchDetail();
    }, [demandId]);

    // Loading & Error States
    if (isLoading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
                <span className="text-[10px] font-bold text-slate-400 tracking-[0.3em] animate-pulse italic">Synchronizing data, please wait...</span>
            </div>
        </div>
    );

    if (error || !data) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
            <div className="bg-white p-12 border border-slate-200 rounded-3xl shadow-2xl max-w-lg text-center">
                <div className="h-20 w-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-8 border border-rose-100">
                    <ShieldAlert className="h-10 w-10 text-rose-600" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Record Not Found</h2>
                <p className="text-sm text-slate-500 mb-10 font-medium leading-relaxed">The requested demand record is currently offline or could not be reached. Please try again.</p>
                <Button onClick={propOnBack || (() => navigate('/resource-management/demand'))} className="w-full h-12 bg-slate-900 hover:bg-slate-800 rounded-xl font-bold tracking-wide shadow-xl">Back to Demand Pipeline</Button>
            </div>
        </div>
    );

    const demand = data?.demand || data || {};
    const sla = data?.sla || demand?.sla;
    const project = demand?.project || {};
    const role = demand?.role || {};
    const isApproved = ['APPROVED', 'OPEN', 'ACTIVE', 'FULFILLED'].includes(demand?.demandStatus?.toUpperCase() || demand?.lifecycleState?.toUpperCase());

    const slaId = sla?.demandSlaId || demand?.demandSlaId || demand?.slaId;

    const isSoft =
        !slaId && (
            demand?.demandCommitment?.toUpperCase() === 'SOFT' ||
            demand?.demandStatus?.toUpperCase() === 'SOFT' ||
            demand?.demandStatus?.toUpperCase() === 'REQUESTED' ||
            demand?.lifecycleState?.toUpperCase() === 'SOFT'
        );

    const TABS = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'resource', label: 'Resources', icon: Users },
        { id: 'roleInfo', label: 'Delivery Role Info', icon: Code2 },
        ...(isRM ? [{ id: 'skillGap', label: 'Skill Gap Analysis', icon: GitCompare }] : []),
        { id: 'approvalFlow', label: 'Approval Flow', icon: ShieldCheck },
        ...(!isSoft && slaId ? [{ id: 'slaInsights', label: 'SLA Insights', icon: Clock }] : []),
        ...(isRM && allocationResults ? [{ id: 'allocationResults', label: 'Allocation Results', icon: Activity }] : [])
    ];

    return (
        <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans selection:bg-indigo-100">

            {/* --- TOP HEADER (Responsive & Matched Layout) --- */}
            <header className="bg-white border-b border-slate-100 sticky top-0">
                <div className="max-w-[1500px] mx-auto px-6 py-5">
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">

                        {/* Header Left: Back + Info */}
                        <div className="flex items-center gap-4 sm:gap-6">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={propOnBack || (() => navigate('/resource-management/demand'))}
                                className="h-10 w-10 min-w-[40px] text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-transparent hover:border-slate-200 transition-all"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>

                            <div className="flex items-center gap-3 sm:gap-5">
                                <div className="space-y-1">
                                    <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-none break-words uppercase">
                                        {demand.demandName || "N/A"}
                                    </h1>
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                        <span className="text-[10px] sm:text-[11px] font-black text-indigo-600 tracking-widest">{role.role?.roleName || "N/A"}</span>
                                        <div className="h-1 w-1 rounded-full bg-slate-300 hidden sm:block" />
                                        <span className="text-[10px] sm:text-[11px] font-black text-slate-500 tracking-widest">{passedClientName || demand.clientName || demand.client || "N/A"}</span>
                                        <div className="h-1 w-1 rounded-full bg-slate-300 hidden sm:block" />
                                        <span className="text-[10px] sm:text-[11px] font-black text-slate-400 tracking-widest">{project.primaryLocation || "N/A"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Header Right: Stats & Actions */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 xl:gap-10">
                            {/* Allocation section from reference */}
                            <div className="hidden md:flex flex-col items-end gap-1.5">
                                <div className="flex items-center justify-between w-full min-w-[120px]">
                                    <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Allocation</span>
                                    <span className="text-[10px] font-black text-slate-900 tracking-widest">{demand.allocationPercentage || 0}%</span>
                                </div>
                                <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                    <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${demand.allocationPercentage || 0}%` }} />
                                </div>
                            </div>

                            {/* Status, SLA and CTA from reference with matched order */}
                            <div className="flex flex-wrap items-center gap-4 sm:border-l sm:border-slate-100 sm:pl-6 xl:pl-10 w-full sm:w-auto">
                                <StateBadge state={demand.demandStatus} className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-black text-[10px] sm:text-[11px]" />

                                <div className="flex items-center gap-3 sm:gap-4 p-2.5 bg-slate-50/50 border border-slate-100 rounded-2xl">
                                    <div className="flex flex-col items-end pr-2 border-r border-slate-200 text-right">
                                        <span className="text-[8px] sm:text-[9px] font-black text-slate-400 tracking-tight">SLA Status</span>
                                        <span className={cn("text-[10px] sm:text-xs font-black whitespace-nowrap",
                                            !slaId ? "text-slate-400"
                                                : (sla?.remainingDays || 0) < 0 ? "text-rose-600"
                                                    : (sla?.remainingDays || 0) <= 5 ? "text-orange-600"
                                                        : "text-emerald-600")}>
                                            {!slaId ? "No SLA" : `${sla?.remainingDays || 0} Days`}
                                        </span>
                                    </div>
                                    <div className="relative h-8 w-8 sm:h-10 sm:w-10 border-[3px] border-slate-100 rounded-full flex items-center justify-center bg-white shadow-sm">
                                        {!slaId ? <XCircle className="h-4 w-4 text-slate-300" /> : <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500" />}
                                    </div>
                                </div>

                                {isRM && (
                                    <button
                                        onClick={() => setIsAllocationModalOpen(true)}
                                        className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] sm:text-[11px] font-black tracking-widest rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 border border-indigo-500"
                                    >
                                        <Plus className="h-4 w-4" />
                                        <span className="whitespace-nowrap uppercase">Allocate Resource</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="overflow-x-auto overflow-y-hidden no-scrollbar -mx-6 px-6">
                        <nav className="flex gap-6 sm:gap-10 mt-6 -mb-[1px] min-w-max border-b border-slate-100">
                            {TABS.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={cn(
                                            "group flex items-center gap-2 sm:gap-3 pb-4 text-[10px] sm:text-[11px] font-black transition-all border-b-2 relative tracking-[0.1em] whitespace-nowrap",
                                            isActive
                                                ? "text-indigo-600 border-indigo-600"
                                                : "text-slate-400 border-transparent hover:text-slate-600 hover:border-slate-300"
                                        )}
                                    >
                                        <Icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4 transition-colors", isActive ? "text-indigo-600" : "text-slate-300 group-hover:text-slate-400")} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </div>
            </header>


            {/* --- MAIN CONTENT AREA --- */}
            <main className="flex-1 overflow-y-auto bg-slate-50/80">
                <div className="max-w-[1500px] mx-auto px-6 py-10 font-sans">
                    {activeTab === 'overview' && <OverviewTab demand={demand} project={project} sla={sla} passedClientName={passedClientName} />}
                    {activeTab === 'resource' && (
                        <DemandResourcesTab
                            demandId={demandId}
                            demand={demand}
                            user={user}
                        />
                    )}
                    {activeTab === 'roleInfo' && <RoleInfoTab demand={demand} role={role} />}
                    {isRM && activeTab === 'skillGap' && <SkillGapTab demand={demand} />}
                    {activeTab === 'approvalFlow' && <ApprovalFlowTab demand={demand} />}
                    {activeTab === 'slaInsights' && <SLAInsightsTab sla={sla} />}
                    {!isDM && activeTab === 'allocationResults' && <AllocationResultsTab results={allocationResults} />}
                </div>
            </main>

            <AllocationModal
                isOpen={isAllocationModalOpen}
                onClose={() => setIsAllocationModalOpen(false)}
                demand={demand}
                onSuccess={(results) => {
                    setAllocationResults(results);
                    setActiveTab('allocationResults');
                }}
            />
        </div>
    );
};

export default DemandDetailPage;
