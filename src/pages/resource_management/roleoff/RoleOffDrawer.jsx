import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, ClipboardList, RefreshCcw, X } from "lucide-react";
import FilterListbox from "../../../../components/filter/FilterListbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STEPS = ["Allocation", "Role-Off", "Approval", "Closure"];
const REASONS = [
  "Project Completion",
  "Client Ramp Down",
  "Performance Issue",
  "Budget Realignment",
  "Critical Dependency",
  "Emergency Transition",
];

const impactStyles = {
  Low: "border-teal-200 bg-teal-50 text-teal-700",
  Medium: "border-amber-200 bg-amber-50 text-amber-700",
  High: "border-rose-200 bg-rose-50 text-rose-700",
};

const getCurrentStep = (mode, request) => {
  if (mode === "create") return "Role-Off";
  if (!request) return "Allocation";
  if (request.status === "Pending Approval") return "Approval";
  return "Closure";
};

const buildInitialState = (request) => ({
  type: request?.type || "Planned",
  effectiveDate: request?.effectiveDateIso || "",
  reason: request?.reason || "",
  resourcePerformance: request?.resourcePerformance || "",
  acknowledgeRisk: false,
  replacementRequired: Boolean(request?.replacementRequired),
});

const RoleOffDrawer = ({
  open,
  mode = "create",
  allocation,
  request,
  onClose,
  onSubmit,
  onCancelRequest,
}) => {
  const [formState, setFormState] = useState(buildInitialState(request));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setFormState(buildInitialState(request));
    setErrors({});
  }, [allocation, request, open]);

  const currentStep = getCurrentStep(mode, request);
  const record = request || allocation;
  const impact = record?.impact || "Low";

  const approvalInfo = useMemo(() => {
    if (impact === "High") {
      return "Delivery Manager review is mandatory. RM must confirm backfill planning before closure.";
    }
    if (impact === "Medium") {
      return "Delivery Manager approval is required with standard review turnaround.";
    }
    return "Standard approval path. Delivery Manager can approve directly.";
  }, [impact]);

  const validate = () => {
    const nextErrors = {};

    if (!formState.reason) nextErrors.reason = "Reason is required.";
    if (!formState.resourcePerformance) nextErrors.resourcePerformance = "Performance is required.";
    if (!formState.effectiveDate) {
      nextErrors.effectiveDate = "Effective date is required.";
    } else {
      const effective = new Date(formState.effectiveDate);
      const allocationStart = allocation?.startDateIso ? new Date(allocation.startDateIso) : null;
      if (allocationStart && effective < allocationStart) {
        nextErrors.effectiveDate = "Effective date cannot be before allocation start.";
      }
    }

    if (impact === "High" && !formState.acknowledgeRisk) {
      nextErrors.acknowledgeRisk = "High impact requests require risk acknowledgement.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex justify-end bg-slate-900/30 backdrop-blur-[1px]">
      <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-gray-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                {mode === "create" ? "Role-Off Request" : "Request Details"}
              </p>
              <h2 className="mt-1 text-xl font-bold text-[#081534]">
                {record?.resource || "Role-Off"}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {record?.project} · {record?.role}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {STEPS.map((step, index) => {
              const active = step === currentStep;
              const complete = STEPS.indexOf(currentStep) > index;

              return (
                <div key={step} className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
                        active && "border-blue-600 bg-blue-600 text-white",
                        complete && "border-emerald-600 bg-emerald-600 text-white",
                        !active && !complete && "border-gray-300 bg-white text-gray-500",
                      )}
                    >
                      {index + 1}
                    </div>
                    <span className={cn("text-xs font-medium", active ? "text-[#081534]" : "text-gray-500")}>
                      {step}
                    </span>
                  </div>
                  {index < STEPS.length - 1 ? <div className="h-px w-8 bg-gray-300" /> : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6 px-6 py-6">
          <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-gray-600" />
              <h3 className="text-sm font-semibold text-[#081534]">Context</h3>
            </div>
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Resource</p>
                <p className="mt-1 font-medium text-gray-800">{record?.resource}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Project</p>
                <p className="mt-1 font-medium text-gray-800">{record?.project}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Allocation</p>
                <p className="mt-1 font-medium text-gray-800">{record?.allocationPercent}%</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Impact</p>
                <Badge className={cn("mt-1 text-[11px] font-semibold", impactStyles[impact])}>
                  {impact}
                </Badge>
              </div>
            </div>
          </section>

          <section className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                Role-Off Type
              </label>
              <FilterListbox
                options={[
                  { value: "Planned", label: "Planned" },
                  { value: "Emergency", label: "Emergency" },
                ]}
                value={formState.type}
                onChange={(val) => setFormState((prev) => ({ ...prev, type: val }))}
                disabled={mode !== "create"}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                Effective Date
              </label>
              <div className="relative mt-2">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={formState.effectiveDate}
                  disabled={mode !== "create"}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, effectiveDate: event.target.value }))
                  }
                  className={cn(
                    "h-10 w-full rounded-md border bg-white pl-10 pr-3 text-sm outline-none transition-colors focus:border-blue-500",
                    errors.effectiveDate ? "border-rose-300" : "border-gray-300",
                  )}
                />
              </div>
              {errors.effectiveDate ? (
                <p className="mt-1 text-xs text-rose-600">{errors.effectiveDate}</p>
              ) : null}
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                Resource Performance
              </label>
              <FilterListbox
                options={[
                  { value: "", label: "Select performance" },
                  { value: "HIGH_PERFORMER", label: "High Performer" },
                  { value: "AVERAGE_PERFORMER", label: "Average Performer" },
                  { value: "LOW_PERFORMER", label: "Low Performer" },
                  { value: "EXCEPTIONAL", label: "Exceptional" },
                  { value: "NEEDS_IMPROVEMENT", label: "Needs Improvement" },
                  { value: "CONSISTENT", label: "Consistent" },
                  { value: "NEW_RESOURCE", label: "New Resource" },
                ]}
                value={formState.resourcePerformance}
                onChange={(val) => setFormState((prev) => ({ ...prev, resourcePerformance: val }))}
                disabled={mode !== "create"}
              />
              {errors.resourcePerformance ? (
                <p className="mt-1 text-xs text-rose-600">{errors.resourcePerformance}</p>
              ) : null}
            </div>
          </section>

          <section>
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
              Reason
            </label>
            <FilterListbox
              options={[
                { value: "", label: "Select reason" },
                ...REASONS.map((reason) => ({ value: reason, label: reason })),
              ]}
              value={formState.reason}
              onChange={(val) => setFormState((prev) => ({ ...prev, reason: val }))}
              disabled={mode !== "create"}
            />
            {errors.reason ? <p className="mt-1 text-xs text-rose-600">{errors.reason}</p> : null}
          </section>

          <section className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[#081534]">Impact Analysis</h3>
                <p className="mt-1 text-sm text-gray-500">{record?.impactSummary}</p>
              </div>
              <Badge className={cn("text-[11px] font-semibold", impactStyles[impact])}>{impact}</Badge>
            </div>
            {impact === "High" ? (
              <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-rose-700" />
                  <div className="text-sm text-rose-800">
                    This role-off impacts a critical delivery path and requires explicit acknowledgement.
                  </div>
                </div>
                {mode === "create" ? (
                  <label className="mt-3 flex items-start gap-2 text-sm text-rose-900">
                    <input
                      type="checkbox"
                      checked={formState.acknowledgeRisk}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          acknowledgeRisk: event.target.checked,
                        }))
                      }
                      className="mt-0.5 h-4 w-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                    />
                    <span>I acknowledge the delivery and client risk for this high impact role-off.</span>
                  </label>
                ) : null}
                {errors.acknowledgeRisk ? (
                  <p className="mt-2 text-xs text-rose-700">{errors.acknowledgeRisk}</p>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-[#081534]">Approval Info</h3>
            <p className="mt-2 text-sm text-gray-600">{approvalInfo}</p>
            <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Approver</p>
                <p className="mt-1 font-medium text-gray-800">Delivery Manager</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Turnaround</p>
                <p className="mt-1 font-medium text-gray-800">
                  {impact === "High" ? "Manual Review" : "Standard Approval"}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[#081534]">Replacement Planning</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Flag if backfill activity should be tracked alongside the role-off.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={formState.replacementRequired}
                  disabled={mode !== "create"}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      replacementRequired: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Replacement required
              </label>
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 border-t border-gray-200 bg-white px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {mode === "view" && request?.status === "Pending Approval" ? (
              <Button
                variant="outline"
                onClick={() => onCancelRequest?.(request)}
                className="h-10 border-rose-300 bg-white text-sm text-rose-700 hover:bg-rose-50 hover:text-rose-800"
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Cancel Request
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose} className="h-10 border-gray-300 bg-white text-sm">
                Close
              </Button>
              {mode === "create" ? (
                <Button
                  className="h-10 bg-[#081534] text-sm hover:bg-[#10214f]"
                  onClick={() => {
                    if (!validate()) return;
                    onSubmit?.(formState);
                  }}
                  disabled={
                    !formState.reason
                    || !formState.effectiveDate
                    || !formState.resourcePerformance
                    || (impact === "High" && !formState.acknowledgeRisk)
                  }
                >
                  Submit Request
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleOffDrawer;
