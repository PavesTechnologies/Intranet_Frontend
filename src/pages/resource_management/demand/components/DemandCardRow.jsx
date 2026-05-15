import React from 'react';
import { DemandTypeBadge, PriorityBadge, StateBadge, SLABadge } from './FormalBadges';
import { Pencil, Trash2 } from "lucide-react";
import { ProjectsIcon, UserIcon, PendingIcon, CheckIcon, SpinnerIcon, ErrorIcon, SuccessIcon ,EditIcon} from "@/components/icons";
import { cn } from "@/lib/utils";
import {
    canProjectManagerEditDemand,
    canProjectManagerMutateDemand,
    PM_EDITABLE_DEMAND_MESSAGE,
} from '../utils/demandPermissions';

/**
 * DemandCardRow: Informative Workforce View
 * Redesigned for maximum clarity and logical information grouping.
 */
const DM_PENDING_STATUSES = ['REQUESTED', 'DRAFT', 'SOFT', 'PROPOSED', 'PENDING', 'OPEN', 'IN_PROGRESS', 'IN PROGRESS'];
const DM_REJECTABLE_STATUSES = [...DM_PENDING_STATUSES, 'APPROVED'];

const normalizeRole = (role = "") =>
    String(role)
        .toUpperCase()
        .replace(/^ROLE[-_]/, "")
        .replace(/[^A-Z0-9]/g, "");

const getDemandCommitment = (demand = {}) =>
    String(
        demand.demandCommitment ||
        demand.commitment ||
        demand.demand_commitment ||
        ""
    ).toUpperCase();

const getDemandType = (demand = {}) =>
    demand.demandType ||
    demand.type ||
    demand.demand_type ||
    demand.type_of_demand ||
    "";

const DemandCardRow = ({ demand, onView, onEdit, onDelete, onApprove, onReject, onFulfill, onRMReject, decisionState, activeTab, viewerRole }) => {
    const status = String(demand.lifecycleState || demand.demandStatus || '').toUpperCase();
    const demandCommitment = getDemandCommitment(demand);
    const normalizedViewerRole = normalizeRole(viewerRole);
    const isDMView = normalizedViewerRole === "DELIVERYMANAGER";
    const isRMView = normalizedViewerRole === "RESOURCEMANAGER";
    const isPMView = normalizedViewerRole === "PROJECTMANAGER" || normalizedViewerRole === "MANAGER";
    const canQuickDecision = isDMView && DM_PENDING_STATUSES.includes(status);
    const canDMRejectDemand = isDMView && DM_REJECTABLE_STATUSES.includes(status);
    const canRMCloseDemand = isRMView && status === 'APPROVED';
    const canPMEditDemand = isPMView && canProjectManagerEditDemand(demand);
    const canPMDeleteRequestedDemand = isPMView && canProjectManagerMutateDemand(demand);
    const isFulfilled = status === 'FULFILLED';
    const isRejected = status === 'REJECTED';
    const isEditDisabled = isFulfilled || isRejected || (isDMView && status === 'APPROVED') || (isPMView && !canPMEditDemand);
    const isApproving = decisionState?.demandId === demand.id && decisionState?.action === "approve";
    const isRejecting = decisionState?.demandId === demand.id && decisionState?.action === "reject";
    const isFulfilling = decisionState?.demandId === demand.id && decisionState?.action === "fulfill";

    return (
        <div
            className="group flex items-center bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
            onClick={() => onView(demand)}
        >
            <div className="flex-1 py-1.5 grid grid-cols-12 items-center gap-4 px-5">

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
                                <ProjectsIcon className="h-3 w-3 text-slate-400" />
                                <span className="text-[11px] font-semibold text-slate-500 truncate">{demand.client}</span>
                            </div>
                            <div className="h-2.5 w-[1px] bg-slate-200" />
                            <div className="flex items-center gap-1 min-w-0">
                                <UserIcon className="h-3 w-3 text-slate-400" />
                                <span className="text-[11px] text-slate-400 truncate">{demand.role}</span>
                            </div>
                            <DemandTypeBadge type={getDemandType(demand)} />
                        </div>
                    </div>
                </div>

                {/* 2. Priority Score */}
                <div className="col-span-1 flex justify-center">
                    <div className="text-center">
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
                <div className="col-span-3 flex justify-center">
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
                                    demandCommitment === 'SOFT' ||
                                    demand.lifecycleState?.toUpperCase() === 'SOFT'
                                )
                            }
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-0.5 px-2 py-0.5 rounded-lg border min-w-[80px] bg-slate-50 border-slate-100 text-slate-400">
                            <div className="flex items-center gap-1">
                                <PendingIcon className="h-2 w-2 opacity-40" />
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
                <div className="col-span-2 flex items-center justify-center">
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
                                {isApproving ? <SpinnerIcon className="h-3.5 w-3.5 animate-spin" /> : <CheckIcon className="h-[15px] w-[15px] stroke-[2.4]" />}
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
                                {isRejecting ? <SpinnerIcon className="h-3.5 w-3.5 animate-spin" /> : <ErrorIcon className="h-[14px] w-[14px] stroke-[2.4]" />}
                            </button>
                        </div>
                    ) : canDMRejectDemand ? (
                        <button
                            title="Reject approved demand"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onReject) onReject(demand);
                            }}
                            disabled={isRejecting}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 bg-rose-50/70 text-rose-600 shadow-[0_5px_14px_rgba(244,63,94,0.10)] transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isRejecting ? <SpinnerIcon className="h-3.5 w-3.5 animate-spin" /> : <ErrorIcon className="h-[14px] w-[14px] stroke-[2.4]" />}
                        </button>
                    ) : canRMCloseDemand ? (
                        <div className="flex items-center gap-2">
                            <button
                                title="Reject demand"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onRMReject) onRMReject(demand);
                                }}
                                disabled={isFulfilling || isRejecting}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-700 shadow-[0_5px_14px_rgba(244,63,94,0.12)] transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isRejecting ? <SpinnerIcon className="h-3.5 w-3.5 animate-spin" /> : <ErrorIcon className="h-[14px] w-[14px] stroke-[2.4]" />}
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-2">
                            <button
                                title={
                                    isFulfilled
                                        ? 'Cannot edit fulfilled demand'
                                        : isRejected
                                            ? 'Cannot edit rejected demand'
                                            : (isDMView && status === 'APPROVED')
                                                ? 'Cannot edit approved demand'
                                                : (isPMView && !canPMEditDemand)
                                                    ? PM_EDITABLE_DEMAND_MESSAGE
                                                    : 'Edit demand'
                                }
                                onClick={(e) => {
                                     e.stopPropagation();
                                     if (onEdit) onEdit(demand);
                                }}
                                disabled={isEditDisabled}
                                className={cn(
                                    "inline-flex items-center gap-1.5 transition-all active:scale-95",
                                    isEditDisabled
                                        ? "cursor-not-allowed text-slate-300"
                                        : "text-blue-600 hover:text-blue-700"
                                )}
                            >
                                <EditIcon size={16} />
                            </button>
                            {canPMDeleteRequestedDemand && (
                                <button
                                    title="Delete requested demand"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onDelete) onDelete(demand);
                                    }}
                                    className="inline-flex h-8 w-8 items-center justify-center text-rose-600 transition-all hover:text-rose-700 active:scale-90"
                                >
                                    <DeleteIcon size={16} />
                                </button>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default DemandCardRow;
