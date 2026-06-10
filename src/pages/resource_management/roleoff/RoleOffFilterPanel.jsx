import React from "react";
import { RefreshIcon, CloseIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import FilterListbox from "../../../components/filter/FilterListbox";

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
          <p className="text-xs text-gray-500">Refine the roll-off queue</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
              Impact
            </label>
            <FilterListbox
              options={[
                { value: "", label: "All Impact Levels" },
                { value: "Low", label: "Low" },
                { value: "Medium", label: "Medium" },
                { value: "High", label: "High" },
              ]}
              value={filters.impact}
              onChange={(val) => onChange("impact", val)}
            />
          </div>

          {mode !== "pm" ? (
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                Status
              </label>
              <FilterListbox
                options={[
                  { value: "", label: "All Statuses" },
                  { value: "PENDING", label: "PENDING" },
                  { value: "APPROVED", label: "APPROVED" },
                  { value: "REJECTED", label: "REJECTED" },
                  { value: "FULFILLED", label: "FULFILLED" },
                  { value: "CANCELLED", label: "CANCELLED" },
                ]}
                value={filters.status}
                onChange={(val) => onChange("status", val)}
              />
            </div>
          ) : (
            <div />
          )}

          <div className="col-span-2">
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
              Reason
            </label>
            <FilterListbox
              options={[
                { value: "", label: "All Reasons" },
                { value: "Project Completion", label: "Project Completion" },
                { value: "Client Ramp Down", label: "Client Ramp Down" },
                { value: "Performance Issue", label: "Performance Issue" },
                { value: "Budget Realignment", label: "Budget Realignment" },
                { value: "Critical Dependency", label: "Critical Dependency" },
                { value: "Emergency Transition", label: "Emergency Transition" },
              ]}
              value={filters.reason}
              onChange={(val) => onChange("reason", val)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onReset}
            className="h-9 flex-1 border-gray-300 bg-white text-sm"
          >
            <RefreshIcon className="mr-2 h-4 w-4" />
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
