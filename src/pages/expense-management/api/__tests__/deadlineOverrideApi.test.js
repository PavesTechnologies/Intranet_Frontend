import { AxiosError } from "axios";
import api from "@/api/axiosInstance";
import {
  buildDeadlineOverrideRequest,
  DEADLINE_OVERRIDE_ACTION,
  DeadlineOverrideError,
  deadlineOverrideApi,
} from "@/pages/expense-management/api/deadlineOverrideApi";

const REPORT_ID = "6f1f0c2e-2222-4a2b-9c3d-000000000002";
const GOOD_REASON = "Client visit delayed the receipts by a month";
// Fixed "today" for date rules: 23 Oct 2026.
const NOW = new Date(2026, 9, 23);

describe("buildDeadlineOverrideRequest", () => {
  it("builds an EXTEND body with the date and the trimmed reason", () => {
    expect(
      buildDeadlineOverrideRequest({ action: "EXTEND", extendedUntil: "2026-11-30", reason: `  ${GOOD_REASON}  ` }, NOW),
    ).toEqual({ action: "EXTEND", extendedUntil: "2026-11-30", reason: GOOD_REASON });
  });

  it("builds a REOPEN body without a date", () => {
    expect(buildDeadlineOverrideRequest({ action: "REOPEN", reason: GOOD_REASON }, NOW)).toEqual({
      action: "REOPEN",
      reason: GOOD_REASON,
    });
  });

  it("refuses a reason shorter than ten characters before anything is sent", () => {
    expect(() => buildDeadlineOverrideRequest({ action: "REOPEN", reason: "too short" }, NOW))
      .toThrow(DeadlineOverrideError);
    expect(() => buildDeadlineOverrideRequest({ action: "REOPEN", reason: "too short" }, NOW))
      .toThrow("at least 10 characters");
  });

  it("refuses an extension without a date", () => {
    expect(() => buildDeadlineOverrideRequest({ action: "EXTEND", extendedUntil: "", reason: GOOD_REASON }, NOW))
      .toThrow("Enter the new submission date");
  });

  it("refuses an extension into the past", () => {
    expect(() => buildDeadlineOverrideRequest({ action: "EXTEND", extendedUntil: "2026-10-01", reason: GOOD_REASON }, NOW))
      .toThrow("cannot be in the past");
  });

  it("accepts an extension to today", () => {
    expect(buildDeadlineOverrideRequest({ action: "EXTEND", extendedUntil: "2026-10-23", reason: GOOD_REASON }, NOW).action)
      .toBe("EXTEND");
  });

  it("refuses a reopen that carries a date", () => {
    expect(() => buildDeadlineOverrideRequest({ action: "REOPEN", extendedUntil: "2026-12-01", reason: GOOD_REASON }, NOW))
      .toThrow("A reopen does not take a date.");
  });

  it("refuses an unknown action", () => {
    expect(() => buildDeadlineOverrideRequest({ action: "DELETE", reason: GOOD_REASON }, NOW))
      .toThrow("Choose whether to extend");
  });

  it("uses the same action names as the server", () => {
    expect(DEADLINE_OVERRIDE_ACTION).toEqual({ EXTEND: "EXTEND", REOPEN: "REOPEN" });
  });
});

describe("deadlineOverrideApi.apply - request pipeline", () => {
  let sent;
  let respond;
  const originalAdapter = api.defaults.adapter;

  beforeEach(() => {
    sent = null;
    respond = (config) => ({ data: { success: true, data: {} }, status: 200, statusText: "OK", headers: {}, config });
    api.defaults.adapter = async (config) => {
      sent = config;
      const result = respond(config);
      if (result instanceof Error) throw result;
      return result;
    };
  });

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
  });

  it("posts the body as JSON to the report's deadline-override endpoint", async () => {
    const body = buildDeadlineOverrideRequest({ action: "REOPEN", reason: GOOD_REASON }, NOW);

    await deadlineOverrideApi.apply(REPORT_ID, body);

    expect(sent.url).toContain(`/xms/finance/expense-reports/${REPORT_ID}/deadline-override`);
    expect(sent.method).toBe("post");
    expect(sent.headers.getContentType()).toMatch(/^application\/json/);
    expect(JSON.parse(sent.data)).toEqual({ action: "REOPEN", reason: GOOD_REASON });
  });

  it("passes a server refusal through with its message", async () => {
    respond = (config) =>
      new AxiosError("Request failed with status code 422", "ERR_BAD_REQUEST", config, null, {
        status: 422,
        statusText: "Unprocessable Entity",
        headers: {},
        config,
        data: { success: false, message: "Deadline overrides apply only to reports that are still in draft." },
      });

    const err = await deadlineOverrideApi
      .apply(REPORT_ID, buildDeadlineOverrideRequest({ action: "REOPEN", reason: GOOD_REASON }, NOW))
      .catch((e) => e);

    expect(err.response.status).toBe(422);
    expect(err.response.data.message).toContain("still in draft");
  });
});
