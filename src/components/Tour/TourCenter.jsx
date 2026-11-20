import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Compass, PlayCircle, RotateCcw, Sparkles } from "lucide-react";

import { useTour } from "./TourContext";
import { TOUR_GROUPS } from "./tours";
import { estimateMinutes } from "./tourUtils";

const PINK = "#ff3d72";

function ProgressRing({ value, total }) {
  const size = 44;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total ? value / total : 0;
  return (
    <div className="relative h-11 w-11 shrink-0" aria-label={`${value} of ${total} tours completed`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.18)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={PINK}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white">
        {value}/{total}
      </span>
    </div>
  );
}

function TourRow({ tour, completed, onStart, highlighted = false }) {
  const Icon = tour.icon || Compass;
  const steps = tour.steps.length;
  return (
    <button
      type="button"
      onClick={onStart}
      className={`group flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
        highlighted
          ? "border-[#263383]/30 bg-gradient-to-r from-[#f4f6fc] to-[#fff5f8] hover:border-[#263383]"
          : "border-transparent hover:border-[#e4e8f2] hover:bg-[#fafbfd]"
      }`}
    >
      <span
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
          highlighted ? "bg-[#263383] text-white" : "bg-[#f4f6fc] text-[#263383] group-hover:bg-[#263383] group-hover:text-white"
        }`}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[13px] font-semibold text-[#081534]">{tour.title}</span>
          {completed ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-px text-[10px] font-semibold text-emerald-700">
              <Check className="h-2.5 w-2.5" /> Done
            </span>
          ) : (
            <span className="rounded-full bg-[#fff0f5] px-1.5 py-px text-[10px] font-semibold text-[#B83280]">New</span>
          )}
        </span>
        <span className="mt-0.5 line-clamp-2 block text-[11.5px] leading-snug text-gray-500">{tour.summary}</span>
        <span className="mt-1 block text-[10.5px] text-gray-400">
          ~{steps} steps · {estimateMinutes(steps)} min
        </span>
      </span>
      <span className="mt-2 flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[#263383] opacity-0 transition-opacity group-hover:opacity-100">
        {completed ? <RotateCcw className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}
        {completed ? "Replay" : "Start"}
      </span>
    </button>
  );
}

/**
 * Header button that opens the Tour Center: every tour this user can take,
 * grouped by workspace, with completion state and a recommendation for the
 * page they're on.
 */
export default function TourCenter() {
  const { tours, start, isCompleted, recommendedTour, completedCount, resetProgress, active } = useTour();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (active) setOpen(false);
  }, [active]);

  if (!tours.length) return null;

  const launch = (id) => {
    setOpen(false);
    start(id);
  };

  const showDot = recommendedTour && !isCompleted(recommendedTour.id);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        data-tour="header-tour"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Guided tours"
        className={`relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold transition-colors ${
          open ? "bg-[#f4f6fc] text-[#263383]" : "text-gray-700 hover:bg-gray-100 hover:text-[#263383]"
        }`}
      >
        <Compass className="h-[18px] w-[18px]" />
        <span className="hidden lg:inline">Guide</span>
        {showDot && (
          <span className="absolute right-1 top-1 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff3d72] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ff3d72]" />
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Tour Center"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-2 w-[380px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-gray-200 bg-white"
            style={{ boxShadow: "0 18px 48px -12px rgba(8,21,52,0.35)" }}
          >
            <div
              className="relative overflow-hidden px-5 py-4 text-white"
              style={{ background: "linear-gradient(135deg, #081534 0%, #263383 60%, #B83280 100%)" }}
            >
              <span className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/10" aria-hidden="true" />
              <div className="relative flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">Paves Tour Center</p>
                  <p className="mt-0.5 font-heading text-base font-semibold">Learn the intranet, your way</p>
                  <p className="mt-0.5 text-[11.5px] text-white/75">Short, interactive walkthroughs tailored to your role.</p>
                </div>
                <ProgressRing value={completedCount} total={tours.length} />
              </div>
            </div>

            <div className="max-h-[min(60vh,520px)] overflow-y-auto px-3 py-3">
              {recommendedTour && (
                <div className="mb-3">
                  <p className="mb-1.5 flex items-center gap-1 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B83280]">
                    <Sparkles className="h-3 w-3" /> Recommended for this page
                  </p>
                  <TourRow
                    tour={recommendedTour}
                    completed={isCompleted(recommendedTour.id)}
                    onStart={() => launch(recommendedTour.id)}
                    highlighted
                  />
                </div>
              )}

              {TOUR_GROUPS.map((group) => {
                const groupTours = tours.filter((t) => t.group === group.id);
                if (!groupTours.length) return null;
                return (
                  <div key={group.id} className="mb-2">
                    <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">{group.label}</p>
                    <div className="space-y-0.5">
                      {groupTours.map((t) => (
                        <TourRow key={t.id} tour={t} completed={isCompleted(t.id)} onStart={() => launch(t.id)} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 bg-[#fafbfd] px-4 py-2.5">
              <span className="text-[10.5px] text-gray-400">
                <kbd className="font-sans font-semibold text-gray-500">←</kbd>{" "}
                <kbd className="font-sans font-semibold text-gray-500">→</kbd> navigate ·{" "}
                <kbd className="font-sans font-semibold text-gray-500">Esc</kbd> exit
              </span>
              {completedCount > 0 && (
                <button
                  type="button"
                  onClick={resetProgress}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 transition-colors hover:text-[#B83280]"
                >
                  <RotateCcw className="h-3 w-3" /> Reset progress
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
