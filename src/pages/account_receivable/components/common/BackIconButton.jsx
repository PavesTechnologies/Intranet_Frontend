import { ArrowLeft } from "lucide-react";

import Button from "../../../../components/Button/Button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../../components/ui/tooltip";

// Single icon-only back control used across every AR screen/wizard/drawer so
// "go back" always looks and behaves the same way, with the destination
// surfaced via a hover tooltip instead of inline text.
export default function BackIconButton({ onClick, label = "Go back", disabled = false, className = "" }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            className={`rounded-full border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 ${className}`}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
