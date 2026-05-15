import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

const getToday = () => new Date().toISOString().slice(0, 10);

const baseForm = {
  project: "",
  allocation: "100",
  startDate: getToday(),
};

const AllocateModal = ({ open, resources = [], onClose, onSubmit }) => {
  const [form, setForm] = useState(baseForm);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(baseForm);
    setError("");
  }, [open]);

  if (!open) return null;

  const handleSubmit = () => {
    const allocation = Number(form.allocation);
    if (!form.project.trim()) {
      setError("Project is required.");
      return;
    }
    if (!allocation || allocation <= 0 || allocation > 100) {
      setError("Allocation must be between 1 and 100.");
      return;
    }
    if (!form.startDate) {
      setError("Start date is required.");
      return;
    }

    onSubmit({
      project: form.project.trim(),
      allocation,
      startDate: form.startDate,
    });
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/30 px-4">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <p className="text-lg font-bold text-[#081534]">Allocate Resource</p>
            <p className="text-sm text-slate-500">{resources.length > 1 ? `${resources.length} resources selected` : resources[0]?.name}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div>
            <label className="text-[11px] font-semibold capitalize tracking-[0.16em] text-gray-500">Project</label>
            <input
              type="text"
              value={form.project}
              onChange={(event) => setForm((prev) => ({ ...prev, project: event.target.value }))}
              placeholder="Enter project name"
              className="mt-1.5 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold capitalize tracking-[0.16em] text-gray-500">Allocation %</label>
              <input
                type="number"
                min="1"
                max="100"
                value={form.allocation}
                onWheel={(e) => e.target.blur()}
                onChange={(event) => setForm((prev) => ({ ...prev, allocation: event.target.value }))}
                className="mt-1.5 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold capitalize tracking-[0.16em] text-gray-500">Start Date</label>
              <input
                type="date"
                min={getToday()}
                value={form.startDate}
                onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
                className="mt-1.5 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-4">
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} className="h-10 rounded-md bg-[#081534] px-4 text-sm font-medium text-white transition-colors hover:bg-[#10214f]">
            Confirm Allocation
          </button>
        </div>
      </div>
    </div>
  );
};

export default AllocateModal;

