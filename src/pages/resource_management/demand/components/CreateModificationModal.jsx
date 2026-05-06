import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Calendar, CheckCircle2, Percent, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const NORMAL_CAPACITY_LIMIT = 100;
const MAX_OVERRIDE_CAPACITY = 130;
const MIN_OVERRIDE_DURATION_DAYS = 7;
const MAX_OVERRIDE_DURATION_DAYS = 14;

const emptyForm = {
  allocationId: "",
  currentAllocationPercentage: "",
  requestedAllocationPercentage: "",
  effectiveDate: "",
  overrideEndDate: "",
  reason: "",
};

const getTodayDate = () => new Date().toISOString().split("T")[0];

const getDayDifference = (startDate, endDate) => {
  if (!startDate || !endDate) return null;

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.round((end - start) / millisecondsPerDay);
};

const CreateModificationModal = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  resourceOptions,
  demand,
}) => {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen) return;

    setForm(emptyForm);
    setErrors({});
  }, [isOpen]);

  const selectedResource = useMemo(
    () =>
      resourceOptions.find(
        (resource) => String(resource.allocationId) === String(form.allocationId)
      ) || null,
    [form.allocationId, resourceOptions]
  );

  const currentAllocationValue = Number(
    selectedResource?.currentAllocationPercentage ??
      selectedResource?.allocationPercentage ??
      0
  );
  const requestedAllocationValue = Number(form.requestedAllocationPercentage);
  const normalLimit = Math.max(NORMAL_CAPACITY_LIMIT - currentAllocationValue, 0);
  const overrideLimit = Math.max(MAX_OVERRIDE_CAPACITY - currentAllocationValue, 0);
  const isInNormalZone =
    Number.isFinite(requestedAllocationValue) &&
    requestedAllocationValue >= 0 &&
    requestedAllocationValue <= 100;
  const requiresOverride =
    Number.isFinite(requestedAllocationValue) &&
    requestedAllocationValue > 100 &&
    requestedAllocationValue <= 130;
  const isInvalidAllocation =
    Number.isFinite(requestedAllocationValue) && requestedAllocationValue > 130;
  const overrideDurationDays = getDayDifference(form.effectiveDate, form.overrideEndDate);

  const validationState = !selectedResource ||
    !Number.isFinite(requestedAllocationValue) ||
    requestedAllocationValue < 0
      ? "pending"
      : isInvalidAllocation
        ? "invalid"
        : requiresOverride
          ? "override"
          : form.effectiveDate && form.reason.trim() && isInNormalZone
            ? "valid"
            : "pending";

  useEffect(() => {
    if (!selectedResource) {
      setForm((currentForm) => ({
        ...currentForm,
        currentAllocationPercentage: "",
      }));
      return;
    }

    const currentAllocation =
      selectedResource.currentAllocationPercentage ?? selectedResource.allocationPercentage ?? 0;

    setForm((currentForm) => ({
      ...currentForm,
      currentAllocationPercentage: String(currentAllocation),
      requestedAllocationPercentage: String(Math.max(Number(currentAllocation), 0)),
      effectiveDate: "",
      overrideEndDate: "",
      reason: "",
    }));
  }, [selectedResource]);

  const handleResourceChange = (event) => {
    const nextAllocationId = event.target.value;
    const nextSelectedResource = resourceOptions.find(
      (resource) => String(resource.allocationId) === String(nextAllocationId)
    );
    const nextCurrentAllocation =
      nextSelectedResource?.currentAllocationPercentage ??
      nextSelectedResource?.allocationPercentage ??
      "";
    const nextRemainingAllocation =
      nextSelectedResource?.remainingAllocationPercentage ??
      nextSelectedResource?.currentAllocationPercentage ??
      nextSelectedResource?.allocationPercentage ??
      "";

    setForm((currentForm) => ({
      ...currentForm,
      allocationId: nextAllocationId,
      currentAllocationPercentage:
        nextCurrentAllocation === "" ? "" : String(nextCurrentAllocation),
      requestedAllocationPercentage:
        nextCurrentAllocation === "" ? "" : String(nextCurrentAllocation),
      overrideEndDate: "",
    }));
  };

  const handleRequestedAllocationChange = (event) => {
    const nextValue = event.target.value;
    const numericValue = Number(nextValue);
    const safeValue =
      nextValue === ""
        ? ""
        : Number.isFinite(numericValue)
          ? String(Math.max(numericValue, 0))
          : "";

    setForm((currentForm) => ({
      ...currentForm,
      requestedAllocationPercentage: safeValue,
      overrideEndDate:
        (Number(safeValue) || 0) > 100 &&
        (Number(safeValue) || 0) <= 130
          ? currentForm.overrideEndDate
          : "",
    }));
  };

  const validate = () => {
    const nextErrors = {};
    const today = getTodayDate();
    const requestedAllocation = Number(form.requestedAllocationPercentage);

    if (!form.allocationId) nextErrors.allocationId = "Resource is required";

    if (
      !Number.isFinite(requestedAllocation) ||
      requestedAllocation < 0 ||
      requestedAllocation > 130
    ) {
      nextErrors.requestedAllocationPercentage =
        "Total allocation cannot exceed 130% for a resource";
    }

    if (!form.effectiveDate) {
      nextErrors.effectiveDate = "Effective date is required";
    } else if (form.effectiveDate < today) {
      nextErrors.effectiveDate = "Effective date cannot be in the past";
    }

    if (!form.reason.trim()) {
      nextErrors.reason = "Reason is required";
    }

    if (requiresOverride && !form.overrideEndDate) {
      nextErrors.overrideEndDate = "Override end date is required";
    }

    if (requiresOverride && form.effectiveDate && form.overrideEndDate) {
      if (form.overrideEndDate < form.effectiveDate) {
        nextErrors.overrideEndDate = "Override end date must be after the effective date";
      } else if (overrideDurationDays < MIN_OVERRIDE_DURATION_DAYS) {
        nextErrors.overrideEndDate =
          `Override duration must be at least ${MIN_OVERRIDE_DURATION_DAYS} days`;
      } else if (overrideDurationDays > MAX_OVERRIDE_DURATION_DAYS) {
        nextErrors.overrideEndDate =
          `Override duration cannot exceed ${MAX_OVERRIDE_DURATION_DAYS} days`;
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event?.preventDefault?.();

    if (!validate() || !selectedResource) return;

    await onSubmit({
      allocationId: selectedResource.allocationId,
      requestedAllocationPercentage: Number(form.requestedAllocationPercentage),
      effectiveDate: form.effectiveDate,
      overrideEndDate: requiresOverride ? form.overrideEndDate : null,
      reason: form.reason.trim(),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-200 animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-600">
              <CheckCircle2 className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Create Modification</h2>
              <p className="text-xs text-slate-500">
                Update allocation for the selected resource.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-600">Demand</label>
                <Input
                  readOnly
                  value={demand?.demandName || "N/A"}
                  className="h-10 rounded-lg border-slate-200 bg-slate-50 text-sm text-slate-700 focus-visible:ring-0"
                />
              </div>

              <div className="space-y-1">
                <label className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  Resource
                </label>
                <select
                  value={form.allocationId}
                  onChange={handleResourceChange}
                  className={cn(
                    "h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15",
                    errors.allocationId ? "border-rose-300" : "border-slate-200"
                  )}
                >
                  <option value="">Select allocated resource</option>
                  {resourceOptions.map((resource) => (
                    <option
                      key={resource.allocationId || resource.resourceId}
                      value={resource.allocationId || ""}
                    >
                      {String(form.allocationId) === String(resource.allocationId)
                        ? resource.resourceName
                        : `${resource.resourceName} | ${resource.allocationPercentage}% | ${
                            resource.allocationStartDate || "N/A"
                          } to ${resource.allocationEndDate || "N/A"}`}
                    </option>
                  ))}
                </select>
                {errors.allocationId && (
                  <p className="text-[11px] text-rose-600">{errors.allocationId}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-600">
                  Current Allocation %
                </label>
                <Input
                  readOnly
                  value={form.currentAllocationPercentage ? `${form.currentAllocationPercentage}%` : ""}
                  className="h-10 rounded-lg border-slate-200 bg-slate-50 text-sm text-slate-700 focus-visible:ring-0"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-600">
                  Available Allocation
                </label>
                <Input
                  readOnly
                  value={
                    selectedResource
                      ? `Normal ${normalLimit}% | Override ${overrideLimit}%`
                      : ""
                  }
                  className="h-10 rounded-lg border-slate-200 bg-slate-50 text-sm text-slate-700 focus-visible:ring-0"
                />
              </div>

              <div className="space-y-1">
                <label className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
                  <Percent className="h-3.5 w-3.5 text-slate-400" />
                  Requested Allocation %
                </label>
                <Input
                  type="number"
                  min="0"
                  value={form.requestedAllocationPercentage}
                  onChange={handleRequestedAllocationChange}
                  className={cn(
                    "h-10 rounded-lg border text-sm text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500/15",
                    errors.requestedAllocationPercentage ? "border-rose-300" : "border-slate-200"
                  )}
                />
                {errors.requestedAllocationPercentage && (
                  <p className="text-[11px] text-rose-600">
                    {errors.requestedAllocationPercentage}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Effective Date
                </label>
                <Input
                  type="date"
                  min={getTodayDate()}
                  value={form.effectiveDate}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      effectiveDate: event.target.value,
                    }))
                  }
                  className={cn(
                    "h-10 rounded-lg border text-sm text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500/15",
                    errors.effectiveDate ? "border-rose-300" : "border-slate-200"
                  )}
                />
                {errors.effectiveDate && (
                  <p className="text-[11px] text-rose-600">{errors.effectiveDate}</p>
                )}
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] font-medium text-slate-600">Reason</label>
                <textarea
                  rows={4}
                  value={form.reason}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      reason: event.target.value,
                    }))
                  }
                  placeholder="Explain why this allocation needs to change..."
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15",
                    errors.reason ? "border-rose-300" : "border-slate-200"
                  )}
                />
                {errors.reason && (
                  <p className="text-[11px] text-rose-600">{errors.reason}</p>
                )}
              </div>

              {requiresOverride && (
                <div className="space-y-2 rounded-lg bg-amber-50 px-3 py-3 sm:col-span-2">
                  <p className="text-[11px] font-medium text-amber-800">
                    Total allocation exceeds 100%. Override required.
                  </p>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-600">
                      Override End Date
                    </label>
                    <Input
                      type="date"
                      min={form.effectiveDate || getTodayDate()}
                      value={form.overrideEndDate}
                      onChange={(event) =>
                        setForm((currentForm) => ({
                          ...currentForm,
                          overrideEndDate: event.target.value,
                        }))
                      }
                      className={cn(
                        "h-10 rounded-lg border bg-white text-sm text-slate-900 focus-visible:ring-2 focus-visible:ring-amber-500/20",
                        errors.overrideEndDate ? "border-rose-300" : "border-amber-200"
                      )}
                    />
                    {overrideDurationDays !== null && form.overrideEndDate && (
                      <p className="text-[11px] text-amber-700">
                        Override duration: {overrideDurationDays} day{overrideDurationDays === 1 ? "" : "s"}
                      </p>
                    )}
                    {errors.overrideEndDate && (
                      <p className="text-[11px] text-rose-600">{errors.overrideEndDate}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              {validationState === "valid" && (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                  Ready to submit
                </span>
              )}

              {validationState === "override" && (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                  Override required
                </span>
              )}

              {validationState === "invalid" && (
                <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-200">
                  Invalid allocation
                </span>
              )}
            </div>
          </div>
        </form>

        <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
          <Button
            variant="outline"
            type="button"
            onClick={onClose}
            className="h-10 flex-1 rounded-lg border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || resourceOptions.length === 0}
            className="h-10 flex-[2] rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700"
          >
            {isSubmitting
              ? "Processing..."
              : requiresOverride
                ? "Submit Override"
                : "Submit"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateModificationModal;
