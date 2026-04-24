import { useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import axios from "axios";

export default function AddMitigationForm({ riskId, members, onAdd, onClose }) {
  const [form, setForm] = useState({
    mitigation: "",
    contingency: "",
    ownerId: "",
    notes: "",
  });

  const [showNotes, setShowNotes] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const BASE_URL = window.__APP_CONFIG__.PMS_BASE_URL;
  const token = localStorage.getItem("token");

  async function submit(e) {
    e.preventDefault();
    if (!form.mitigation.trim()) return;

    try {
      setSubmitting(true);

      const res = await axios.post(
        `${BASE_URL}/api/mitigation-plans`,
        {
          riskId,
          ...form,
          used: false,
          effective: false,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

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
      {/* Header */}
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

      {/* Mitigation */}
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

      {/* Contingency */}
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

      {/* Owner */}
      <div>
        <label className="text-xs font-semibold text-slate-600">Owner</label>
        <select
          value={form.ownerId}
          onChange={(e) => setForm({ ...form, ownerId: e.target.value })}
          className="mt-1 border rounded-lg p-2 w-full text-sm bg-white"
        >
          <option value="">Unassigned</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {/* Notes toggle */}
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

      {/* Actions */}
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
          className={`px-4 py-1.5 rounded-lg text-sm text-white
            ${submitting ? "bg-indigo-300" : "bg-indigo-600 hover:bg-indigo-700"}
          `}
        >
          {submitting ? "Adding..." : "Add Mitigation"}
        </button>
      </div>
    </form>
  );
}
