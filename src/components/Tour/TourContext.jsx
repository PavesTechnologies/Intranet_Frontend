import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import { useAuth } from "../../contexts/AuthContext";
import { isFinanceEnabled } from "../../utils/applicationRoutes";
import { TOURS, WELCOME_TOUR_ID } from "./tours";
import {
  clearTourProgress,
  getUserKey,
  loadTourProgress,
  resolveTour,
  saveTourProgress,
  tourMatchesPath,
} from "./tourUtils";

/**
 * Tour engine state for the authenticated app shell (mounted in Layout).
 *
 * Holds which tour is running and on which step, and remembers per user
 * (localStorage, browser-local — nothing is written to the backend) which
 * tours were completed or dismissed. The overlay, Tour Center and nudge are
 * pure consumers of this context.
 */
const TourContext = createContext(null);

const NOOP_TOUR = {
  tours: [],
  active: null,
  step: null,
  index: 0,
  total: 0,
  direction: 1,
  recommendedTour: null,
  isCompleted: () => false,
  isDismissed: () => false,
  start: () => {},
  next: () => {},
  prev: () => {},
  goTo: () => {},
  stop: () => {},
  skipMissingStep: () => {},
  dismiss: () => {},
  resetProgress: () => {},
  completedCount: 0,
};

/** Safe outside a TourProvider (e.g. components rendered alone in tests). */
export const useTour = () => useContext(TourContext) ?? NOOP_TOUR;

export function TourProvider({ children, autoStartWelcome = true }) {
  const { user, hasRole, hasAnyPermission } = useAuth();
  const location = useLocation();
  const userKey = getUserKey(user);

  const fullName = String(user?.name || "").trim();
  const ctx = {
    user,
    firstName: fullName ? fullName.split(" ")[0] : "",
    hasRole,
    hasAnyPermission: hasAnyPermission || (() => false),
    financeEnabled: isFinanceEnabled(),
  };

  // Tours this user may take at all (tour-level `when`). Steps are resolved on start.
  const tours = TOURS.filter((tour) => !tour.when || tour.when(ctx));
  const tourIdsKey = tours.map((t) => t.id).join("|");

  const [progress, setProgress] = useState(() => loadTourProgress(userKey));
  useEffect(() => {
    setProgress(loadTourProgress(userKey));
  }, [userKey]);

  const updateProgress = useCallback(
    (mutate) => {
      setProgress((prev) => {
        const nextProgress = mutate({ completed: { ...prev.completed }, dismissed: { ...prev.dismissed } });
        saveTourProgress(userKey, nextProgress);
        return nextProgress;
      });
    },
    [userKey],
  );

  const [active, setActive] = useState(null); // resolved tour
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  // ctx changes identity every render; keep the latest in a ref for callbacks.
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const toursRef = useRef(tours);
  toursRef.current = tours;

  const start = useCallback((tourId) => {
    const definition = toursRef.current.find((t) => t.id === tourId);
    const resolved = resolveTour(definition, ctxRef.current);
    if (!resolved || resolved.steps.length === 0) return;
    setDirection(1);
    setIndex(0);
    setActive(resolved);
  }, []);

  const activeRef = useRef(active);
  activeRef.current = active;

  const stop = useCallback(
    (reason = "dismissed") => {
      const current = activeRef.current;
      if (!current) return;
      updateProgress((p) => {
        if (reason === "completed") p.completed[current.id] = Date.now();
        else p.dismissed[current.id] = Date.now();
        return p;
      });
      setActive(null);
    },
    [updateProgress],
  );

  const goTo = useCallback(
    (target) => {
      if (!active) return;
      if (target >= active.steps.length) {
        stop("completed");
        return;
      }
      if (target < 0) return;
      setDirection(target >= index ? 1 : -1);
      setIndex(target);
    },
    [active, index, stop],
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  /** Called by the overlay when a step's target isn't on screen for this user. */
  const skipMissingStep = useCallback(() => {
    if (!active) return;
    const target = index + direction;
    if (target < 0) {
      // Nothing earlier to show — go forward instead of getting stuck.
      setDirection(1);
      setIndex(index + 1 < active.steps.length ? index + 1 : index);
      return;
    }
    goTo(target);
  }, [active, index, direction, goTo]);

  /** Nudge dismissal (without having run the tour). */
  const dismiss = useCallback(
    (tourId) => updateProgress((p) => {
      p.dismissed[tourId] = Date.now();
      return p;
    }),
    [updateProgress],
  );

  const resetProgress = useCallback(() => {
    clearTourProgress(userKey);
    setProgress({ completed: {}, dismissed: {} });
  }, [userKey]);

  const isCompleted = useCallback((id) => Boolean(progress.completed[id]), [progress]);
  const isDismissed = useCallback((id) => Boolean(progress.dismissed[id]), [progress]);

  // First visit: offer the welcome tour once per user on the dashboard.
  useEffect(() => {
    if (!autoStartWelcome || !user || active) return undefined;
    if (location.pathname !== "/dashboard") return undefined;
    if (progress.completed[WELCOME_TOUR_ID] || progress.dismissed[WELCOME_TOUR_ID]) return undefined;
    const timer = setTimeout(() => start(WELCOME_TOUR_ID), 1200);
    return () => clearTimeout(timer);
  }, [autoStartWelcome, user, active, location.pathname, progress, start]);

  const recommendedTour = useMemo(
    () => tours.find((t) => t.id !== WELCOME_TOUR_ID && tourMatchesPath(t, location.pathname)) ?? null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tourIdsKey, location.pathname],
  );

  const completedCount = tours.filter((t) => progress.completed[t.id]).length;

  const value = {
    tours,
    active,
    step: active ? active.steps[index] : null,
    index,
    total: active ? active.steps.length : 0,
    direction,
    recommendedTour,
    isCompleted,
    isDismissed,
    start,
    next,
    prev,
    goTo,
    stop,
    skipMissingStep,
    dismiss,
    resetProgress,
    completedCount,
  };

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}
