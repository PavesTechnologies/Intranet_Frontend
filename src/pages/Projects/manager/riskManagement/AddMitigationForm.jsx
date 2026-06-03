import { useMemo, useState } from "react";
import FilterListbox from "../../../../components/filter/FilterListbox";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import api from "../../../../api/axiosInstance";

export default function AddMitigationForm({ riskId, members, onAdd, onClose }) {
  const [form, setForm] = useState({
    mitigation: "",
    contingency: "",
    ownerId: "",
    notes: "",
  });

  const [showNotes, setShowNotes] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const axiosInstance = useMemo(() => {
    const instance = api.create({
      baseURL: window.__APP_CONFIG__.PMS_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    instance.interceptors.request.use(
      (config) => {
        const latestToken = localStorage.getItem("token");

        if (latestToken) {
          config.headers.Authorization = `Bearer ${latestToken}`;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    return instance;
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!form.mitigation.trim()) return;

    try {
      setSubmitting(true);

      const res = await axiosInstance.post("/api/mitigation-plans", {
        riskId,
        ...form,
        used: false,
        effective: false,
      });

      onAdd(res.data);
      resetAndClose();
    } finally {
      setSubmitting(false);
    }
  }

  function resetAndClose() {
    setForm({
      mitigation: "",
      contingency: "",
      ownerId: "",
      notes: "",
    });
    setShowNotes(false);
    onClose?.();
  }

  return (
    <form
      onSubmit={submit}
      className="border border-slate-200 rounded-xl p-4 space-y-4 bg-slate-50 relative"
    >
      <div className="flex justify-between items-center">
        <h5 className="text-sm font-semibold text-slate-700">
          Add Mitigation Plan
        </h5>
        <button
          type="button"
          onClick={resetAndClose}
          className="text-slate-400 hover:text-slate-600"
        >
          <X size={16} />
        </button>
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-600">
          Mitigation Plan <span className="text-red-500">*</span>
        </label>
        <textarea
          value={form.mitigation}
          onChange={(e) => setForm({ ...form, mitigation: e.target.value })}
          placeholder="Describe how this risk will be mitigated"
          className="mt-1 border rounded-lg p-2 w-full text-sm resize-none focus:ring-2 focus:ring-indigo-200"
          rows={3}
          required
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-600">
          Contingency Plan
        </label>
        <textarea
          value={form.contingency}
          onChange={(e) => setForm({ ...form, contingency: e.target.value })}
          placeholder="Fallback if mitigation fails"
          className="mt-1 border rounded-lg p-2 w-full text-sm resize-none"
          rows={2}
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-600">Owner</label>
        <FilterListbox
          options={[
            { value: "", label: "Unassigned" },
            ...members.map((m) => ({
              value: m.id,
              label: m.name,
            })),
          ]}
          value={form.ownerId}
          onChange={(val) =>
            setForm({
              ...form,
              ownerId: val,
            })
          }
        />
      </div>

      <button
        type="button"
        onClick={() => setShowNotes((v) => !v)}
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
      >
        {showNotes ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        Additional notes
      </button>

      {showNotes && (
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Optional internal notes"
          className="border rounded-lg p-2 w-full text-sm resize-none"
          rows={2}
        />
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
        <button
          type="button"
          onClick={resetAndClose}
          className="px-4 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-200"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={submitting}
          className={`px-4 py-1.5 rounded-lg text-sm text-white ${
            submitting ? "bg-indigo-300" : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {submitting ? "Adding..." : "Add Mitigation"}
        </button>
      </div>
    </form>
  );
}