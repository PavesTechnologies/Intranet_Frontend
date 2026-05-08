import React, { useEffect, useMemo, useState } from "react";
import FilterListbox from "../../../../components/filter/FilterListbox";
import {
  Briefcase,
  CalendarDays,
  MapPin,
  Pencil,
  Save,
  Send,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import StatusIndicator from "./StatusIndicator";
import {
  formatStatusLabel,
  getStateOptions,
  getSubStateOptions,
  normalizeSubState,
  getAgingTone,
  isSkillStale,
} from "../models/benchModel";

const cardClassName =
  "rounded-[24px] border border-slate-800/90 bg-slate-950/75 p-5 shadow-[0_16px_36px_rgba(2,6,23,0.3)]";
const labelClassName =
  "text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500";
const fieldClassName =
  "mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-70";

const buildFormState = (resource) => ({
  state: resource?.state || "BENCH",
  subState: normalizeSubState(resource?.subState, resource?.state === "POOL" ? "SHADOW" : "READY"),
  reason: resource?.reason || "",
});

const formatCurrency = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "NA";
  return `Rs ${Number(value).toLocaleString("en-IN")}`;
};

const ResourceDrawer = ({
  open,
  resource,
  mode = "view",
  saving = false,
  onClose,
  onModeChange,
  onSave,
  onAllocate,
  onMoveToPool,
  liveMatches,
  loadingMatches,
}) => {
  const [formState, setFormState] = useState(buildFormState(resource));

  useEffect(() => {
    setFormState(buildFormState(resource));
  }, [resource]);

  const subStateOptions = useMemo(
    () => getSubStateOptions(formState.state),
    [formState.state],
  );

  useEffect(() => {
    if (!subStateOptions.some((item) => item.value === formState.subState)) {
      setFormState((prev) => ({
        ...prev,
        subState: subStateOptions[0]?.value || "",
      }));
    }
  }, [formState.subState, subStateOptions]);

  if (!open || !resource) return null;

  const readOnly = mode !== "edit";
  const agingTone = getAgingTone(resource.agingDays);
  const matchData = (liveMatches || []).find(
    (item) => Number(item.resourceId) === Number(resource.employeeId || resource.resourceId || resource.id),
  );
  const opportunities = [...(matchData?.demands || [])].sort(
    (left, right) => (right.matchScore || 0) - (left.matchScore || 0),
  );
  const bestMatchId = opportunities[0]?.demandId;

  return (
    <div className="fixed inset-0 z-[120] flex justify-end bg-slate-950/70 backdrop-blur-sm">
      <button type="button" className="flex-1 cursor-default" onClick={onClose} aria-label="Close drawer" />
      <aside className="flex h-full w-full max-w-2xl flex-col border-l border-slate-800 bg-[#0F172A] shadow-[0_30px_80px_rgba(2,6,23,0.7)] animate-in slide-in-from-right duration-300">
        <div className="sticky top-0 z-10 border-b border-slate-800 bg-[#0F172A]/95 px-6 py-5 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-2xl font-semibold tracking-tight text-white">{resource.name || "Unknown resource"}</p>
              <p className="mt-1 truncate text-sm text-slate-400">{resource.role || "Role unavailable"}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <StatusIndicator status={formState.subState} />
                <span className="inline-flex rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                  {formatStatusLabel(formState.state)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onModeChange?.(readOnly ? "edit" : "view")}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/12 px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-100 transition hover:shadow-[0_0_18px_rgba(99,102,241,0.3)]"
              >
                <Pencil className="h-4 w-4" />
                {readOnly ? "Edit" : "View"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-400 transition hover:border-slate-700 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          <section className={cardClassName}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={labelClassName}>Availability</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-white">{resource.availability}%</p>
              </div>
              <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${agingTone.className}`}>
                Aging {agingTone.label}
              </span>
            </div>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-900">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-teal-400 to-cyan-300 shadow-[0_0_20px_rgba(45,212,191,0.35)] transition-[width] duration-700 ease-out"
                style={{ width: `${Math.max(0, Math.min(100, resource.availability || 0))}%` }}
              />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClassName}>State</label>
                <FilterListbox
                  options={getStateOptions()}
                  value={formState.state}
                  onChange={(val) => setFormState((prev) => ({ ...prev, state: val }))}
                />
              </div>

              <div>
                <label className={labelClassName}>SubState</label>
                <FilterListbox
                  options={subStateOptions}
                  value={formState.subState}
                  onChange={(val) => setFormState((prev) => ({ ...prev, subState: val }))}
                />
              </div>
            </div>
          </section>

          <section className="grid gap-5 md:grid-cols-2">
            <div className={cardClassName}>
              <p className={labelClassName}>Financial</p>
              <div className="mt-5 grid gap-4">
                <div className="rounded-[20px] border border-slate-800 bg-slate-900/70 p-4">
                  <p className="text-sm text-slate-400">Daily Cost</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(resource.costPerDay)}</p>
                </div>
                <div className="rounded-[20px] border border-slate-800 bg-slate-900/70 p-4">
                  <p className="text-sm text-slate-400">Monthly Cost</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency((resource.costPerDay || 0) * 22)}</p>
                </div>
              </div>
            </div>

            <div className={cardClassName}>
              <p className={labelClassName}>Resource Signals</p>
              <div className="mt-5 space-y-3 text-sm text-slate-300">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-4 w-4 text-slate-500" />
                  <span>Last allocation: {resource.lastAllocationDate || "Never allocated"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <ShieldAlert className="h-4 w-4 text-slate-500" />
                  <span>Cost exposure: {formatCurrency(resource.costExposure)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-slate-500" />
                  <span>{resource.location || "Unknown location"} | {resource.experience || 0} years</span>
                </div>
                <div className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4 text-slate-500" />
                  <span>{resource.poolType ? `Pool: ${resource.poolType}` : "Bench inventory"}</span>
                </div>
              </div>
            </div>
          </section>

          <section className={cardClassName}>
            <p className={labelClassName}>Skills</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {resource.skills.length === 0 ? (
                <span className="rounded-full border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-sm text-slate-500">
                  No skills available
                </span>
              ) : (
                resource.skills.map((skill) => {
                  const stale = isSkillStale(resource.skillLastUsed?.[skill]);
                  return (
                    <span
                      key={`${resource.id}-${skill}`}
                      className={`rounded-full border px-3 py-1.5 text-sm ${
                        stale
                          ? "border-amber-500/20 bg-amber-500/10 text-amber-100"
                          : "border-slate-700 bg-slate-900/90 text-slate-100"
                      }`}
                    >
                      {skill} | {resource.proficiency?.[skill] || "Beginner"}
                    </span>
                  );
                })
              )}
            </div>
          </section>

          <section className={cardClassName}>
            <label className={labelClassName}>Reason</label>
            <textarea
              value={formState.reason}
              disabled={readOnly || saving}
              onChange={(event) => setFormState((prev) => ({ ...prev, reason: event.target.value }))}
              rows={4}
              placeholder="Capture transition context, training plan, or staffing notes"
              className={`${fieldClassName} resize-none`}
            />
          </section>

          <section className={cardClassName}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={labelClassName}>Opportunities</p>
                <p className="mt-1 text-sm text-slate-400">Demand matches prioritized by current alignment score.</p>
              </div>
              <Sparkles className="h-5 w-5 text-teal-300" />
            </div>

            <div className="mt-5 space-y-3">
              {loadingMatches ? (
                <div className="rounded-[20px] border border-dashed border-slate-800 bg-slate-950/50 px-4 py-8 text-center text-sm text-slate-500">
                  Calculating opportunities...
                </div>
              ) : opportunities.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-slate-800 bg-slate-950/50 px-4 py-8 text-center text-sm text-slate-500">
                  No high-confidence matches found.
                </div>
              ) : (
                opportunities.map((match, index) => {
                  const isBestMatch = match.demandId === bestMatchId;
                  const score = match.matchScore || 0;
                  const scoreClassName =
                    score >= 70
                      ? "border-emerald-500/30 bg-emerald-500/12 text-emerald-100"
                      : score >= 40
                        ? "border-amber-500/30 bg-amber-500/12 text-amber-100"
                        : "border-slate-700 bg-slate-900 text-slate-300";

                  return (
                    <div
                      key={match.demandId || index}
                      className={`rounded-[20px] border p-4 ${
                        isBestMatch
                          ? "border-teal-500/30 bg-teal-500/8"
                          : "border-slate-800 bg-slate-900/60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{match.demandName || "Unnamed demand"}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                            {isBestMatch ? "Best match" : "Candidate"}{match.availability ? ` | ${match.availability}` : ""}
                          </p>
                        </div>
                        <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${scoreClassName}`}>
                          {score}% match
                        </span>
                      </div>
                      {match.matchedSkills?.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {match.matchedSkills.map((skill) => (
                            <span
                              key={`${match.demandId}-${skill}`}
                              className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-[11px] text-indigo-100"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        <div className="border-t border-slate-800 bg-[#0F172A]/95 px-6 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onAllocate?.(resource)}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/12 px-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-100 transition hover:shadow-[0_0_18px_rgba(20,184,166,0.3)]"
              >
                <Send className="h-4 w-4" />
                Allocate
              </button>
              {!resource.poolType ? (
                <button
                  type="button"
                  onClick={() => onMoveToPool?.(resource)}
                  className="inline-flex h-11 items-center rounded-full border border-slate-700 bg-slate-900 px-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200 transition hover:border-slate-600 hover:text-white"
                >
                  Move To Pool
                </button>
              ) : null}
            </div>

            {readOnly ? (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 items-center rounded-full border border-slate-700 bg-slate-900 px-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200 transition hover:border-slate-600 hover:text-white"
              >
                Close
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setFormState(buildFormState(resource));
                    onModeChange?.("view");
                  }}
                  className="inline-flex h-11 items-center rounded-full border border-slate-700 bg-slate-900 px-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200 transition hover:border-slate-600 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => onSave?.(formState)}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/12 px-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-100 transition hover:shadow-[0_0_18px_rgba(99,102,241,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving" : "Save"}
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default ResourceDrawer;
