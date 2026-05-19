import React, { useEffect, useMemo, useState } from "react";
import {
  Pencil,
  Briefcase,
  Coffee,
  Plane,
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import Modal from "../../../components/Modal/modal";
import Button from "../../../components/Button/Button";
import { getActiveHourSettings, updateHourSettings } from "../api";

const FIELDS = [
  {
    key: "minHrsRegular",
    label: "Regular Day",
    helper: "Minimum required hours on weekdays (Mon–Fri).",
    icon: Briefcase,
    accent: "from-indigo-50 to-indigo-100/40 ring-indigo-100",
    iconBg: "bg-indigo-100 text-indigo-700",
    valueColor: "text-indigo-900",
  },
  {
    key: "minHrsWeekend",
    label: "Weekend Day",
    helper: "Minimum required hours on Saturday / Sunday.",
    icon: Coffee,
    accent: "from-amber-50 to-amber-100/40 ring-amber-100",
    iconBg: "bg-amber-100 text-amber-700",
    valueColor: "text-amber-900",
  },
  {
    key: "autogenLeaveHrs",
    label: "Auto-gen Leave",
    helper: "Hours filled when a date is marked as leave.",
    icon: Plane,
    accent: "from-emerald-50 to-emerald-100/40 ring-emerald-100",
    iconBg: "bg-emerald-100 text-emerald-700",
    valueColor: "text-emerald-900",
  },
];

const HHMM_REGEX = /^\d{1,2}:\d{2}$/;

// Backend stores values in HH.MM-literal convention (e.g. 8.30 == 8h30m).
const decimalToHhmm = (d) => {
  if (d == null || isNaN(Number(d))) return "";
  const cents = Math.round(Number(d) * 100);
  let h = Math.floor(cents / 100);
  let m = cents % 100;
  if (m >= 60) {
    h += Math.floor(m / 60);
    m = m % 60;
  }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const validateHhmm = (s) => {
  if (!s || !HHMM_REGEX.test(s)) {
    return { ok: false, error: "Use HH:mm format (e.g. 08:30)." };
  }
  const [h, m] = s.split(":").map(Number);
  if (m > 59) return { ok: false, error: "Minutes must be 00–59." };
  const totalMinutes = h * 60 + m;
  if (totalMinutes <= 0) return { ok: false, error: "Must be greater than 00:00." };
  if (totalMinutes >= 24 * 60) return { ok: false, error: "Must be less than 24:00." };
  // HH.MM literal: hours.minutes (e.g. 8h30m -> 8.30)
  const hhmmLiteral = Math.round((h + m / 100) * 100) / 100;
  return { ok: true, decimal: hhmmLiteral };
};

const formatUpdatedAt = (iso) => {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
};

const HourSettingsModal = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [active, setActive] = useState(null);
  const [inputs, setInputs] = useState({
    minHrsRegular: "",
    minHrsWeekend: "",
    autogenLeaveHrs: "",
  });
  const [errors, setErrors] = useState({});

  const loadActive = async () => {
    setLoading(true);
    try {
      const data = await getActiveHourSettings();
      setActive(data);
      setInputs({
        minHrsRegular: decimalToHhmm(data?.minHrsRegular),
        minHrsWeekend: decimalToHhmm(data?.minHrsWeekend),
        autogenLeaveHrs: decimalToHhmm(data?.autogenLeaveHrs),
      });
      setErrors({});
    } catch {
      // toast already shown by api helper
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setEditMode(false);
      loadActive();
    }
  }, [isOpen]);

  const handleChange = (key, value) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
    const result = validateHhmm(value);
    setErrors((prev) => ({ ...prev, [key]: result.ok ? null : result.error }));
  };

  const isSaveDisabled = useMemo(() => {
    if (!editMode) return true;
    return FIELDS.some((f) => !validateHhmm(inputs[f.key]).ok);
  }, [editMode, inputs]);

  const handleSave = async () => {
    const payload = {};
    let hasChange = false;
    for (const f of FIELDS) {
      const result = validateHhmm(inputs[f.key]);
      if (!result.ok) return;
      const existing = active ? Number(active[f.key]) : null;
      if (existing == null || Math.abs(existing - result.decimal) > 0.0001) {
        payload[f.key] = result.decimal;
        hasChange = true;
      }
    }

    if (!hasChange) {
      setEditMode(false);
      return;
    }

    setSaving(true);
    try {
      const updated = await updateHourSettings(payload);
      if (updated) {
        setActive(updated);
        setInputs({
          minHrsRegular: decimalToHhmm(updated.minHrsRegular),
          minHrsWeekend: decimalToHhmm(updated.minHrsWeekend),
          autogenLeaveHrs: decimalToHhmm(updated.autogenLeaveHrs),
        });
      } else {
        await loadActive();
      }
      setEditMode(false);
    } catch {
      // toast already shown
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setInputs({
      minHrsRegular: decimalToHhmm(active?.minHrsRegular),
      minHrsWeekend: decimalToHhmm(active?.minHrsWeekend),
      autogenLeaveHrs: decimalToHhmm(active?.autogenLeaveHrs),
    });
    setErrors({});
    setEditMode(false);
  };

  const updatedAtLabel = formatUpdatedAt(active?.updatedAt || active?.createdAt);
  const hasPersistedRow = active?.id != null;

  const titleNode = (
    <div className="flex items-center gap-2">
      <span>Hour Settings</span>
      {hasPersistedRow ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
          <CheckCircle2 size={12} /> Active
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600 ring-1 ring-gray-200">
          Defaults
        </span>
      )}
    </div>
  );

  const footerNode = editMode ? (
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs text-gray-500">
        Leaving a value unchanged keeps the previous setting.
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="small"
          onClick={handleCancelEdit}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          size="small"
          onClick={handleSave}
          disabled={isSaveDisabled || saving}
          loading={saving}
          loadingText="Saving..."
        >
          Save Changes
        </Button>
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs text-gray-500">
        {updatedAtLabel
          ? `Last updated ${updatedAtLabel}`
          : "Using built-in defaults. Edit to persist your values."}
      </p>
      <Button
        variant="primary"
        size="small"
        onClick={() => setEditMode(true)}
        disabled={loading}
      >
        <Pencil size={14} className="-ml-0.5" />
        Edit
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={titleNode}
      subtitle="Defaults used by the weekly review when validating and auto-generating timesheets. These settings do not affect existing timesheet entries."
      size="3xl"
      titleIcon={<Clock className="h-5 w-5" />}
      footer={footerNode}
    >
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0A0082] border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {FIELDS.map((f) => {
            const Icon = f.icon;
            const err = errors[f.key];
            return (
              <div
                key={f.key}
                className={`relative flex flex-col gap-3 rounded-xl bg-gradient-to-br ${f.accent} p-4 ring-1`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${f.iconBg}`}
                  >
                    <Icon size={16} />
                  </div>
                  <span className="text-sm font-semibold text-gray-800">
                    {f.label}
                  </span>
                </div>

                {editMode ? (
                  <div className="flex flex-col gap-1">
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="HH:mm"
                        value={inputs[f.key]}
                        onChange={(e) => handleChange(f.key, e.target.value)}
                        className={`w-full rounded-md border bg-white px-3 py-2 text-lg font-semibold tracking-wider tabular-nums shadow-sm outline-none focus:ring-2 ${
                          err
                            ? "border-red-400 text-red-700 focus:ring-red-200"
                            : `border-gray-300 ${f.valueColor} focus:border-[#0A0082] focus:ring-indigo-200`
                        }`}
                      />
                      <Clock
                        size={14}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                    </div>
                    {err && (
                      <div className="flex items-center gap-1 text-xs text-red-600">
                        <AlertCircle size={12} />
                        <span>{err}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`text-3xl font-bold tabular-nums ${f.valueColor}`}
                    >
                      {inputs[f.key] || "--:--"}
                    </span>
                    <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                      hrs
                    </span>
                  </div>
                )}

                <p className="text-xs leading-relaxed text-gray-600">
                  {f.helper}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {!loading && editMode && (
        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs text-blue-800">
          Enter time as <strong className="font-semibold">HH:mm</strong>{" "}
          (e.g. <code className="rounded bg-white px-1">08:30</code>). Minutes
          must be 00–59 and total must stay below 24:00.
        </div>
      )}
    </Modal>
  );
};

export default HourSettingsModal;
