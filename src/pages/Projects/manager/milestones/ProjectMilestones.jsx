// src/pages/Projects/manager/milestones/ProjectMilestones.jsx
import React, { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Filter,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Receipt,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  Layers,
  Calendar,
  RotateCcw,
  Sparkles,
  ArrowUpDown,
  Building2,
  Tag,
} from "lucide-react";
import Button from "../../../../components/Button/Button";
import {
  INITIAL_MILESTONES,
  DEFAULT_PROJECT_INFO,
  computeMilestoneKPIs,
  formatINR,
} from "./mockMilestoneData";
import {
  DeliveryStatusBadge,
  ApprovalStatusBadge,
  BillingReadinessBadge,
} from "./MilestoneStatusBadges";
import CreateMilestoneModal from "./CreateMilestoneModal";
import MilestoneDetailsModal from "./MilestoneDetailsModal";
import WorkflowActionModal from "./WorkflowActionModal";
import ArBillingReadinessPanel from "./ArBillingReadinessPanel";
import { showStatusToast } from "../../../../components/toastfy/toast";

const FILTER_TABS = [
  { id: "ALL", label: "All Milestones" },
  { id: "PLANNED", label: "Planned" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "COMPLETED", label: "Completed" },
  { id: "AWAITING_PM_APPROVAL", label: "Awaiting PM Approval" },
  { id: "AWAITING_CLIENT_ACCEPTANCE", label: "Awaiting Client Acceptance" },
  { id: "BILLABLE", label: "Billable" },
  { id: "INVOICED", label: "Invoiced" },
];

export default function ProjectMilestones({
  projectId = 101,
  projectName = "Enterprise Digital Core Transformation",
}) {
  const [milestones, setMilestones] = useState(() => {
    try {
      const saved = localStorage.getItem(`pms_milestones_preview_${projectId}`);
      return saved ? JSON.parse(saved) : INITIAL_MILESTONES;
    } catch {
      return INITIAL_MILESTONES;
    }
  });

  const projectInfo = useMemo(() => {
    return {
      ...DEFAULT_PROJECT_INFO,
      name: projectName || DEFAULT_PROJECT_INFO.name,
      id: projectId || DEFAULT_PROJECT_INFO.id,
    };
  }, [projectId, projectName]);

  const [activeFilter, setActiveFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("sequence_asc");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [selectedMilestone, setSelectedMilestone] = useState(null);

  const [workflowModalState, setWorkflowModalState] = useState({
    isOpen: false,
    milestone: null,
    actionType: null,
  });

  // Persist state updates to local storage for realistic preview continuity
  const updateMilestonesState = (nextMilestones) => {
    setMilestones(nextMilestones);
    try {
      localStorage.setItem(
        `pms_milestones_preview_${projectId}`,
        JSON.stringify(nextMilestones)
      );
    } catch (e) {
      console.warn("Unable to persist milestones preview state", e);
    }
  };

  const handleResetDemoData = () => {
    updateMilestonesState(INITIAL_MILESTONES);
    showStatusToast("Reset demo milestones to default contract preview", "info");
  };

  // KPIs
  const kpis = useMemo(() => {
    return computeMilestoneKPIs(milestones, projectInfo.projectBudget);
  }, [milestones, projectInfo.projectBudget]);

  // Filtered & Sorted Milestones
  const filteredMilestones = useMemo(() => {
    let result = [...milestones];

    // Filter by tab
    if (activeFilter === "PLANNED") {
      result = result.filter((m) => m.deliveryStatus === "PLANNED");
    } else if (activeFilter === "IN_PROGRESS") {
      result = result.filter((m) => m.deliveryStatus === "IN_PROGRESS");
    } else if (activeFilter === "COMPLETED") {
      result = result.filter((m) => m.deliveryStatus === "COMPLETED");
    } else if (activeFilter === "AWAITING_PM_APPROVAL") {
      result = result.filter((m) => m.approvalStatus === "AWAITING_PM_APPROVAL");
    } else if (activeFilter === "AWAITING_CLIENT_ACCEPTANCE") {
      result = result.filter((m) => m.approvalStatus === "AWAITING_CLIENT_ACCEPTANCE");
    } else if (activeFilter === "BILLABLE") {
      result = result.filter((m) => m.billingReadiness === "ELIGIBLE");
    } else if (activeFilter === "INVOICED") {
      result = result.filter((m) => m.billingReadiness === "INVOICED");
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(term) ||
          m.code.toLowerCase().includes(term) ||
          (m.epicName && m.epicName.toLowerCase().includes(term)) ||
          (m.deliverables && m.deliverables.toLowerCase().includes(term))
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "sequence_asc") return a.sequence - b.sequence;
      if (sortBy === "sequence_desc") return b.sequence - a.sequence;
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      if (sortBy === "date_asc")
        return (a.plannedCompletionDate || "").localeCompare(b.plannedCompletionDate || "");
      if (sortBy === "amount_desc") return b.billingAmount - a.billingAmount;
      return 0;
    });

    return result;
  }, [milestones, activeFilter, searchTerm, sortBy]);

  // Handler: Save Milestone (Create or Edit)
  const handleSaveMilestone = (payload) => {
    if (editingMilestone) {
      const updated = milestones.map((m) => {
        if (m.id === editingMilestone.id) {
          const now = new Date().toISOString().replace("T", " ").slice(0, 16);
          return {
            ...m,
            ...payload,
            updatedAt: new Date().toISOString(),
            history: [
              {
                date: now,
                action: "Milestone Edited",
                actor: "Project Manager",
                notes: "Updated milestone scope & allocation terms",
              },
              ...(m.history || []),
            ],
          };
        }
        return m;
      });
      updateMilestonesState(updated);
      showStatusToast(`Milestone "${payload.name}" updated successfully`, "success");
      setEditingMilestone(null);
    } else {
      const now = new Date().toISOString().replace("T", " ").slice(0, 16);
      const newMilestone = {
        ...payload,
        id: `ms-${Date.now()}`,
        deliveryStatus: "PLANNED",
        approvalStatus: "NOT_SUBMITTED",
        billingReadiness: "NOT_ELIGIBLE",
        invoiceNumber: null,
        invoicedDate: null,
        rejectionReason: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        history: [
          {
            date: now,
            action: "Milestone Created",
            actor: "Project Manager",
            notes: `Planned with ${payload.billingPercentage}% allocation (${formatINR(payload.billingAmount)})`,
          },
        ],
      };
      const nextList = [...milestones, newMilestone];
      updateMilestonesState(nextList);
      showStatusToast(`Milestone "${payload.name}" created`, "success");
    }
  };

  // Handler: Delete Milestone
  const handleDeleteMilestone = (milestoneId) => {
    const target = milestones.find((m) => m.id === milestoneId);
    if (!target) return;
    if (target.billingReadiness === "INVOICED") {
      showStatusToast("Cannot delete an invoiced milestone.", "error");
      return;
    }
    const confirmed = window.confirm(
      `Delete milestone "${target.name}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    const remaining = milestones.filter((m) => m.id !== milestoneId);
    updateMilestonesState(remaining);
    showStatusToast(`Milestone "${target.name}" removed`, "success");
    if (selectedMilestone?.id === milestoneId) {
      setSelectedMilestone(null);
    }
  };

  // Handler: Trigger Workflow State Transition Modal
  const openWorkflowModal = (milestone, actionType) => {
    setWorkflowModalState({
      isOpen: true,
      milestone,
      actionType,
    });
  };

  // Handler: Execute State Transition
  const handleExecuteWorkflow = ({ actionType, notes, actualDate, signerName, rejectionReason }) => {
    const target = workflowModalState.milestone;
    if (!target) return;

    const now = new Date().toISOString().replace("T", " ").slice(0, 16);
    let patch = {};
    let historyEntry = null;

    switch (actionType) {
      case "START":
        patch = {
          deliveryStatus: "IN_PROGRESS",
          approvalStatus: "NOT_SUBMITTED",
          billingReadiness: "NOT_ELIGIBLE",
        };
        historyEntry = {
          date: now,
          action: "Work Started",
          actor: "Engineering Team",
          notes: notes || "Work execution commenced",
        };
        break;

      case "COMPLETE":
        patch = {
          deliveryStatus: "COMPLETED",
          actualCompletionDate: actualDate,
          approvalStatus: "AWAITING_PM_APPROVAL",
          billingReadiness: "AWAITING_APPROVAL",
        };
        historyEntry = {
          date: now,
          action: "Marked Completed",
          actor: "Delivery Team",
          notes: notes || `Deliverables submitted on ${actualDate}. Awaiting PM sign-off.`,
        };
        break;

      case "PM_APPROVE":
        const nextApproval = target.clientAcceptanceRequired
          ? "AWAITING_CLIENT_ACCEPTANCE"
          : "PM_APPROVED";
        const nextReadiness = target.clientAcceptanceRequired
          ? "AWAITING_APPROVAL"
          : "ELIGIBLE";
        patch = {
          approvalStatus: nextApproval,
          billingReadiness: nextReadiness,
          rejectionReason: null,
        };
        historyEntry = {
          date: now,
          action: "PM Approved",
          actor: "Rohit L. (Project Manager)",
          notes: notes || (target.clientAcceptanceRequired
            ? "PM approval completed. Submitted for Client Acceptance sign-off."
            : "PM approved. Eligible for AR Billing."),
        };
        break;

      case "PM_REJECT":
        patch = {
          approvalStatus: "REJECTED",
          billingReadiness: "NOT_ELIGIBLE",
          rejectionReason: rejectionReason,
        };
        historyEntry = {
          date: now,
          action: "Rejected by PM",
          actor: "Rohit L. (Project Manager)",
          notes: `Rejection reason: ${rejectionReason}`,
        };
        break;

      case "CLIENT_ACCEPT":
        patch = {
          approvalStatus: "CLIENT_ACCEPTED",
          billingReadiness: "ELIGIBLE",
        };
        historyEntry = {
          date: now,
          action: "Client Accepted",
          actor: signerName || "Client Signatory",
          notes: notes || "Formal client acceptance certificate recorded. Ready for AR Ingestion.",
        };
        break;

      case "MARK_BILLABLE":
        patch = {
          billingReadiness: "ELIGIBLE",
        };
        historyEntry = {
          date: now,
          action: "Marked Ready for AR Billing",
          actor: "PMS-AR Bridge",
          notes: notes || "Authorized for AR billing snapshot generation",
        };
        break;

      case "SIMULATE_INVOICE":
        const mockInvNum = `INV-2026-00${Math.floor(10 + Math.random() * 90)}`;
        patch = {
          billingReadiness: "INVOICED",
          invoiceNumber: mockInvNum,
          invoicedDate: new Date().toISOString().slice(0, 10),
        };
        historyEntry = {
          date: now,
          action: "Invoiced in AR",
          actor: "AR Billing Engine",
          notes: `Simulated invoice generation: #${mockInvNum} (${formatINR(target.billingAmount)})`,
        };
        break;

      default:
        break;
    }

    const updated = milestones.map((m) => {
      if (m.id === target.id) {
        return {
          ...m,
          ...patch,
          updatedAt: new Date().toISOString(),
          history: historyEntry ? [historyEntry, ...(m.history || [])] : m.history,
        };
      }
      return m;
    });

    updateMilestonesState(updated);
    showStatusToast(`Milestone ${target.code} transition applied`, "success");

    // Also update detail modal if open
    if (selectedMilestone?.id === target.id) {
      setSelectedMilestone((prev) => ({
        ...prev,
        ...patch,
        history: historyEntry ? [historyEntry, ...(prev.history || [])] : prev.history,
      }));
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* ── 1. Page Header ────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                PMS Core
              </span>
              <span>/</span>
              <span>Project ID: #{projectInfo.id}</span>
              <span>/</span>
              <span className="font-mono font-bold text-slate-700">Key: {projectInfo.projectKey}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Project Milestones
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 pt-0.5">
              <div className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                <span>Client: </span>
                <strong className="text-slate-800">{projectInfo.clientName}</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-slate-400" />
                <span>Project: </span>
                <strong className="text-slate-800">{projectInfo.name}</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                <span>Contract Budget: </span>
                <strong className="text-indigo-700">
                  {formatINR(projectInfo.projectBudget)} {projectInfo.projectBudgetCurrency}
                </strong>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDemoData}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
              title="Reset demo data to default contract allocation"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
              <span>Reset Demo</span>
            </button>
            <Button
              variant="primary"
              onClick={() => {
                setEditingMilestone(null);
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Create Milestone</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── 2. KPI Summary Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {/* Total Milestones */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Milestones
            </span>
            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
              <Layers className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">{kpis.total}</span>
            <span className="ml-2 text-xs text-slate-400 font-medium">scheduled</span>
          </div>
        </div>

        {/* In Progress */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              In Progress
            </span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-blue-600">{kpis.inProgress}</span>
            <span className="ml-2 text-xs text-slate-400 font-medium">active delivery</span>
          </div>
        </div>

        {/* Awaiting Approval */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Awaiting Approval
            </span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <AlertCircle className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-amber-600">{kpis.awaitingApproval}</span>
            <span className="ml-2 text-xs text-slate-400 font-medium">pending sign-off</span>
          </div>
        </div>

        {/* Billable Milestones */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Billable Milestones
            </span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <DollarSign className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-indigo-600">{kpis.billable}</span>
            <span className="ml-2 text-xs text-slate-400 font-medium">ready for AR</span>
          </div>
        </div>

        {/* Total Allocated Value */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Allocated Value
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Receipt className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold text-emerald-700">
              {formatINR(kpis.totalAllocatedValue)}
            </span>
            <div className="flex items-center justify-between mt-1 text-[11px]">
              <span className={kpis.isPercentageFullyAllocated ? "text-emerald-700 font-semibold" : "text-amber-600 font-semibold"}>
                {kpis.totalAllocatedPercentage}% allocated
              </span>
              <span className="text-slate-400">
                of {formatINR(projectInfo.projectBudget)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Filters, Search & Table ─────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden space-y-4 p-5">
        {/* Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTER_TABS.map((tab) => {
              const isActive = activeFilter === tab.id;
              let count = null;
              if (tab.id === "ALL") count = milestones.length;
              if (tab.id === "PLANNED") count = milestones.filter((m) => m.deliveryStatus === "PLANNED").length;
              if (tab.id === "IN_PROGRESS") count = kpis.inProgress;
              if (tab.id === "COMPLETED") count = milestones.filter((m) => m.deliveryStatus === "COMPLETED").length;
              if (tab.id === "AWAITING_PM_APPROVAL") count = milestones.filter((m) => m.approvalStatus === "AWAITING_PM_APPROVAL").length;
              if (tab.id === "AWAITING_CLIENT_ACCEPTANCE") count = milestones.filter((m) => m.approvalStatus === "AWAITING_CLIENT_ACCEPTANCE").length;
              if (tab.id === "BILLABLE") count = kpis.billable;
              if (tab.id === "INVOICED") count = kpis.invoiced;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-200/70 text-slate-700"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Sort Controls */}
          <div className="flex items-center gap-2">
            <div className="relative w-48 sm:w-60">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search milestones or epics..."
                className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white py-1.5 px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:border-indigo-500"
            >
              <option value="sequence_asc">Sequence (1 to N)</option>
              <option value="sequence_desc">Sequence (N to 1)</option>
              <option value="name_asc">Milestone Name</option>
              <option value="date_asc">Planned Date</option>
              <option value="amount_desc">Highest Billing Amount</option>
            </select>
          </div>
        </div>

        {/* Milestone List Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3 w-12 text-center">Seq</th>
                <th className="py-3 px-3">Milestone Code & Name</th>
                <th className="py-3 px-3">Related Epic</th>
                <th className="py-3 px-3">Schedule (Plan / Actual)</th>
                <th className="py-3 px-3 text-right">Billing Allocation</th>
                <th className="py-3 px-3 text-center">Delivery Status</th>
                <th className="py-3 px-3 text-center">Approval State</th>
                <th className="py-3 px-3 text-center">AR Readiness</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredMilestones.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 space-y-2">
                    <p className="text-sm">No milestones matching the selected filter.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveFilter("ALL");
                        setSearchTerm("");
                      }}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      Clear filters
                    </button>
                  </td>
                </tr>
              ) : (
                filteredMilestones.map((m) => {
                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => setSelectedMilestone(m)}
                    >
                      {/* Seq */}
                      <td className="py-3 px-3 text-center font-bold text-slate-500">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-700 mx-auto">
                          {m.sequence}
                        </span>
                      </td>

                      {/* Code & Name */}
                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {m.code}
                          </span>
                          <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {m.name}
                          </div>
                          <div className="text-[11px] text-slate-400 line-clamp-1 max-w-xs" title={m.deliverables}>
                            Criteria: {m.deliverables}
                          </div>
                        </div>
                      </td>

                      {/* Related Epic */}
                      <td className="py-3 px-3">
                        {m.epicName ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-100/70 px-2 py-1 rounded max-w-[180px] truncate" title={m.epicName}>
                            <Layers className="h-3 w-3 text-indigo-500 shrink-0" />
                            <span className="truncate">{m.epicName}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">—</span>
                        )}
                      </td>

                      {/* Schedule */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="text-[11px] space-y-0.5">
                          <div>
                            <span className="text-slate-400">Target: </span>
                            <span className="font-semibold text-slate-700">{m.plannedCompletionDate}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Actual: </span>
                            {m.actualCompletionDate ? (
                              <span className="font-semibold text-emerald-700">{m.actualCompletionDate}</span>
                            ) : (
                              <span className="text-slate-400 italic">Pending</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Billing Allocation */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          {formatINR(m.billingAmount)}
                        </div>
                        <div className="text-[11px] text-indigo-600 font-semibold">
                          {m.billingPercentage}% of contract
                        </div>
                      </td>

                      {/* Delivery Status */}
                      <td className="py-3 px-3 text-center">
                        <DeliveryStatusBadge status={m.deliveryStatus} />
                      </td>

                      {/* Approval State */}
                      <td className="py-3 px-3 text-center">
                        <ApprovalStatusBadge status={m.approvalStatus} />
                      </td>

                      {/* AR Readiness */}
                      <td className="py-3 px-3 text-center">
                        <BillingReadinessBadge status={m.billingReadiness} />
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3 px-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          {/* Contextual workflow button */}
                          {m.deliveryStatus === "PLANNED" && (
                            <button
                              type="button"
                              onClick={() => openWorkflowModal(m, "START")}
                              className="rounded bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
                              title="Start milestone"
                            >
                              Start
                            </button>
                          )}
                          {m.deliveryStatus === "IN_PROGRESS" && (
                            <button
                              type="button"
                              onClick={() => openWorkflowModal(m, "COMPLETE")}
                              className="rounded bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                              title="Mark milestone completed"
                            >
                              Complete
                            </button>
                          )}
                          {m.deliveryStatus === "COMPLETED" && m.approvalStatus === "AWAITING_PM_APPROVAL" && (
                            <button
                              type="button"
                              onClick={() => openWorkflowModal(m, "PM_APPROVE")}
                              className="rounded bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
                              title="Approve as Project Manager"
                            >
                              PM Approve
                            </button>
                          )}
                          {m.approvalStatus === "PM_APPROVED" && m.clientAcceptanceRequired && (
                            <button
                              type="button"
                              onClick={() => openWorkflowModal(m, "CLIENT_ACCEPT")}
                              className="rounded bg-purple-50 px-2 py-1 text-[11px] font-semibold text-purple-700 hover:bg-purple-100"
                              title="Log client acceptance"
                            >
                              Acceptance
                            </button>
                          )}
                          {m.billingReadiness === "ELIGIBLE" && (
                            <button
                              type="button"
                              onClick={() => openWorkflowModal(m, "SIMULATE_INVOICE")}
                              className="rounded bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                              title="Simulate AR Invoice"
                            >
                              Simulate Inv
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedMilestone(m)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMilestone(m);
                              setIsCreateModalOpen(true);
                            }}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            title="Edit milestone"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMilestone(m.id)}
                            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            title="Delete milestone"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 4. AR Billing Readiness Panel ──────────────────────────────── */}
      <ArBillingReadinessPanel
        milestones={milestones}
        projectId={projectInfo.id}
        projectName={projectInfo.name}
        onSelectMilestone={(m) => setSelectedMilestone(m)}
        onTriggerInvoiceSimulation={(m) => openWorkflowModal(m, "SIMULATE_INVOICE")}
      />

      {/* ── 5. Modals ──────────────────────────────────────────────────── */}
      {/* Create / Edit Milestone Modal */}
      <CreateMilestoneModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingMilestone(null);
        }}
        onSave={handleSaveMilestone}
        milestoneToEdit={editingMilestone}
        totalProjectBudget={projectInfo.projectBudget}
        currency={projectInfo.projectBudgetCurrency}
        projectName={projectInfo.name}
        existingMilestones={milestones}
      />

      {/* Milestone Details Drawer / Modal */}
      <MilestoneDetailsModal
        isOpen={Boolean(selectedMilestone)}
        onClose={() => setSelectedMilestone(null)}
        milestone={selectedMilestone}
        onEdit={(m) => {
          setSelectedMilestone(null);
          setEditingMilestone(m);
          setIsCreateModalOpen(true);
        }}
        onTriggerWorkflow={(m, action) => openWorkflowModal(m, action)}
        projectName={projectInfo.name}
      />

      {/* Workflow Action Confirmation Modal */}
      <WorkflowActionModal
        isOpen={workflowModalState.isOpen}
        onClose={() =>
          setWorkflowModalState({ isOpen: false, milestone: null, actionType: null })
        }
        milestone={workflowModalState.milestone}
        actionType={workflowModalState.actionType}
        onConfirm={handleExecuteWorkflow}
      />
    </div>
  );
}
