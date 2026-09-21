import { describe, it, expect } from "vitest";
import { formatDate, formatDateTime, formatTime } from "./formatters";

// The bug this guards: a naive backend timestamp ("2026-09-17T13:48:00", no "Z"/offset — see
// ap.audit_log.changed_at, a Postgres "timestamp without time zone" column) getting parsed by
// `new Date(x)` as already-local time instead of the UTC value it actually is, silently
// rendering hours off with no error. Rather than hardcoding an expected local-time string (which
// would only be correct on a machine running in one specific timezone), these assert that a
// timezone-less string produces the *same* result as its explicitly-UTC-suffixed equivalent —
// true in any timezone the test happens to run in, and false the moment normalization regresses.
describe("formatTime — naive datetime strings are treated as UTC, not local", () => {
  it("renders identically whether the string carries a Z suffix or not", () => {
    expect(formatTime("2026-09-17T13:48:00")).toBe(formatTime("2026-09-17T13:48:00Z"));
  });

  it("renders identically for an explicit +00:00 offset", () => {
    expect(formatTime("2026-09-17T13:48:00")).toBe(formatTime("2026-09-17T13:48:00+00:00"));
  });

  it("does not collapse two genuinely different UTC instants to the same time", () => {
    expect(formatTime("2026-09-17T13:48:00")).not.toBe(formatTime("2026-09-17T15:49:00"));
  });

  it("returns the placeholder for empty input", () => {
    expect(formatTime(null)).toBe("—");
    expect(formatTime(undefined)).toBe("—");
  });

  it("returns the placeholder for unparsable input", () => {
    expect(formatTime("not-a-date")).toBe("—");
  });
});

describe("formatDateTime — same UTC normalization", () => {
  it("renders identically whether the string carries a Z suffix or not", () => {
    expect(formatDateTime("2026-09-17T13:48:00")).toBe(formatDateTime("2026-09-17T13:48:00Z"));
  });
});

describe("formatDate — a bare date has no time-of-day to get wrong", () => {
  it("formats a date-only string (no time component to normalize) unchanged", () => {
    expect(formatDate("2026-01-17")).toBe("17 Jan 2026");
  });

  it("returns the placeholder for empty/unparsable input", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not-a-date")).toBe("—");
  });
});
