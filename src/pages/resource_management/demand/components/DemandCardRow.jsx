import React from 'react';
import { PriorityBadge, StateBadge, SLABadge } from './FormalBadges';
import { Pencil, Briefcase, User, Clock, Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * DemandCardRow: Informative Workforce View
 * Redesigned for maximum clarity and logical information grouping.
 */
const DM_PENDING_STATUSES = ['REQUESTED', 'DRAFT', 'SOFT', 'PROPOSED', 'PENDING', 'OPEN', 'IN_PROGRESS', 'IN PROGRESS'];

const DemandCardRow = ({ demand, onView, onEdit, onApprove, onReject, decisionState, activeTab, viewerRole }) => {
    const status = String(demand.lifecycleState || '').toUpperCase();
    const normalizedViewerRole = String(viewerRole || '').toUpperCase();
    const isDMView = normalizedViewerRole === "DELIVERY-MANAGER";
    const canQuickDecision = isDMView && DM_PENDING_STATUSES.includes(status);
    const isEditDisabled = status === 'REJECTED' || (isDMView && status === 'APPROVED');
    const isApproving = decisionState?.demandId === demand.id && decisionState?.action === "approve";
    const isRejecting = decisionState?.demandId === demand.id && decisionState?.action === "reject";

    return (
        <div
            className="group flex items-center bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
            onClick={() => onView(demand)}
        >
            <div className="flex-1 py-1.5 grid grid-cols-10 items-center gap-4 px-5">

                {/* 1. Demand Specifications & Context (Expanded) */}
                <div className="col-span-3 flex items-center gap-4 min-w-0">
                    <div className="min-w-0 flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                            <h3 className="text-[13px] font-bold text-slate-900 truncate tracking-tight group-hover:text-indigo-600 transition-colors">
                                {demand.projectName}
                            </h3>
                            <div className="px-1.5 py-0.5 bg-slate-100 rounded text-[8px] font-black text-slate-500 tracking-tighter">
                                ID: {demand.id?.split('-')[0]}
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <div className="flex items-center gap-1 min-w-0">
                                <Briefcase className="h-3 w-3 text-slate-400" />
                                <span className="text-[11px] font-semibold text-slate-500 truncate">{demand.client}</span>
                            </div>
                            <div className="h-2.5 w-[1px] bg-slate-200" />
                            <div className="flex items-center gap-1 min-w-0">
                                <User className="h-3 w-3 text-slate-400" />
                                <span className="text-[11px] text-slate-400 truncate">{demand.role}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Priority Score */}
                <div className="col-span-1 flex justify-start">
                    <div className="text-left">
                        <span className="text-base font-black text-slate-900 tracking-tighter leading-none">
                            {demand.priorityScore || 0}
                        </span>
                        <div className="text-[8px] font-bold text-slate-400 tracking-widest mt-0.5 uppercase">Score</div>
                    </div>
                </div>

                {/* 3. Governance Priority */}
                <div className="col-span-1 flex justify-center">
                    <PriorityBadge priority={demand.priority} />
                </div>

                {/* 4. SLA Compliance or Rejection Reason */}
                <div className="col-span-2 flex justify-center">
                    {activeTab === 'rejected' ? (
                        <div className="flex flex-col items-center gap-1 w-full px-2 overflow-hidden">
                            {(demand.rmRejectionReason || demand.dmRejectionReason || demand.rejectionReason) ? (
                                <>
                                    <span
                                        className="text-[10px] font-bold text-rose-600 truncate max-w-full italic"
                                        title={demand.rmRejectionReason || demand.dmRejectionReason || demand.rejectionReason}
                                    >
                                        "{demand.rmRejectionReason || demand.dmRejectionReason || demand.rejectionReason}"
                                    </span>
                                    <span className="text-[8px] font-black text-slate-400 tracking-widest uppercase">
                                        {demand.rmRejectionReason ? 'RM Reason' : demand.dmRejectionReason ? 'DM Reason' : 'Reason'}
                                    </span>
                                </>
                            ) : (
                                <span className="text-[10px] text-slate-400 italic font-bold">No reason specified</span>
                            )}
                        </div>
                    ) : (demand.demandSlaId || demand.slaId) ? (
                        <SLABadge
                            days={demand.slaDays}
                            isSoft={
                                !demand.demandSlaId && (
                                    activeTab === 'soft' ||
                                    ['SOFT', 'REQUESTED', 'DRAFT', 'PROPOSED'].includes(demand.demandCommitment?.toUpperCase()) ||
                                    ['SOFT', 'REQUESTED', 'DRAFT', 'PROPOSED'].includes(demand.lifecycleState?.toUpperCase())
                                )
                            }
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-0.5 px-2 py-0.5 rounded-lg border min-w-[80px] bg-slate-50 border-slate-100 text-slate-400">
                            <div className="flex items-center gap-1">
                                <Clock className="h-2 w-2 opacity-40" />
                                <span className="text-[8px] font-black tracking-widest uppercase">SLA</span>
                            </div>
                            <span className="text-[11px] font-black">No SLA</span>
                        </div>
                    )}
                </div>

                {/* 5. Status */}
                <div className="col-span-2 flex justify-center">
                    <StateBadge state={demand.lifecycleState} />
                </div>

                {/* 6. Actions */}
                <div className="col-span-1 flex items-center justify-center">
                    {canQuickDecision ? (
                        <div className="flex items-center gap-2.5">
                            <button
                                title="Approve demand"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onApprove) onApprove(demand);
                                }}
                                disabled={isApproving || isRejecting}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50/70 text-emerald-600 shadow-[0_5px_14px_rgba(16,185,129,0.10)] transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isApproving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-[15px] w-[15px] stroke-[2.4]" />}
                            </button>
                            <button
                                title="Reject demand"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onReject) onReject(demand);
                                }}
                                disabled={isApproving || isRejecting}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 bg-rose-50/70 text-rose-600 shadow-[0_5px_14px_rgba(244,63,94,0.10)] transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isRejecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-[14px] w-[14px] stroke-[2.4]" />}
                            </button>
                        </div>
                    ) : (
                        <button
                            title={status === 'REJECTED' ? 'Cannot Edit Rejected Demand' : (isDMView && status === 'APPROVED') ? 'Cannot Edit Approved Demand' : 'Edit'}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onEdit) onEdit(demand);
                            }}
                            disabled={isEditDisabled}
                            className={cn(
                                "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-bold transition",
                                isEditDisabled
                                    ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                            )}
                        >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
};

export default DemandCardRow;
