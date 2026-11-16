import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Flag, Info, Lock } from "lucide-react";
import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { useMilestoneMutations, useProjectEpics } from "../hooks/useMilestones";
import {
  estimateAmount,
  extractApiErrors,
  formatMoney,
  formatPercent,
  validateMilestoneForm,
} from "../utils/milestoneUtils";

export const FOCUS_RING = "focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2";

const inputClass = (hasError) =>
  `block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-800 shadow-sm placeholder:text-slate-400
   focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500
   ${hasError ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200" : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-200"}`;

const emptyValues = {
  name: "",
  milestoneCode: "",
  description: "",
  epicId: "",
  plannedStartDate: "",
  plannedDueDate: "",
  billable: true,
  allocationPercentage: "",
};

const toFormValues = (m) => ({
  name: m.name ?? "",
  milestoneCode: m.milestoneCode ?? "",
  description: m.description ?? "",
  epicId: m.epicId ? String(m.epicId) : "",
  plannedStartDate: m.plannedStartDate ?? "",
  plannedDueDate: m.plannedDueDate ?? "",
  billable: !!m.billable,
  allocationPercentage: m.allocationPercentage != null ? String(Number(m.allocationPercentage)) : "",
});

const FIELD_IDS = {
  name: "ms-name",
  milestoneCode: "ms-code",
  description: "ms-description",
  epicId: "ms-epic",
  plannedStartDate: "ms-start",
  plannedDueDate: "ms-due",
  allocationPercentage: "ms-allocation",
};

const Field = ({ id, label, required, hint, error, children }) => (
  <div>
    <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
      {label}
      {required && (
        <span className="text-rose-600" aria-hidden="true">
          {" "}*
        </span>
      )}
    </label>
    {children}
    {hint && !error && (
      <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">
        {hint}
      </p>
    )}
    {error && (
      <p id={`${id}-error`} className="mt-1 flex items-start gap-1 text-xs text-rose-600">
        <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {error}
      </p>
    )}
  </div>
);

const describedBy = (id, error, hint) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined);

/**
 * Create / edit milestone. `milestone` null → create.
 * `summary` supplies the current allocation total and project budget.
 */
const MilestoneFormModal = ({ isOpen, onClose, projectId, milestone, summary }) => {
  const isEdit = !!milestone;
  const [values, setValues] = useState(emptyValues);
  const [errors, setErrors] = useState({});
  const [serverErrors, setServerErrors] = useState([]);
  const summaryRef = useRef(null);
  const firstFieldRef = useRef(null);
  const returnFocusRef = useRef(null);

  const { data: epics = [], isLoading: epicsLoading } = useProjectEpics(projectId, isOpen);
  const { create, update } = useMilestoneMutations(projectId);
  const saving = create.isPending || update.isPending;

  const allocationLocked = isEdit && ["COMPLETED", "CANCELLED"].includes(milestone.executionStatus);

  // Share left for this milestone: 100 − (active allocation excluding this milestone's own share).
  const availablePercentage = useMemo(() => {
    if (!summary) return null;
    const allocated = Number(summary.allocatedPercentage) || 0;
    const own =
      isEdit && milestone.billable && milestone.executionStatus !== "CANCELLED"
        ? Number(milestone.allocationPercentage) || 0
        : 0;
    return Math.max(0, Math.round((100 - allocated + own) * 100) / 100);
  }, [summary, isEdit, milestone]);

  useEffect(() => {
    if (!isOpen) return;
    returnFocusRef.current = document.activeElement;
    setValues(isEdit ? toFormValues(milestone) : emptyValues);
    setErrors({});
    setServerErrors([]);
    setConfirmDiscard(false);
    const t = setTimeout(() => firstFieldRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [isOpen, isEdit, milestone]);

  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const initialValues = useMemo(() => (isEdit ? toFormValues(milestone) : emptyValues), [isEdit, milestone]);
  const dirty = isOpen && JSON.stringify(values) !== JSON.stringify(initialValues);

  const forceClose = () => {
    setConfirmDiscard(false);
    onClose();
    // Return focus to whatever opened the dialog.
    setTimeout(() => returnFocusRef.current?.focus?.(), 0);
  };

  // Ask before throwing away unsaved edits (sheet-dismiss-confirm).
  const close = () => {
    if (saving) return;
    if (confirmDiscard) {
      setConfirmDiscard(false); // Escape / X on the prompt means "keep editing"
      return;
    }
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    forceClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const set = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setValues((v) => {
      const next = { ...v, [field]: value };
      if (field === "billable" && !value) next.allocationPercentage = "0";
      if (field === "billable" && value && v.allocationPercentage === "0") next.allocationPercentage = "";
      return next;
    });
  };

  // Validate a field once the user leaves it, not on every keystroke.
  const validateOnBlur = (field) => () => {
    const fieldErrors = validateMilestoneForm(values, { isEdit, availablePercentage, allocationLocked });
    setErrors((prev) => ({ ...prev, [field]: fieldErrors[field] }));
  };

  const buildPayload = () => {
    const pct = values.billable ? Number(values.allocationPercentage) : 0;
    const common = {
      name: values.name.trim(),
      description: values.description.trim() || null,
      epicId: values.epicId ? Number(values.epicId) : null,
      plannedStartDate: values.plannedStartDate || null,
      plannedDueDate: values.plannedDueDate || null,
      billable: values.billable,
      allocationPercentage: pct,
    };
    if (isEdit) {
      return { ...common, version: milestone.version };
    }
    return { ...common, milestoneCode: values.milestoneCode.trim() || null };
  };

  const focusSummary = () => setTimeout(() => summaryRef.current?.focus(), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fieldErrors = validateMilestoneForm(values, { isEdit, availablePercentage, allocationLocked });
    setErrors(fieldErrors);
    setServerErrors([]);
    if (Object.keys(fieldErrors).length) {
      focusSummary();
      return;
    }
    try {
      if (isEdit) {
        await update.mutateAsync({ milestoneId: milestone.id, payload: buildPayload() });
        showStatusToast("Milestone updated", "success");
      } else {
        await create.mutateAsync({ projectId, payload: buildPayload() });
        showStatusToast("Milestone created", "success");
      }
      forceClose();
    } catch (err) {
      const { summary: msgs, fields } = extractApiErrors(err);
      setErrors(fields);
      setServerErrors(msgs);
      focusSummary();
    }
  };

  // Field errors link to their input; server-only messages are plain items.
  const fieldErrorItems = Object.entries(errors)
    .filter(([, msg]) => msg)
    .map(([field, msg]) => ({ msg, href: FIELD_IDS[field] ? `#${FIELD_IDS[field]}` : null }));
  const errorItems = [
    ...fieldErrorItems,
    ...serverErrors.filter((msg) => !fieldErrorItems.some((f) => f.msg === msg)).map((msg) => ({ msg, href: null })),
  ];
  const estimate = values.billable
    ? estimateAmount(summary?.projectBudget, values.allocationPercentage || 0)
    : null;

  const footer = confirmDiscard ? (
    <div role="alertdialog" aria-labelledby="ms-discard-title" className="flex flex-wrap items-center justify-between gap-3">
      <p id="ms-discard-title" className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
        <AlertCircle className="h-4 w-4 text-amber-600" aria-hidden="true" />
        Discard your unsaved changes?
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setConfirmDiscard(false)} className={FOCUS_RING} autoFocus>
          Keep editing
        </Button>
        <Button variant="danger" onClick={forceClose} className={FOCUS_RING}>
          Discard
        </Button>
      </div>
    </div>
  ) : (
    <div className="flex justify-end gap-2">
      <Button variant="outline" onClick={close} disabled={saving} className={FOCUS_RING}>
        Cancel
      </Button>
      <Button
        type="submit"
        form="milestone-form"
        loading={saving}
        loadingText={isEdit ? "Saving…" : "Creating…"}
        className={FOCUS_RING}
      >
        {isEdit ? "Save changes" : "Create milestone"}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title={isEdit ? `Edit ${milestone.milestoneCode}` : "Add milestone"}
      subtitle={isEdit ? milestone.name : "Define a delivery milestone and its share of the project value."}
      titleIcon={<Flag className="h-5 w-5" aria-hidden="true" />}
      size="2xl"
      closeOnBackdrop={!saving}
      footer={footer}
    >
      <form id="milestone-form" noValidate onSubmit={handleSubmit} className="space-y-4">
        {errorItems.length > 0 && (
          <div
            ref={summaryRef}
            tabIndex={-1}
            role="alert"
            aria-labelledby="milestone-error-title"
            className="rounded-lg border border-rose-200 bg-rose-50 p-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            <p id="milestone-error-title" className="flex items-center gap-1.5 text-sm font-semibold text-rose-800">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              Please fix the following
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-6 text-sm text-rose-700">
              {errorItems.map(({ msg, href }) => (
                <li key={msg}>
                  {href ? (
                    <a
                      href={href}
                      onClick={(e) => {
                        e.preventDefault();
                        document.querySelector(href)?.focus();
                      }}
                      className="underline underline-offset-2 hover:text-rose-900"
                    >
                      {msg}
                    </a>
                  ) : (
                    msg
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Field id="ms-name" label="Milestone name" required error={errors.name}>
              <input
                ref={firstFieldRef}
                id="ms-name"
                type="text"
                value={values.name}
                onChange={set("name")}
                onBlur={validateOnBlur("name")}
                maxLength={200}
                autoComplete="off"
                aria-invalid={!!errors.name}
                aria-describedby={describedBy("ms-name", errors.name)}
                className={inputClass(errors.name)}
                placeholder="e.g. UAT sign-off"
              />
            </Field>
          </div>
          <Field
            id="ms-code"
            label="Code"
            hint={isEdit ? "Code can't be changed." : "Leave blank to auto-generate."}
            error={errors.milestoneCode}
          >
            <input
              id="ms-code"
              type="text"
              value={values.milestoneCode}
              onChange={set("milestoneCode")}
              onBlur={validateOnBlur("milestoneCode")}
              disabled={isEdit}
              maxLength={50}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={!!errors.milestoneCode}
              aria-describedby={describedBy("ms-code", errors.milestoneCode, true)}
              className={`${inputClass(errors.milestoneCode)} font-mono uppercase`}
              placeholder="Auto"
            />
          </Field>
        </div>

        <Field id="ms-description" label="Description" error={errors.description}>
          <textarea
            id="ms-description"
            rows={3}
            value={values.description}
            onChange={set("description")}
            onBlur={validateOnBlur("description")}
            maxLength={2000}
            aria-invalid={!!errors.description}
            aria-describedby={describedBy("ms-description", errors.description)}
            className={inputClass(errors.description)}
            placeholder="What has to be delivered for this milestone?"
          />
        </Field>

        <Field id="ms-epic" label="Linked epic" hint="Optional. Only this project's epics are listed." error={errors.epicId}>
          <select
            id="ms-epic"
            value={values.epicId}
            onChange={set("epicId")}
            disabled={epicsLoading}
            aria-invalid={!!errors.epicId}
            aria-describedby={describedBy("ms-epic", errors.epicId, true)}
            className={inputClass(errors.epicId)}
          >
            <option value="">{epicsLoading ? "Loading epics…" : "No epic"}</option>
            {epics.map((epic) => (
              <option key={epic.id} value={epic.id}>
                {epic.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="ms-start" label="Planned start" error={errors.plannedStartDate}>
            <input
              id="ms-start"
              type="date"
              value={values.plannedStartDate}
              onChange={set("plannedStartDate")}
              onBlur={validateOnBlur("plannedDueDate")}
              aria-invalid={!!errors.plannedStartDate}
              className={inputClass(errors.plannedStartDate)}
            />
          </Field>
          <Field id="ms-due" label="Planned due" error={errors.plannedDueDate}>
            <input
              id="ms-due"
              type="date"
              value={values.plannedDueDate}
              min={values.plannedStartDate || undefined}
              onChange={set("plannedDueDate")}
              onBlur={validateOnBlur("plannedDueDate")}
              aria-invalid={!!errors.plannedDueDate}
              aria-describedby={describedBy("ms-due", errors.plannedDueDate)}
              className={inputClass(errors.plannedDueDate)}
            />
          </Field>
        </div>

        <fieldset className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-700">Billing</legend>

          {allocationLocked && (
            <p className="mb-3 flex items-start gap-1.5 text-xs text-slate-600">
              <Lock className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Billing settings are locked because this milestone is {milestone.executionStatus.toLowerCase()}.
            </p>
          )}

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={values.billable}
              onChange={set("billable")}
              disabled={allocationLocked}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>
              <span className="block text-sm font-medium text-slate-800">Billable milestone</span>
              <span className="block text-xs text-slate-500">
                Billable milestones share the project value (up to 100% in total). It becomes ready for billing once completed.
              </span>
            </span>
          </label>

          {values.billable && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field
                id="ms-allocation"
                label="Allocation (%)"
                required
                hint={
                  availablePercentage !== null
                    ? `${formatPercent(availablePercentage)} available to allocate.`
                    : undefined
                }
                error={errors.allocationPercentage}
              >
                <input
                  id="ms-allocation"
                  type="text"
                  inputMode="decimal"
                  value={values.allocationPercentage}
                  onChange={set("allocationPercentage")}
                  onBlur={validateOnBlur("allocationPercentage")}
                  disabled={allocationLocked}
                  aria-invalid={!!errors.allocationPercentage}
                  aria-describedby={describedBy("ms-allocation", errors.allocationPercentage, availablePercentage !== null)}
                  className={`${inputClass(errors.allocationPercentage)} tabular-nums`}
                  placeholder="e.g. 25"
                />
              </Field>
              <div>
                <p className="mb-1 block text-sm font-medium text-slate-700">Estimated amount</p>
                <p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 tabular-nums">
                  {summary?.projectBudget != null ? formatMoney(estimate, summary.currency) : "No project budget set"}
                </p>
                <p className="mt-1 flex items-start gap-1 text-xs text-slate-500">
                  <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Estimate from the project budget. Accounts Receivable calculates the billed amount.
                </p>
              </div>
            </div>
          )}
        </fieldset>
      </form>
    </Modal>
  );
};

export default MilestoneFormModal;
