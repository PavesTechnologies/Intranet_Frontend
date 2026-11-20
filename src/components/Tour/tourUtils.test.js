import { describe, expect, it } from "vitest";

import {
  computeCardPosition,
  loadTourProgress,
  resolveTour,
  saveTourProgress,
  spotlightRect,
  tourMatchesPath,
} from "./tourUtils";
import { TOURS } from "./tours";

const VIEWPORT = { width: 1440, height: 900 };
const CARD = { width: 360, height: 240 };

const memoryStorage = () => {
  const data = {};
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
};

/** ctx for a user holding exactly `roles` (case-insensitive, like AuthContext.hasRole). */
const ctxFor = (roles, { financeEnabled = true } = {}) => {
  const held = roles.map((r) => r.toUpperCase());
  return {
    user: { name: "Asha Rao" },
    firstName: "Asha",
    hasRole: (allowed) => allowed.some((r) => held.includes(String(r).toUpperCase())),
    hasAnyPermission: () => false,
    financeEnabled,
  };
};

const visibleTourIds = (ctx) => TOURS.filter((t) => !t.when || t.when(ctx)).map((t) => t.id);

describe("computeCardPosition", () => {
  it("places the card on the preferred side when it fits", () => {
    const target = { top: 100, left: 20, width: 48, height: 40 };
    const pos = computeCardPosition(target, CARD, VIEWPORT, "right");
    expect(pos.placement).toBe("right");
    expect(pos.left).toBe(20 + 48 + 16);
  });

  it("flips to the opposite side when the preferred side has no room", () => {
    const target = { top: 820, left: 600, width: 100, height: 40 };
    const pos = computeCardPosition(target, CARD, VIEWPORT, "bottom");
    expect(pos.placement).toBe("top");
    expect(pos.top + CARD.height).toBeLessThanOrEqual(target.top);
  });

  it("keeps the card inside the viewport horizontally", () => {
    const target = { top: 10, left: 1400, width: 30, height: 30 };
    const pos = computeCardPosition(target, CARD, VIEWPORT, "bottom");
    expect(pos.left + CARD.width).toBeLessThanOrEqual(VIEWPORT.width - 16);
    expect(pos.arrowOffset).toBeGreaterThan(0);
  });

  it("docks inside very large targets", () => {
    const target = { top: 60, left: 88, width: 1352, height: 840 };
    const pos = computeCardPosition(target, CARD, VIEWPORT, "inside");
    expect(pos.placement).toBe("inside");
    expect(pos.arrowOffset).toBeNull();
    expect(pos.left + CARD.width).toBeLessThanOrEqual(VIEWPORT.width);
  });
});

describe("spotlightRect", () => {
  it("pads the target and clamps it to the viewport", () => {
    const hole = spotlightRect({ top: 0, left: 0, width: 50, height: 50 }, VIEWPORT, 8);
    expect(hole.left).toBe(4);
    expect(hole.top).toBe(4);
    expect(hole.width).toBe(54);
  });
});

describe("tour progress storage", () => {
  it("round-trips per user and tolerates garbage", () => {
    const storage = memoryStorage();
    saveTourProgress("42", { completed: { welcome: 1 }, dismissed: {} }, storage);
    expect(loadTourProgress("42", storage).completed.welcome).toBe(1);
    expect(loadTourProgress("43", storage).completed).toEqual({});
    storage.setItem("paves.tours.v1:44", "{not json");
    expect(loadTourProgress("44", storage)).toEqual({ completed: {}, dismissed: {} });
  });
});

describe("tour catalogue", () => {
  it("every tour has a unique id, a title and at least one step", () => {
    const ids = TOURS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    TOURS.forEach((t) => {
      expect(t.title).toBeTruthy();
      expect(t.steps.length).toBeGreaterThan(0);
    });
  });

  it("a General employee gets the everyday tours but no admin or finance-admin ones", () => {
    const ids = visibleTourIds(ctxFor(["General"]));
    expect(ids).toEqual(expect.arrayContaining(["welcome", "leave", "timesheets", "projects", "employee-onboarding"]));
    expect(ids).not.toContain("user-management");
    expect(ids).not.toContain("resource-management");
    expect(ids).not.toContain("account-receivable");
  });

  it("hides every finance tour when the Finance workspace is switched off", () => {
    const ids = visibleTourIds(ctxFor(["Super_Admin", "Finance_Executive", "General"], { financeEnabled: false }));
    ["finance", "expense-management", "accounts-payable", "account-receivable"].forEach((id) => expect(ids).not.toContain(id));
  });

  it("personalises the welcome tour and only lists modules the user can open", () => {
    const welcome = resolveTour(TOURS.find((t) => t.id === "welcome"), ctxFor(["General"]));
    expect(welcome.steps[0].title).toContain("Asha");
    const nav = welcome.steps.find((s) => s.target === '[data-tour="sidebar-nav"]');
    const labels = nav.items.map((i) => i.label);
    expect(labels).toContain("Leave Management");
    expect(labels).not.toContain("User Management");
    // App switcher step only when the Finance workspace exists for this user.
    const hasSwitcher = (t) => t.steps.some((s) => s.target === '[data-tour="header-app-switcher"]');
    expect(hasSwitcher(welcome)).toBe(true); // General claims expenses → Finance access
    const noFinance = resolveTour(TOURS.find((t) => t.id === "welcome"), ctxFor(["General"], { financeEnabled: false }));
    expect(hasSwitcher(noFinance)).toBe(false);
  });

  it("drops a page step whose route resolves to null for this role", () => {
    const airs = resolveTour(TOURS.find((t) => t.id === "ai-screening"), ctxFor(["HR"]));
    expect(airs.steps.some((s) => s.target === '[data-tour="main-content"]')).toBe(false);
    const recruiter = resolveTour(TOURS.find((t) => t.id === "ai-screening"), ctxFor(["Recruiter"]));
    expect(recruiter.steps.find((s) => s.target === '[data-tour="main-content"]').route).toBe("/ai-screening/dashboard");
  });

  it("matches tours to module paths", () => {
    const leave = TOURS.find((t) => t.id === "leave");
    expect(tourMatchesPath(leave, "/leave-management/manager")).toBe(true);
    expect(tourMatchesPath(leave, "/timesheets")).toBe(false);
  });
});
