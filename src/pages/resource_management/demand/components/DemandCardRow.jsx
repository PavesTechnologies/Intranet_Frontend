import React from 'react';
import { PriorityBadge, StateBadge, SLABadge, DemandTypeBadge, ScoreBadge } from './FormalBadges';
import { Pencil, Trash2, Target, Briefcase, User, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "../../../../contexts/AuthContext";

/**
 * DemandCardRow: Informative Workforce View
 * Redesigned for maximum clarity and logical information grouping.
 */
const DemandCardRow = ({ demand, onView, onEdit, activeTab }) => {
    const { user } = useAuth();
    const roles = user?.roles || [];
    const isRM = roles.includes("Resource_Manager");
    const isDM = roles.includes("Delivery_Manager");
    const status = demand.lifecycleState?.toUpperCase();
    const isEditDisabled = status === 'REJECTED' || (isDM && status === 'APPROVED');

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
                <div className="col-span-1 flex items-center justify-center gap-4">
                    <button
                        title={status === 'REJECTED' ? 'Cannot Edit Rejected Demand' : (isDM && status === 'APPROVED') ? 'Cannot Edit Approved Demand' : 'Edit'}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onEdit) onEdit(demand);
                        }}
                        disabled={isEditDisabled}
                    >
                        <Pencil className={`h-3.5 w-3.5 ${isEditDisabled ? 'text-gray-400 cursor-not-allowed' : 'text-blue-700 hover:text-blue-800'}`} />
                    </button>
                </div>

            </div>
        </div>
    );
};

export default DemandCardRow;
