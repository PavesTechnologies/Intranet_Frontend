import React, { useEffect, useState } from "react";
import axios from "axios";
import Select from "react-select";
import {
  X,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Info,
  Link,
  Check,
} from "lucide-react";
import { showStatusToast } from "../../../../components/toastfy/toast";

const ISSUE_TYPES = ["Epic", "Story", "Task"];
const SCORE_OPTIONS = [1, 2, 3, 4, 5].map((v) => ({ value: v, label: `${v}` }));

const selectStyles = (hasError) => ({
  control: (base, state) => ({
    ...base,
    borderRadius: "0.5rem",
    borderColor: hasError ? "#ef4444" : state.isFocused ? "#6366f1" : "#e2e8f0",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(99,102,241,0.15)" : "none",
    minHeight: "42px",
    fontSize: "0.875rem",
    backgroundColor: "#f8fafc",
    "&:hover": { borderColor: state.isFocused ? "#6366f1" : "#94a3b8" },
  }),
  option: (base, state) => ({
    ...base,
    fontSize: "0.875rem",
    backgroundColor: state.isSelected
      ? "#6366f1"
      : state.isFocused
        ? "#eef2ff"
        : "white",
    color: state.isSelected ? "white" : "#1e293b",
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  placeholder: (base) => ({ ...base, color: "#94a3b8" }),
});

/* ── Score visual picker ── */
const ScorePicker = ({ value, onChange, label, required, error }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
      {label}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    <div className="flex gap-1.5 sm:gap-2">
      {[1, 2, 3, 4, 5].map((n) => {
        const selected = value?.value === n;
        const colors = [
          "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100",
          "bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100",
          "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100",
          "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100",
          "bg-red-50 border-red-200 text-red-700 hover:bg-red-100",
        ];
        const selectedColors = [
          "bg-emerald-500 border-emerald-500 text-white",
          "bg-sky-500 border-sky-500 text-white",
          "bg-amber-500 border-amber-500 text-white",
          "bg-orange-500 border-orange-500 text-white",
          "bg-red-500 border-red-500 text-white",
        ];
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(SCORE_OPTIONS.find((o) => o.value === n))}
            className={`flex-1 h-9 sm:h-10 rounded-lg border-2 font-bold text-sm transition-all duration-150
              ${selected ? selectedColors[n - 1] : colors[n - 1]}`}
          >
            {n}
          </button>
        );
      })}
    </div>
    <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-1">
      <span>Low</span>
      <span>Critical</span>
    </div>
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

/* ── Field wrapper ── */
const Field = ({ label, required, error, children }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
      {label}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

/* ── Input ── */
const Input = ({ error, ...props }) => (
  <input
    className={`w-full bg-slate-50 border rounded-lg px-3 py-2.5 text-sm text-slate-800
      placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200
      focus:border-indigo-400 transition-all
      ${error ? "border-red-400 bg-red-50" : "border-slate-200"}`}
    {...props}
  />
);

/* ── Textarea ── */
const Textarea = ({ rows = 3, ...props }) => (
  <textarea
    rows={rows}
    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm
      text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none
      focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all
      max-h-28 sm:max-h-none"
    {...props}
  />
);

/* ── Steps config ── */
const STEPS = [
  {
    id: 0,
    label: "Details",
    icon: Info,
    desc: "Title, description & triggers",
  },
  {
    id: 1,
    label: "Risk",
    icon: AlertTriangle,
    desc: "Status, category & scoring",
  },
  { id: 2, label: "People", icon: Check, desc: "Owner & reporter" },
  { id: 3, label: "Link", icon: Link, desc: "Optional issue link" },
];

/* ════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════ */
const CreateRiskModal = ({
  isOpen,
  onClose,
  projectId,
  onSuccess,
  onCreate,
  risk = null,
}) => {
  const isEditMode = Boolean(risk?.id);
  const BASE_URL = window.__APP_CONFIG__.PMS_BASE_URL;
  const token = localStorage.getItem("token");

  const [step, setStep] = useState(0);
  const [statuses, setStatuses] = useState([]);
  const [issues, setIssues] = useState([]);
  const [members, setMembers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    triggers: "",
    probability: null,
    impact: null,
    statusId: "",
    owner: null,
    reporter: null,
    category: null,
    linkedType: null,
    linkedIssue: null,
  });

  const set = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  /* Pre-fetch master data as soon as projectId is known — NOT waiting for modal open */
  useEffect(() => {
    if (!projectId) return;
    setLoadingMeta(true);
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      axios.get(`${BASE_URL}/api/projects/${projectId}/members-with-owner`, { headers }),
      axios.get(`${BASE_URL}/api/projects/${projectId}/risk-statuses`, { headers }),
      axios.get(`${BASE_URL}/api/risk/category`, { headers }),
    ])
      .then(([m, s, c]) => {
        setMembers(m.data || []);
        setStatuses(s.data || []);
        setCategories(c.data || []);
      })
      .catch(console.error)
      .finally(() => setLoadingMeta(false));
  }, [projectId]);

  /* Reset step + errors each time modal opens */
  useEffect(() => {
    if (!isOpen) return;
    setStep(0);
    setErrors({});
  }, [isOpen]);

  /* prefill edit */
  useEffect(() => {
    if (!risk || !members.length || !categories.length) return;
    setForm({
      title: risk.title ?? "",
      description: risk.description ?? "",
      triggers: risk.triggers ?? "",
      statusId: risk.statusId ?? "",
      probability:
        SCORE_OPTIONS.find((p) => p.value === risk.probability) || null,
      impact: SCORE_OPTIONS.find((i) => i.value === risk.impact) || null,
      owner: members.find((m) => m.id === risk.ownerId)
        ? {
            value: risk.ownerId,
            label: members.find((m) => m.id === risk.ownerId).name,
          }
        : null,
      reporter: members.find((m) => m.id === risk.reporterId)
        ? {
            value: risk.reporterId,
            label: members.find((m) => m.id === risk.reporterId).name,
          }
        : null,
      category: categories.find((c) => c.id === risk.categoryId)
        ? {
            value: risk.categoryId,
            label: categories.find((c) => c.id === risk.categoryId).name,
          }
        : null,
      linkedType: null,
      linkedIssue: null,
    });
  }, [risk, members, categories]);

  /* load issues */
  useEffect(() => {
    if (!form.linkedType || !projectId) return;
    const apiType =
      form.linkedType.value === "Story"
        ? "stories"
        : `${form.linkedType.value.toLowerCase()}s`;
    axios
      .get(`${BASE_URL}/api/projects/${projectId}/${apiType}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setIssues(res.data || []))
      .catch(console.error);
  }, [form.linkedType, projectId]);

  if (!isOpen) return null;

  /* validate per step */
  const validateStep = (s) => {
    const e = {};
    if (s === 0 && !form.title.trim()) e.title = "Title is required";
    if (s === 1 && !form.statusId) e.statusId = "Status is required";
    if (s === 1 && !form.category) e.category = "Category is required";
    if (s === 1 && !form.probability) e.probability = "Probability is required";
    if (s === 1 && !form.impact) e.impact = "Impact is required";
    if (s === 2 && !form.owner) e.owner = "Owner is required";
    if (s === 2 && !form.reporter) e.reporter = "Reporter is required";
    if (s === 3 && !form.linkedType) e.linkedType = "Link type is required";
    if (s === 3 && !form.linkedIssue) e.linkedIssue = "Linked item is required";
    return e;
  };

  const goNext = () => {
    const e = validateStep(step);
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    // validate all required steps
    const allErrors = {
      ...validateStep(0),
      ...validateStep(1),
      ...validateStep(2),
      ...validateStep(3),
    };
    if (Object.keys(allErrors).length) {
      showStatusToast("Please fill all required fields", "error");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        projectId,
        title: form.title,
        description: form.description,
        probability: form.probability?.value,
        impact: form.impact?.value,
        triggers: form.triggers,
        statusId: form.statusId,
        ownerId: form.owner.value,
        reporterId: form.reporter.value,
        categoryId: form.category.value,
      };
      let riskId = risk?.id;
      if (isEditMode) {
        await axios.put(`${BASE_URL}/api/risks/${riskId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        const res = await axios.post(`${BASE_URL}/api/risks`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        riskId = res.data.id;
      }
      if (form.linkedType && form.linkedIssue) {
        await axios.post(
          `${BASE_URL}/api/risk-links`,
          {
            riskId,
            linkedType: form.linkedType.value,
            linkedId: form.linkedIssue.value,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      }
      showStatusToast(
        isEditMode ? "Risk updated successfully" : "Risk created successfully",
        "success",
      );
      onSuccess?.();
      onCreate?.();
      onClose();
    } catch (err) {
      console.error(err);
      showStatusToast("Operation failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const memberOptions = members.map((m) => ({ value: m.id, label: m.name }));
  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.name,
  }));
  const issueOptions = issues.map((i) => ({
    value: i.id,
    label: i.title || i.name,
  }));

  /* ── Risk score matrix display ── */
  const riskScore = (form.probability?.value ?? 0) * (form.impact?.value ?? 0);
  const riskLevel =
    riskScore >= 20
      ? { label: "Critical", cls: "bg-red-100 text-red-700 border-red-200" }
      : riskScore >= 12
        ? {
            label: "High",
            cls: "bg-orange-100 text-orange-700 border-orange-200",
          }
        : riskScore >= 6
          ? {
              label: "Medium",
              cls: "bg-amber-100 text-amber-700 border-amber-200",
            }
          : riskScore > 0
            ? {
                label: "Low",
                cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
              }
            : null;

  /* ── Step content panels ── */
  const panels = [
    /* Step 0 — Details */
    <div key={0} className="space-y-4">
      <Field label="Risk Title" required error={errors.title}>
        <Input
          placeholder="Describe the risk in a few words…"
          value={form.title}
          error={errors.title}
          onChange={(e) => set("title", e.target.value)}
        />
      </Field>
      <Field label="Description">
        <Textarea
          placeholder="What could go wrong? Provide context…"
          rows={3}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </Field>
      <Field label="Triggers">
        <Textarea
          placeholder="Early warning signs to watch for…"
          rows={2}
          value={form.triggers}
          onChange={(e) => set("triggers", e.target.value)}
        />
      </Field>
    </div>,

    /* Step 1 — Risk assessment */
    <div key={1} className="space-y-5">
      {loadingMeta ? (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <div className="h-3 w-16 bg-slate-200 rounded mb-2" />
              <div className="h-10 bg-slate-100 rounded-lg" />
            </div>
            <div>
              <div className="h-3 w-16 bg-slate-200 rounded mb-2" />
              <div className="h-10 bg-slate-100 rounded-lg" />
            </div>
          </div>
          <div>
            <div className="h-3 w-24 bg-slate-200 rounded mb-2" />
            <div className="flex gap-1.5 sm:gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="flex-1 h-10 bg-slate-100 rounded-lg" />
              ))}
            </div>
          </div>
          <div>
            <div className="h-3 w-16 bg-slate-200 rounded mb-2" />
            <div className="flex gap-1.5 sm:gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="flex-1 h-10 bg-slate-100 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Field label="Status" required error={errors.statusId}>
              <select
                value={form.statusId}
                onChange={(e) => set("statusId", e.target.value)}
                className={`w-full bg-slate-50 border rounded-lg px-3 py-2.5 text-sm text-slate-800
                  focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all
                  ${errors.statusId ? "border-red-400 bg-red-50" : "border-slate-200"}`}
              >
                <option value="">Select status…</option>
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Category" required error={errors.category}>
              <Select
                styles={selectStyles(!!errors.category)}
                options={categoryOptions}
                value={form.category}
                onChange={(v) => set("category", v)}
                menuPortalTarget={document.body}
                placeholder="Select…"
              />
            </Field>
          </div>
          <ScorePicker
            label="Probability"
            required
            error={errors.probability}
            value={form.probability}
            onChange={(v) => set("probability", v)}
          />
          <ScorePicker
            label="Impact"
            required
            error={errors.impact}
            value={form.impact}
            onChange={(v) => set("impact", v)}
          />
          {riskLevel && (
            <div
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border text-xs sm:text-sm font-semibold ${riskLevel.cls}`}
            >
              <AlertTriangle size={15} />
              Risk Score: {riskScore} — {riskLevel.label}
            </div>
          )}
        </>
      )}
    </div>,

    /* Step 2 — People */
    <div key={2} className="space-y-4">
      <div className="p-3 sm:p-4 bg-slate-50 rounded-xl border border-slate-200 mb-2">
        <p className="text-xs text-slate-500">
          Assign responsibility for this risk. The owner is accountable for
          mitigation; the reporter tracks and escalates it.
        </p>
      </div>
      <Field label="Risk Owner" required error={errors.owner}>
        <Select
          styles={selectStyles(!!errors.owner)}
          options={memberOptions}
          value={form.owner}
          onChange={(v) => set("owner", v)}
          menuPortalTarget={document.body}
          placeholder="Who owns this risk?"
        />
      </Field>
      <Field label="Reporter" required error={errors.reporter}>
        <Select
          styles={selectStyles(!!errors.reporter)}
          options={memberOptions}
          value={form.reporter}
          onChange={(v) => set("reporter", v)}
          menuPortalTarget={document.body}
          placeholder="Who reported this risk?"
        />
      </Field>
    </div>,

    /* Step 3 — Link */
    <div key={3} className="space-y-4">
      <div className="p-3 sm:p-4 bg-slate-50 rounded-xl border border-slate-200 mb-2">
        <p className="text-xs text-slate-500">
          Link this risk to an Epic, Story, or Task to track it alongside your
          work items. This is required.
        </p>
      </div>
      <Field label="Link Type" required error={errors.linkedType}>
        <Select
          styles={selectStyles(false)}
          options={ISSUE_TYPES.map((t) => ({ value: t, label: t }))}
          value={form.linkedType}
          onChange={(v) => {
            set("linkedType", v);
            set("linkedIssue", null);
          }}
          menuPortalTarget={document.body}
          placeholder="Epic / Story / Task…"
        />
      </Field>
      <Field label="Linked Item" required error={errors.linkedIssue}>
        <Select
          styles={selectStyles(false)}
          options={issueOptions}
          value={form.linkedIssue}
          onChange={(v) => set("linkedIssue", v)}
          isDisabled={!form.linkedType}
          menuPortalTarget={document.body}
          placeholder={form.linkedType ? "Select item…" : "Choose a type first"}
          isClearable
        />
      </Field>
    </div>,
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "100dvh", height: "auto" }}
      >
        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              {isEditMode ? "Edit Risk" : "Create Risk"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{STEPS[step].desc}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Step indicator ── */}
        <div className="flex px-4 sm:px-6 pt-3 sm:pt-4 pb-2 gap-1.5 sm:gap-2 items-center">
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (i < step) setStep(i);
                }}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border
                  ${
                    active
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : done
                        ? "bg-indigo-50 text-indigo-600 border-indigo-200"
                        : "bg-slate-50 text-slate-400 border-slate-200"
                  }`}
              >
                {done ? (
                  <Check size={10} strokeWidth={3} />
                ) : (
                  <Icon size={10} strokeWidth={2.5} />
                )}
                <span className="hidden xs:inline sm:inline">{s.label}</span>
              </button>
            );
          })}
          {/* progress line */}
          <div className="flex-1 flex items-center">
            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── Panel body ── */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4">
          {panels[step]}
        </div>

        {/* ── Footer nav ── */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 bg-slate-50/60">
          <button
            type="button"
            onClick={step === 0 ? onClose : goBack}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-white hover:border-slate-300 transition-all"
          >
            {step > 0 && <ChevronLeft size={14} />}
            {step === 0 ? "Cancel" : "Back"}
          </button>

          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-200 ${
                  i === step
                    ? "w-5 h-2 bg-indigo-500"
                    : i < step
                      ? "w-2 h-2 bg-indigo-300"
                      : "w-2 h-2 bg-slate-200"
                }`}
              />
            ))}
          </div>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Saving…
                </span>
              ) : (
                <>
                  <Check size={14} />{" "}
                  {isEditMode ? "Update Risk" : "Create Risk"}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateRiskModal;
