import React from "react";
import { X } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import Button from "@/components/Button/Button";

// Sheet's own SheetContent ships a default `w-3/4 sm:max-w-sm`. Plain class
// concatenation doesn't reliably let a later class win over an earlier one
// with equal Tailwind specificity, so every drawer width below is forced
// with `!important` to guarantee it actually applies.
export const DRAWER_WIDTH_CREATE = "sm:!w-[40vw] sm:!max-w-[40vw]";
export const DRAWER_WIDTH_EDIT = "sm:!w-[45vw] sm:!max-w-[45vw]";
export const DRAWER_WIDTH_PREVIEW = "sm:!w-[45vw] sm:!max-w-[45vw]";

/**
 * Shared right-side slide-over chrome for every Policy Engine editing
 * surface (Bundle, Rule Builder, Group + Members, Assignment). Wraps the
 * otherwise-unused Sheet/SheetContent primitives with the app's own
 * hex-based light styling instead of their default CSS-variable theme.
 */
export default function PolicyDrawer({ open, onClose, title, subtitle, children, footer, widthClassName = DRAWER_WIDTH_EDIT }) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        className={`flex !w-full max-w-full flex-col border-l border-gray-200 bg-white p-0 text-gray-900 shadow-2xl ${widthClassName}`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-[#0a174e]">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
          </div>
          <Button
            type="button"
            variant="link"
            size="icon"
            className="h-8 w-8 shrink-0 p-0 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && <div className="border-t border-gray-100 px-6 py-4">{footer}</div>}
      </SheetContent>
    </Sheet>
  );
}
