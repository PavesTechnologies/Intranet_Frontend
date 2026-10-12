import { ArrowLeft } from "lucide-react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../../components/ui/tooltip";

// Single icon-only back control used across every AR screen/wizard/drawer so
// "go back" always looks and behaves the same way, with the destination
// surfaced via a hover tooltip instead of inline text.
export default function BackIconButton({ onClick, label = "Go back", disabled = false, className = "" }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            className={`inline-flex items-center justify-center h-8 w-8 rounded-full border border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800 transition active:scale-95 shadow-2xs ${className}`}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
