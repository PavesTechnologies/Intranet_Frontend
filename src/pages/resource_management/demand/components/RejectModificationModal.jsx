import React, { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const RejectModificationModal = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  modification,
}) => {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    setReason("");
  }, [isOpen]);

  const handleSubmit = async (event) => {
    event?.preventDefault?.();
    await onSubmit(reason.trim());
  };

  if (!isOpen || !modification) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600 shadow-lg shadow-rose-200">
              <AlertTriangle className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black leading-none tracking-tight text-slate-900">
                Reject Modification
              </h2>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                Request #{modification.id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="rounded-2xl border border-rose-100 bg-rose-50/60 px-4 py-3">
            <p className="text-xs font-semibold text-rose-700">
              {modification.resourceName || "Selected resource"} requested a change from{" "}
              {modification.currentAllocationPercentage}% to{" "}
              {modification.requestedAllocationPercentage}%.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              Rejection Reason
            </label>
            <textarea
              rows={4}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain why this request is being rejected (optional)..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </form>

        <div className="flex gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-10 flex-1 rounded-xl border-slate-200 text-[10px] font-bold tracking-widest text-slate-500 hover:bg-white"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="h-10 flex-[2] rounded-xl bg-rose-600 text-[10px] font-black tracking-widest text-white shadow-xl shadow-rose-600/20 hover:bg-rose-700"
          >
            {isSubmitting ? "Processing..." : "Reject Modification"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RejectModificationModal;
