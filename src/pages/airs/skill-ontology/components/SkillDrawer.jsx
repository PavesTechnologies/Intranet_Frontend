import React from "react";
import { X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../../../../components/ui/sheet";

// Shared drawer chrome reused by AddSkillDrawer and BulkImportDrawer — keeps
// title/subtitle/width/close/footer consistent across the module's drawers.
// (Edit uses the centered global Modal instead — see EditSkillModal.jsx.)
export default function SkillDrawer({ open, onClose, title, subtitle, width = "max-w-lg", children, footer }) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      {open && (
        <SheetContent className={`bg-white text-slate-900 w-full ${width} p-0 overflow-hidden flex flex-col`}>
          <SheetHeader className="p-5 border-b border-slate-200 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle className="text-[15px] font-bold text-slate-900">{title}</SheetTitle>
                {subtitle && <SheetDescription className="text-[12px] text-slate-400 mt-0.5">{subtitle}</SheetDescription>}
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 shrink-0">
                <X size={16} className="text-slate-500" />
              </button>
            </div>
          </SheetHeader>

          <div className="p-5 space-y-4 overflow-y-auto flex-1">{children}</div>

          {footer && <div className="p-5 border-t border-slate-200 shrink-0 flex justify-end gap-2">{footer}</div>}
        </SheetContent>
      )}
    </Sheet>
  );
}
