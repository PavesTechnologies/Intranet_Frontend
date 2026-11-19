import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Compass, X } from "lucide-react";

import { useTour } from "./TourContext";
import { WELCOME_TOUR_ID } from "./tours";

/**
 * A small, polite prompt the first time someone opens a module whose tour they
 * haven't taken: "New to Leave Management? Take the tour". Shown once per
 * module per user — "Not now" or finishing the tour both retire it.
 * Never competes with the welcome tour or a running tour.
 */
export default function TourNudge() {
  const { recommendedTour, active, isCompleted, isDismissed, start, dismiss } = useTour();
  const [visibleId, setVisibleId] = useState(null);

  const eligible =
    recommendedTour
    && !active
    && !isCompleted(recommendedTour.id)
    && !isDismissed(recommendedTour.id)
    && (isCompleted(WELCOME_TOUR_ID) || isDismissed(WELCOME_TOUR_ID));

  const candidateId = eligible ? recommendedTour.id : null;

  useEffect(() => {
    setVisibleId(null);
    if (!candidateId) return undefined;
    const timer = setTimeout(() => setVisibleId(candidateId), 1500);
    return () => clearTimeout(timer);
  }, [candidateId]);

  const tour = visibleId && recommendedTour?.id === visibleId ? recommendedTour : null;
  const Icon = tour?.icon || Compass;

  return (
    <AnimatePresence>
      {tour && (
        <motion.aside
          key={tour.id}
          role="status"
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="fixed bottom-6 right-6 z-[9000] w-[340px] max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl border border-[#e4e8f2] bg-white"
          style={{ boxShadow: "0 20px 48px -12px rgba(8,21,52,0.35)" }}
        >
          <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #263383 0%, #B83280 60%, #ff3d72 100%)" }} />
          <div className="flex gap-3 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#263383] text-white">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-[#081534]">New to {tour.title}?</p>
              <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
                Take a quick {tour.steps.length}-step tour of what you can do here.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => start(tour.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#263383] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1d2870]"
                >
                  Take the tour <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => dismiss(tour.id)}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-[#081534]"
                >
                  Not now
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => dismiss(tour.id)}
              aria-label="Dismiss"
              className="h-fit rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
