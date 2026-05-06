import React from "react";
import { RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const RoleOffFilterPanel = ({
  collapsed,
  filters,
  onChange,
  onReset,
  onApply,
  onClose,
  mode,
}) => {
  if (collapsed) return null;

  return (
    <div className="w-[360px] rounded-lg border border-gray-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div>
          <p className="text-sm font-bold text-[#081534]">Filters</p>
          <p className="text-xs text-gray-500">Refine the role-off queue</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
            Impact
          </label>
          <select
            value={filters.impact}
            onChange={(event) => onChange("impact", event.target.value)}
            className="mt-1.5 h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
          >
            <option value="">All Impact Levels</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>

        {mode !== "pm" ? (
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(event) => onChange("status", event.target.value)}
              className="mt-1.5 h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="Pending Approval">Pending Approval</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        ) : (
          <div />
        )}

          <div className="col-span-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
            Reason
          </label>
          <select
            value={filters.reason}
            onChange={(event) => onChange("reason", event.target.value)}
            className="mt-1.5 h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
          >
            <option value="">All Reasons</option>
            <option value="Project Completion">Project Completion</option>
            <option value="Client Ramp Down">Client Ramp Down</option>
            <option value="Performance Issue">Performance Issue</option>
            <option value="Budget Realignment">Budget Realignment</option>
            <option value="Critical Dependency">Critical Dependency</option>
            <option value="Emergency Transition">Emergency Transition</option>
          </select>
        </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onReset}
            className="h-9 flex-1 border-gray-300 bg-white text-sm"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset Filters
          </Button>
          <Button
            onClick={onApply}
            className="h-9 flex-1 bg-[#081534] text-sm text-white hover:bg-[#10214f]"
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RoleOffFilterPanel;
