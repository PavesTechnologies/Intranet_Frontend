import { describe, it, expect, vi } from "vitest";

vi.mock("@/api/axiosInstance", () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));

import { apiErrorMessage } from "./aiProviderService";

const httpError = (status, data) => ({ response: { status, data } });

describe("apiErrorMessage", () => {
  it("shows the backend's friendly message from the APIResponse envelope", () => {
    const error = httpError(409, { success: false, message: "Anthropic Claude is already registered. Edit it instead." });
    expect(apiErrorMessage(error, "fallback")).toBe("Anthropic Claude is already registered. Edit it instead.");
  });

  it("shows a string FastAPI detail", () => {
    expect(apiErrorMessage(httpError(400, { detail: "Couldn't load models." }), "fallback")).toBe("Couldn't load models.");
  });

  it("never shows a validation-error array", () => {
    const error = httpError(422, { detail: [{ loc: ["body", "api_key"], msg: "field required", type: "missing" }] });
    expect(apiErrorMessage(error, "fallback")).toBe(
      "Some of the details entered aren't valid. Check the fields and try again.",
    );
  });

  it("hides plain-text 500s behind a generic message", () => {
    expect(apiErrorMessage(httpError(500, "Internal Server Error"), "fallback")).toBe(
      "Something went wrong on the server. Please try again.",
    );
  });

  it("shows the friendly message on this feature's 503s", () => {
    const error = httpError(503, { message: "Couldn't save the AI provider right now. Please try again." });
    expect(apiErrorMessage(error, "fallback")).toBe("Couldn't save the AI provider right now. Please try again.");
  });

  it("maps auth failures to plain English", () => {
    expect(apiErrorMessage(httpError(401, { message: "Token expired" }), "f")).toBe(
      "Your session has expired. Please sign in again.",
    );
    expect(apiErrorMessage(httpError(403, { message: "Access denied. Required: HR_ADMIN" }), "f")).toBe(
      "You don't have permission to change these settings.",
    );
  });

  it("handles network failures and timeouts", () => {
    expect(apiErrorMessage({ message: "Network Error" }, "f")).toBe(
      "Can't reach the AIRS server. Check your connection and try again.",
    );
    expect(apiErrorMessage({ code: "ECONNABORTED" }, "f")).toBe("The request took too long. Please try again.");
  });

  it("falls back when the server sends nothing usable", () => {
    expect(apiErrorMessage(httpError(404, {}), "Couldn't delete this provider.")).toBe("Couldn't delete this provider.");
  });
});
