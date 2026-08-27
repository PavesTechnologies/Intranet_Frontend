import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

import Button from "../../../../components/Button/Button";
import { Fonts } from "../../../../components/Fonts/Fonts";

/**
 * Compact floating "quick view" card shared by every Master Data "View
 * Details" action. Sized to its content and anchored near the bottom-center
 * of the screen — a focused card, not a full-screen sheet — so the page
 * behind it stays visible. Mirrors Modal's close-button conventions; the
 * tinted header + optional status badge give it a distinct, polished look
 * versus a plain white panel.
 */
export default function DetailsDrawer({ isOpen, onClose, title, subtitle, badge, children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const raf = requestAnimationFrame(() => setMounted(true));
      return () => cancelAnimationFrame(raf);
    }
    setMounted(false);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center px-4 pb-6 sm:pb-10"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`fixed inset-0 bg-slate-900/30 transition-opacity duration-300 ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <div
        className={`relative flex w-full max-h-[75vh] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl transition-all duration-300 ease-out sm:w-[560px] ${
          mounted ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        }`}
      >
        <div className="shrink-0 border-b border-slate-100 bg-gradient-to-b from-[#0A0082]/[0.06] to-white px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              {title && <h2 className={`${Fonts.heading4} truncate`}>{title}</h2>}
              {subtitle && <p className="truncate text-sm text-slate-500">{subtitle}</p>}
              {badge && <div className="pt-0.5">{badge}</div>}
            </div>
            <Button
              type="button"
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 p-0"
              aria-label="Close details"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto px-5 py-2">{children}</div>
      </div>
    </div>
  );
}
