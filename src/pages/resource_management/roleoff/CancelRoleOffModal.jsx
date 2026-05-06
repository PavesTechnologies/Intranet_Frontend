import React from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const CancelRoleOffModal = ({
  open,
  record,
  isSubmitting = false,
  onClose,
  onSubmit,
}) => {
  if (!open || !record) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Cancel Role-Off
            </p>
            <h2 className="mt-1 text-lg font-bold text-[#081534]">{record.resource}</h2>
            <p className="mt-1 text-sm text-gray-500">
              {record.project} · {record.role}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5">
          <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <p>Are you sure you want to cancel this role-off request?</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-10 border-gray-300 bg-white text-sm"
          >
            No
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="h-10 bg-rose-600 text-sm text-white hover:bg-rose-700"
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? "Cancelling..." : "Yes, Cancel"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CancelRoleOffModal;
