import { describe, it, expect } from "vitest";
import { ONBOARDING_INTAKE_ERROR, classifyOnboardingIntakeError } from "./vendorIntake";

const apiError = (status, detail) => ({ response: { status, data: { detail } } });

describe("classifyOnboardingIntakeError", () => {
  it("maps 404 to an unknown internal request", () => {
    expect(classifyOnboardingIntakeError(apiError(404, "Vendor onboarding request not found"))).toBe(
      ONBOARDING_INTAKE_ERROR.REQUEST_NOT_FOUND,
    );
  });

  it("maps a 409 for the request to not eligible", () => {
    expect(
      classifyOnboardingIntakeError(
        apiError(409, "Vendor intake has already been completed for this onboarding request"),
      ),
    ).toBe(ONBOARDING_INTAKE_ERROR.REQUEST_NOT_ELIGIBLE);
  });

  it("keeps the duplicate-engagement 409 and 422 as duplicates", () => {
    expect(
      classifyOnboardingIntakeError(
        apiError(409, "An engagement already exists for this vendor, department and category"),
      ),
    ).toBe(ONBOARDING_INTAKE_ERROR.DUPLICATE_ENGAGEMENT);
    expect(
      classifyOnboardingIntakeError(
        apiError(422, "An engagement already exists for this vendor in the selected department"),
      ),
    ).toBe(ONBOARDING_INTAKE_ERROR.DUPLICATE_ENGAGEMENT);
  });

  it("leaves other validation, server and network failures to the generic message", () => {
    expect(classifyOnboardingIntakeError(apiError(422, "Invalid GSTIN"))).toBe(
      ONBOARDING_INTAKE_ERROR.OTHER,
    );
    expect(classifyOnboardingIntakeError(apiError(500, "boom"))).toBe(ONBOARDING_INTAKE_ERROR.OTHER);
    expect(classifyOnboardingIntakeError(new Error("Network Error"))).toBe(
      ONBOARDING_INTAKE_ERROR.OTHER,
    );
  });
});
