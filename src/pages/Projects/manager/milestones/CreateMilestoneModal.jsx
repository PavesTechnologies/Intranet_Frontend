// src/pages/Projects/manager/milestones/CreateMilestoneModal.jsx
import React, { useState, useEffect } from "react";
import { X, Calendar, AlertCircle, Info, DollarSign, Layers } from "lucide-react";
import Button from "../../../../components/Button/Button";
import { formatINR, MOCK_PROJECT_EPICS } from "./mockMilestoneData";

export default function CreateMilestoneModal({
  isOpen,
  onClose,
  onSave,
  milestoneToEdit = null,
  totalProjectBudget = 1000000,
  currency = "INR",
  projectName = "Enterprise Digital Core Transformation",
  existingMilestones = [],
}) {
  const isEditing = Boolean(milestoneToEdit);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    sequence: 1,
    epicId: "",
    description: "",
    deliverables: "",
    plannedStartDate: "",
    plannedCompletionDate: "",
    actualCompletionDate: "",
    allocationType: "PERCENTAGE", // "PERCENTAGE" | "FIXED_AMOUNT"
    billingPercentage: "",
    billingAmount: "",
    clientAcceptanceRequired: true,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (milestoneToEdit) {
      setFormData({
        name: milestoneToEdit.name || "",
        code: milestoneToEdit.code || "",
        sequence: milestoneToEdit.sequence || 1,
        epicId: milestoneToEdit.epicId || "",
        description: milestoneToEdit.description || "",
        deliverables: milestoneToEdit.deliverables || "",
        plannedStartDate: milestoneToEdit.plannedStartDate || "",
        plannedCompletionDate: milestoneToEdit.plannedCompletionDate || "",
        actualCompletionDate: milestoneToEdit.actualCompletionDate || "",
        allocationType: milestoneToEdit.allocationType || "PERCENTAGE",
        billingPercentage: milestoneToEdit.billingPercentage ?? "",
        billingAmount: milestoneToEdit.billingAmount ?? "",
        clientAcceptanceRequired: milestoneToEdit.clientAcceptanceRequired !== false,
      });
    } else {
      const nextSeq = existingMilestones.length + 1;
      const nextCode = `MS-00${nextSeq}`;
      setFormData({
        name: "",
        code: nextCode,
        sequence: nextSeq,
        epicId: "",
        description: "",
        deliverables: "",
        plannedStartDate: "",
        plannedCompletionDate: "",
        actualCompletionDate: "",
        allocationType: "PERCENTAGE",
        billingPercentage: "",
        billingAmount: "",
        clientAcceptanceRequired: true,
      });
    }
    setErrors({});
  }, [milestoneToEdit, isOpen, existingMilestones.length]);

  if (!isOpen) return null;

  const handleAllocationTypeChange = (newType) => {
    setFormData((prev) => {
      if (newType === "PERCENTAGE") {
        const amt = Number(prev.billingAmount) || 0;
        const pct = totalProjectBudget > 0 ? (amt / totalProjectBudget) * 100 : "";
        return {
          ...prev,
          allocationType: "PERCENTAGE",
          billingPercentage: pct ? Math.round(pct * 100) / 100 : prev.billingPercentage,
        };
      } else {
        const pct = Number(prev.billingPercentage) || 0;
        const amt = totalProjectBudget > 0 ? (pct / 100) * totalProjectBudget : "";
        return {
          ...prev,
          allocationType: "FIXED_AMOUNT",
          billingAmount: amt ? Math.round(amt) : prev.billingAmount,
        };
      }
    });
  };

  const handlePercentageChange = (val) => {
    const num = val === "" ? "" : Number(val);
    const calculatedAmount =
      num !== "" && !Number.isNaN(num) && totalProjectBudget > 0
        ? Math.round((num / 100) * totalProjectBudget)
        : "";
    setFormData((prev) => ({
      ...prev,
      billingPercentage: val,
      billingAmount: calculatedAmount,
    }));
  };

  const handleAmountChange = (val) => {
    const num = val === "" ? "" : Number(val);
    const calculatedPct =
      num !== "" && !Number.isNaN(num) && totalProjectBudget > 0
        ? Math.round(((num / totalProjectBudget) * 100) * 100) / 100
        : "";
    setFormData((prev) => ({
      ...prev,
      billingAmount: val,
      billingPercentage: calculatedPct,
    }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = "Milestone name is required";
    if (!formData.code.trim()) errs.code = "Milestone code is required";
    if (!formData.sequence || Number(formData.sequence) <= 0) {
      errs.sequence = "Sequence must be a positive integer";
    }
    if (!formData.deliverables.trim()) {
      errs.deliverables = "Deliverables or completion criteria are required";
    }
    if (!formData.plannedStartDate) {
      errs.plannedStartDate = "Planned start date is required";
    }
    if (!formData.plannedCompletionDate) {
      errs.plannedCompletionDate = "Planned completion date is required";
    } else if (
      formData.plannedStartDate &&
      formData.plannedCompletionDate < formData.plannedStartDate
    ) {
      errs.plannedCompletionDate = "Completion date cannot precede start date";
    }

    if (formData.allocationType === "PERCENTAGE") {
      const pct = Number(formData.billingPercentage);
      if (formData.billingPercentage === "" || Number.isNaN(pct) || pct <= 0) {
        errs.billingPercentage = "Percentage must be greater than 0%";
      } else if (pct > 100) {
        errs.billingPercentage = "Percentage cannot exceed 100%";
      }
    } else {
      const amt = Number(formData.billingAmount);
      if (formData.billingAmount === "" || Number.isNaN(amt) || amt <= 0) {
        errs.billingAmount = "Amount must be greater than 0";
      } else if (amt > totalProjectBudget) {
        errs.billingAmount = `Amount cannot exceed project contract budget (${formatINR(totalProjectBudget)})`;
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const selectedEpic = MOCK_PROJECT_EPICS.find((ep) => ep.id === formData.epicId);

    const payload = {
      ...formData,
      sequence: Number(formData.sequence),
      billingPercentage: Number(formData.billingPercentage) || 0,
      billingAmount: Number(formData.billingAmount) || 0,
      currency,
      epicName: selectedEpic ? selectedEpic.name : "",
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/60">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {isEditing ? "Edit Project Milestone" : "Create Project Milestone"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Project: <span className="font-semibold text-slate-700">{projectName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Section 1: Milestone Information */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-indigo-600" />
              <span>Milestone Information</span>
            </h4>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Milestone Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Design Completion & Prototype Approval"
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                    errors.name
                      ? "border-red-300 bg-red-50/20 focus:border-red-500 focus:ring-red-500"
                      : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                  }`}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Milestone Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="MS-001"
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                    errors.code
                      ? "border-red-300 bg-red-50/20 focus:border-red-500 focus:ring-red-500"
                      : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                  }`}
                />
                {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sequence Number *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.sequence}
                  onChange={(e) => setFormData({ ...formData, sequence: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:border-indigo-500 focus:ring-indigo-500"
                />
                {errors.sequence && <p className="text-xs text-red-500 mt-1">{errors.sequence}</p>}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Related Epic (Optional)
                </label>
                <select
                  value={formData.epicId}
                  onChange={(e) => setFormData({ ...formData, epicId: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">-- No Epic Linked --</option>
                  {MOCK_PROJECT_EPICS.map((ep) => (
                    <option key={ep.id} value={ep.id}>
                      {ep.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description / Scope
              </label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Summary of scope covered by this milestone..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Completion Criteria & Deliverables *
              </label>
              <textarea
                rows={2}
                value={formData.deliverables}
                onChange={(e) => setFormData({ ...formData, deliverables: e.target.value })}
                placeholder="Explicit artifacts required for sign-off: e.g. UAT Certificate, Staging Deployment, Security Audit Report..."
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                  errors.deliverables
                    ? "border-red-300 bg-red-50/20 focus:border-red-500 focus:ring-red-500"
                    : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                }`}
              />
              {errors.deliverables && <p className="text-xs text-red-500 mt-1">{errors.deliverables}</p>}
            </div>
          </div>

          {/* Section 2: Schedule */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-indigo-600" />
              <span>Target Schedule</span>
            </h4>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Planned Start Date *
                </label>
                <input
                  type="date"
                  value={formData.plannedStartDate}
                  onChange={(e) => setFormData({ ...formData, plannedStartDate: e.target.value })}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                    errors.plannedStartDate
                      ? "border-red-300 bg-red-50/20 focus:border-red-500 focus:ring-red-500"
                      : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                  }`}
                />
                {errors.plannedStartDate && (
                  <p className="text-xs text-red-500 mt-1">{errors.plannedStartDate}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Planned Completion Date *
                </label>
                <input
                  type="date"
                  value={formData.plannedCompletionDate}
                  onChange={(e) => setFormData({ ...formData, plannedCompletionDate: e.target.value })}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                    errors.plannedCompletionDate
                      ? "border-red-300 bg-red-50/20 focus:border-red-500 focus:ring-red-500"
                      : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                  }`}
                />
                {errors.plannedCompletionDate && (
                  <p className="text-xs text-red-500 mt-1">{errors.plannedCompletionDate}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="clientAcceptanceRequired"
                type="checkbox"
                checked={formData.clientAcceptanceRequired}
                onChange={(e) =>
                  setFormData({ ...formData, clientAcceptanceRequired: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="clientAcceptanceRequired" className="text-xs font-medium text-slate-700 cursor-pointer">
                Require formal Client Acceptance before milestone becomes eligible for AR Billing
              </label>
            </div>
          </div>

          {/* Section 3: Proposed Billing Allocation */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-indigo-600" />
                <span>Proposed Billing Allocation (AR Preview)</span>
              </h4>
              <span className="text-xs text-slate-500">
                Project Contract Budget: <strong className="text-slate-800">{formatINR(totalProjectBudget)}</strong>
              </span>
            </div>

            {/* Commercial boundary callout notice */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-800 flex items-start gap-2.5">
              <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Proposed Commercial Allocation: </span>
                <span>
                  PMS captures operational delivery criteria and proposed billing weights. Official snapshotting, tax calculations, and invoice issuance remain governed by Accounts Receivable (AR).
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Allocation Method
                </label>
                <div className="flex rounded-lg border border-slate-300 p-0.5 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => handleAllocationTypeChange("PERCENTAGE")}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      formData.allocationType === "PERCENTAGE"
                        ? "bg-white text-indigo-700 font-semibold shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Percentage (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAllocationTypeChange("FIXED_AMOUNT")}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      formData.allocationType === "FIXED_AMOUNT"
                        ? "bg-white text-indigo-700 font-semibold shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Fixed Amount (₹)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Allocation Share (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.billingPercentage}
                  onChange={(e) => handlePercentageChange(e.target.value)}
                  placeholder="e.g. 25"
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                    errors.billingPercentage
                      ? "border-red-300 bg-red-50/20 focus:border-red-500 focus:ring-red-500"
                      : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                  }`}
                />
                {errors.billingPercentage && (
                  <p className="text-xs text-red-500 mt-1">{errors.billingPercentage}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Calculated Amount ({currency})
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.billingAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="e.g. 250000"
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                    errors.billingAmount
                      ? "border-red-300 bg-red-50/20 focus:border-red-500 focus:ring-red-500"
                      : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                  }`}
                />
                {errors.billingAmount && (
                  <p className="text-xs text-red-500 mt-1">{errors.billingAmount}</p>
                )}
              </div>
            </div>

            {formData.billingAmount && formData.billingPercentage && (
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 flex items-center justify-between">
                <span>Milestone Share of Contract:</span>
                <span className="font-bold text-slate-900">
                  {formData.billingPercentage}% = {formatINR(formData.billingAmount)}
                </span>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {isEditing ? "Save Changes" : "Save Milestone"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
