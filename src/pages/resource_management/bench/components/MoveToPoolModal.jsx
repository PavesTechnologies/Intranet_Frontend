import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { POOL_OPTIONS } from "../constants/benchConstants";

const baseForm = {
  poolType: "CoE",
  reason: "",
};

const MoveToPoolModal = ({ open, resources = [], onClose, onSubmit }) => {
  const [form, setForm] = useState(baseForm);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(baseForm);
    setError("");
  }, [open]);

  if (!open) return null;

  const handleSubmit = () => {
    if (!form.reason.trim()) {
      setError("Reason is required.");
      return;
    }
    onSubmit({
      poolType: form.poolType,
      reason: form.reason.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 animate-in fade-in duration-300">
      <div className="w-full max-w-lg rounded-2xl border border-white/20 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-5">
          <div>
            <p className="text-lg font-bold text-slate-800 tracking-tight">Transition to Internal Pool</p>
            <p className="text-[12px] font-medium text-slate-500 mt-0.5">{resources.length > 1 ? `${resources.length} resources selected` : resources[0]?.name}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 transition-all hover:bg-slate-200 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6 bg-white">
          <div className="group">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-focus-within:text-indigo-600 transition-colors">Target Pool Environment</label>
            <div className="relative mt-2">
              <select
                value={form.poolType}
                onChange={(event) => setForm((prev) => ({ ...prev, poolType: event.target.value }))}
                className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 outline-none transition-all hover:border-slate-300 focus:border-indigo-500 focus:bg-indigo-50/30 focus:ring-2 focus:ring-indigo-500/20"
              >
                {POOL_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          <div className="group">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-focus-within:text-indigo-600 transition-colors">Transition Strategy / Justification</label>
            <textarea
              rows={4}
              value={form.reason}
              onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
              placeholder="Provide business context for this horizontal move..."
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium text-slate-700 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:bg-indigo-50/30 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-5">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-[12px] font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 focus:ring-2 focus:ring-slate-200 focus:ring-offset-1">
            CANCEL
          </button>
          <button type="button" onClick={handleSubmit} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-[12px] font-bold text-white shadow-md shadow-indigo-500/20 transition-all hover:from-indigo-700 hover:to-indigo-600 hover:shadow-lg focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 active:scale-[0.98]">
            EXECUTE TRANSFER
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoveToPoolModal;
