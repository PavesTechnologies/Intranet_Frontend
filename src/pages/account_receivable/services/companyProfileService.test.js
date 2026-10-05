import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "../../../api/axiosInstance";
import {
  getActiveCompanyProfile,
  getCompanyProfileById,
  createCompanyProfile,
  updateCompanyProfile,
  normalizeCompanyProfile,
  getCompanyProfileErrorMessage,
} from "./companyProfileService";

vi.mock("../../../api/axiosInstance", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe("Company Profile Service & Normalization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("normalizeCompanyProfile", () => {
    it("normalizes all 12 seller fields properly", () => {
      const raw = {
        companyProfileId: "cp-555",
        legalName: "  Paves Technologies Pvt Ltd  ",
        addressLine1: "  Suite 100  ",
        addressLine2: "  Tower B  ",
        city: "  Hyderabad  ",
        state: "  Telangana  ",
        postalCode: "  500081  ",
        country: "  India  ",
        gstin: "  36AAACP1234K1Z5  ",
        email: "  finance@paves.com  ",
        phone: "  +91 40 1122 3344  ",
        logoReference: "https://paves.com/logo.png",
        isActive: true,
      };

      const result = normalizeCompanyProfile(raw);
      expect(result.companyProfileId).toBe("cp-555");
      expect(result.legalName).toBe("Paves Technologies Pvt Ltd");
      expect(result.addressLine1).toBe("Suite 100");
      expect(result.addressLine2).toBe("Tower B");
      expect(result.city).toBe("Hyderabad");
      expect(result.state).toBe("Telangana");
      expect(result.postalCode).toBe("500081");
      expect(result.country).toBe("India");
      expect(result.gstin).toBe("36AAACP1234K1Z5");
      expect(result.email).toBe("finance@paves.com");
      expect(result.phone).toBe("+91 40 1122 3344");
      expect(result.logoReference).toBe("https://paves.com/logo.png");
      expect(result.isActive).toBe(true);
    });

    it("handles id alias when companyProfileId is absent", () => {
      const raw = { id: "cp-alt-1", legalName: "Alpha Corp" };
      const result = normalizeCompanyProfile(raw);
      expect(result.companyProfileId).toBe("cp-alt-1");
      expect(result.legalName).toBe("Alpha Corp");
    });

    it("returns null for null, undefined, or non-object input", () => {
      expect(normalizeCompanyProfile(null)).toBeNull();
      expect(normalizeCompanyProfile(undefined)).toBeNull();
      expect(normalizeCompanyProfile({})).toBeNull();
    });
  });

  describe("getActiveCompanyProfile", () => {
    it("returns normalized profile on successful GET /api/v1/company-profile", async () => {
      api.get.mockResolvedValueOnce({
        data: {
          data: {
            companyProfileId: "cp-active-1",
            legalName: "Active Seller Pvt Ltd",
            email: "seller@paves.com",
            addressLine1: "Main St",
            city: "Hyderabad",
            state: "Telangana",
            country: "India",
            postalCode: "500081",
          },
        },
      });

      const profile = await getActiveCompanyProfile();
      expect(profile).not.toBeNull();
      expect(profile.companyProfileId).toBe("cp-active-1");
      expect(profile.legalName).toBe("Active Seller Pvt Ltd");
    });

    it("returns null when API responds with 404 (no profile configured)", async () => {
      api.get.mockRejectedValueOnce({
        response: { status: 404 },
      });

      const profile = await getActiveCompanyProfile();
      expect(profile).toBeNull();
    });

    it("returns null on network/server error without throwing", async () => {
      api.get.mockRejectedValueOnce(new Error("Network Error"));

      const profile = await getActiveCompanyProfile();
      expect(profile).toBeNull();
    });
  });

  describe("getCompanyProfileById", () => {
    it("returns null immediately if companyProfileId is null or empty", async () => {
      const profile = await getCompanyProfileById(null);
      expect(profile).toBeNull();
      expect(api.get).not.toHaveBeenCalled();
    });

    it("returns normalized profile on successful ID fetch", async () => {
      api.get.mockResolvedValueOnce({
        data: {
          companyProfileId: "cp-by-id",
          legalName: "Target Profile Inc",
        },
      });

      const profile = await getCompanyProfileById("cp-by-id");
      expect(profile.companyProfileId).toBe("cp-by-id");
      expect(profile.legalName).toBe("Target Profile Inc");
    });

    it("returns null when ID fetch returns 404", async () => {
      api.get.mockRejectedValueOnce({
        response: { status: 404 },
      });

      const profile = await getCompanyProfileById("cp-missing");
      expect(profile).toBeNull();
    });
  });

  describe("createCompanyProfile", () => {
    it("posts payload and returns normalized profile on success", async () => {
      const payload = {
        legalName: "New Company LLC",
        email: "contact@newco.com",
        addressLine1: "123 Business Way",
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
        postalCode: "560001",
      };

      api.post.mockResolvedValueOnce({
        data: {
          data: {
            companyProfileId: "cp-new-1",
            ...payload,
          },
        },
      });

      const created = await createCompanyProfile(payload);
      expect(api.post).toHaveBeenCalledTimes(1);
      expect(created.companyProfileId).toBe("cp-new-1");
      expect(created.legalName).toBe("New Company LLC");
    });
  });

  describe("updateCompanyProfile", () => {
    it("throws an error if companyProfileId is missing", async () => {
      await expect(updateCompanyProfile(null, {})).rejects.toThrow(
        "Company profile ID is required for update."
      );
    });

    it("puts payload to /api/v1/company-profile/{id} and returns normalized profile", async () => {
      const payload = {
        legalName: "Updated Name Corp",
        email: "updated@paves.com",
      };

      api.put.mockResolvedValueOnce({
        data: {
          companyProfileId: "cp-edit-1",
          ...payload,
        },
      });

      const updated = await updateCompanyProfile("cp-edit-1", payload);
      expect(api.put).toHaveBeenCalledWith(
        expect.stringContaining("/cp-edit-1"),
        payload
      );
      expect(updated.companyProfileId).toBe("cp-edit-1");
      expect(updated.legalName).toBe("Updated Name Corp");
    });
  });

  describe("getCompanyProfileErrorMessage", () => {
    it("extracts message from response data string", () => {
      expect(getCompanyProfileErrorMessage({ response: { data: "Custom error string" } })).toBe("Custom error string");
    });

    it("extracts message from response data object", () => {
      expect(getCompanyProfileErrorMessage({ response: { data: { message: "Invalid legal name" } } })).toBe("Invalid legal name");
    });

    it("falls back to default fallback when no detail is present", () => {
      expect(getCompanyProfileErrorMessage({}, "Default error")).toBe("Default error");
    });
  });
});
