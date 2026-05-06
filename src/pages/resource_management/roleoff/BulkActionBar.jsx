import React from "react";
import { Layers3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const BulkActionBar = ({ count, title, description, actions = [], onClear }) => {
  if (count < 2) return null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-white text-blue-700 shadow-sm">
          <Layers3 className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#081534]">
            {title || `${count} items selected`}
          </p>
          <p className="text-xs text-gray-600">
            {description || "Apply a bulk action to the current selection."}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={onClear}
          className="h-9 border-gray-300 bg-white text-xs"
        >
          Clear Selection
        </Button>
        {actions.map((action) => (
          <Button
            key={action.label}
            onClick={action.onClick}
            variant={action.variant || "default"}
            disabled={action.disabled}
            className={action.className || "h-9 bg-[#081534] text-xs hover:bg-[#10214f]"}
          >
            {action.loading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default BulkActionBar;
