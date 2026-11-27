/**
 * Pure helpers for the Paves guided-tour system (no React, no DOM writes) so
 * they can be unit-tested in isolation — see tourUtils.test.js.
 *
 *  - resolveTour()          → turns a tour definition into the concrete step list
 *                             for the signed-in user (role filters, dynamic text,
 *                             per-step routes).
 *  - computeCardPosition()  → places the tooltip card next to the highlighted
 *                             element, flipping sides when there is no room.
 *  - spotlightRect()        → padded, viewport-clamped cut-out around a target.
 *  - load/saveTourProgress  → per-user completion state in localStorage.
 */

const STORAGE_PREFIX = "paves.tours.v1:";

const EMPTY_PROGRESS = Object.freeze({ completed: {}, dismissed: {} });

const resolveValue = (value, ctx) => (typeof value === "function" ? value(ctx) : value);

/**
 * Resolves a tour definition for the current user.
 *
 * Step contract (all optional except title):
 *   when(ctx)      → false hides the step for this user (role gating).
 *   route          → string | (ctx) => string | null. Page the step lives on;
 *                    defaults to the tour's `home`. A function returning null
 *                    drops the step (the user has no page to be shown there).
 *   target         → CSS selector to spotlight. Omit for a centred "hero" card.
 *   title/body/tip/items/flow → string/array, or (ctx) => value.
 */
export function resolveTour(tour, ctx) {
  if (!tour) return null;
  const home = resolveValue(tour.home, ctx) ?? null;

  const steps = tour.steps
    .filter((step) => !step.when || step.when(ctx))
    .map((step) => {
      const hasOwnRoute = Object.prototype.hasOwnProperty.call(step, "route");
      const route = hasOwnRoute ? resolveValue(step.route, ctx) : home;
      return {
        ...step,
        route,
        dropped: hasOwnRoute && route === null,
        title: resolveValue(step.title, ctx),
        body: resolveValue(step.body, ctx),
        tip: resolveValue(step.tip, ctx),
        items: (resolveValue(step.items, ctx) || []).filter(Boolean),
        flow: resolveValue(step.flow, ctx) || null,
      };
    })
    // `requireItems`: a menu step with nothing to list for this user is skipped.
    .filter((step) => !step.dropped && !(step.requireItems && step.items.length === 0));

  return { ...tour, home, steps };
}

/** Does `pathname` belong to this tour's module? Used for recommendations and nudges. */
export function tourMatchesPath(tour, pathname) {
  if (!tour?.match || !pathname) return false;
  return tour.match.some((prefix) => pathname.startsWith(prefix));
}

export function stripQuery(route) {
  return typeof route === "string" ? route.split("?")[0].split("#")[0] : route;
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));

/** Padded cut-out around the target, kept inside the viewport. */
export function spotlightRect(rect, viewport, padding = 8) {
  if (!rect) return null;
  const left = clamp(rect.left - padding, 4, viewport.width - 4);
  const top = clamp(rect.top - padding, 4, viewport.height - 4);
  const right = clamp(rect.left + rect.width + padding, 4, viewport.width - 4);
  const bottom = clamp(rect.top + rect.height + padding, 4, viewport.height - 4);
  return { left, top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

const FALLBACK_ORDER = {
  top: ["top", "bottom", "right", "left"],
  bottom: ["bottom", "top", "right", "left"],
  left: ["left", "right", "bottom", "top"],
  right: ["right", "left", "bottom", "top"],
};

/**
 * Places a card of `card` size next to `target` (a DOMRect-like box) inside
 * `viewport`. Tries the preferred side first, then the fallbacks. If the target
 * is so large that no side fits (e.g. the whole page area), the card floats
 * over the visible middle of the target and `placement` is "inside".
 *
 * Returns { top, left, placement, arrowOffset } where arrowOffset is the
 * distance along the card edge at which the pointer arrow should sit.
 */
export function computeCardPosition(target, card, viewport, preferred = "bottom", gap = 16, margin = 16) {
  const t = {
    top: target.top,
    left: target.left,
    width: target.width,
    height: target.height,
    right: target.left + target.width,
    bottom: target.top + target.height,
  };
  const fits = {
    top: t.top - gap - card.height >= margin,
    bottom: t.bottom + gap + card.height <= viewport.height - margin,
    left: t.left - gap - card.width >= margin,
    right: t.right + gap + card.width <= viewport.width - margin,
  };
  const order = FALLBACK_ORDER[preferred] || FALLBACK_ORDER.bottom;
  const placement = preferred === "inside" ? undefined : order.find((side) => fits[side]);
  const maxLeft = viewport.width - card.width - margin;
  const maxTop = viewport.height - card.height - margin;

  if (!placement) {
    // Dock in the top-right corner of the target's visible area, so the card
    // explains the region without covering the middle of it.
    const visibleTop = clamp(t.top, margin, viewport.height);
    const visibleRight = clamp(t.right, 0, viewport.width - margin);
    return {
      top: clamp(visibleTop + gap, margin, maxTop),
      left: clamp(visibleRight - card.width - gap, margin, maxLeft),
      placement: "inside",
      arrowOffset: null,
    };
  }

  const centerX = t.left + t.width / 2;
  const centerY = t.top + t.height / 2;

  if (placement === "top" || placement === "bottom") {
    const left = clamp(centerX - card.width / 2, margin, maxLeft);
    return {
      top: placement === "top" ? t.top - gap - card.height : t.bottom + gap,
      left,
      placement,
      arrowOffset: clamp(centerX - left, 24, card.width - 24),
    };
  }

  const top = clamp(centerY - card.height / 2, margin, maxTop);
  return {
    top,
    left: placement === "left" ? t.left - gap - card.width : t.right + gap,
    placement,
    arrowOffset: clamp(centerY - top, 24, card.height - 24),
  };
}

/** Rough reading time for a tour, shown in the Tour Center. */
export function estimateMinutes(stepCount) {
  return Math.max(1, Math.round((stepCount * 20) / 60));
}

export function getUserKey(user) {
  return String(user?.employee_id ?? user?.user_id ?? user?.sub ?? user?.email ?? "anonymous");
}

export function loadTourProgress(userKey, storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(STORAGE_PREFIX + userKey);
    if (!raw) return { completed: {}, dismissed: {} };
    const parsed = JSON.parse(raw);
    return {
      completed: parsed?.completed && typeof parsed.completed === "object" ? parsed.completed : {},
      dismissed: parsed?.dismissed && typeof parsed.dismissed === "object" ? parsed.dismissed : {},
    };
  } catch {
    return { ...EMPTY_PROGRESS, completed: {}, dismissed: {} };
  }
}

export function saveTourProgress(userKey, progress, storage = globalThis.localStorage) {
  try {
    storage?.setItem(STORAGE_PREFIX + userKey, JSON.stringify(progress));
  } catch {
    // Private mode / quota — the tour still works, it just won't remember.
  }
}

export function clearTourProgress(userKey, storage = globalThis.localStorage) {
  try {
    storage?.removeItem(STORAGE_PREFIX + userKey);
  } catch {
    // ignore
  }
}
