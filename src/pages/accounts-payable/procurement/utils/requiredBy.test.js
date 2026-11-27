import { describe, it, expect, vi, afterEach } from "vitest";
import {
  REQUIRED_BY_IN_PAST_MESSAGE,
  getRequiredByApiError,
  isRequiredByInPast,
  todayIsoDate,
} from "./requiredBy";

afterEach(() => vi.useRealTimers());

describe("requiredBy", () => {
  it("uses the local calendar day for today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 23, 1, 30)); // 23-Sep-2026 01:30 local
    expect(todayIsoDate()).toBe("2026-09-23");
  });

  it("allows today and future dates, blocks past dates", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 23, 12, 0));
    expect(isRequiredByInPast("2026-09-23")).toBe(false);
    expect(isRequiredByInPast("2026-09-24")).toBe(false);
    expect(isRequiredByInPast("2026-09-22")).toBe(true);
    expect(isRequiredByInPast("2026-09-21")).toBe(true);
    expect(isRequiredByInPast("")).toBe(false);
  });

  it("extracts the backend 422 Required By message only", () => {
    const err422 = { response: { status: 422, data: { detail: REQUIRED_BY_IN_PAST_MESSAGE } } };
    expect(getRequiredByApiError(err422)).toBe(REQUIRED_BY_IN_PAST_MESSAGE);
    expect(
      getRequiredByApiError({ response: { status: 422, data: { detail: "Purchase category is invalid" } } }),
    ).toBeNull();
    expect(
      getRequiredByApiError({ response: { status: 403, data: { detail: REQUIRED_BY_IN_PAST_MESSAGE } } }),
    ).toBeNull();
  });
});
