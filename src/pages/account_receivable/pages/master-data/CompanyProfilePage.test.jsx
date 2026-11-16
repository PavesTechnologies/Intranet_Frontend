import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import CompanyProfilePage from "./CompanyProfilePage";
import * as companyProfileService from "../../services/companyProfileService";

vi.mock("../../services/companyProfileService", () => ({
  getActiveCompanyProfile: vi.fn(),
  getCompanyProfileErrorMessage: vi.fn((err, fallback) => fallback),
  createCompanyProfile: vi.fn(),
  updateCompanyProfile: vi.fn(),
  normalizeCompanyProfile: vi.fn((item) => item),
}));

describe("CompanyProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state when no company profile is configured", async () => {
    companyProfileService.getActiveCompanyProfile.mockResolvedValueOnce(null);

    render(
      <MemoryRouter>
        <CompanyProfilePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading company profile/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/no company profile has been configured yet/i)).toBeInTheDocument();
    expect(screen.getByText(/configure the seller information used on ar invoices/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /configure company profile/i })).toBeInTheDocument();

    // Verify no Activate button exists
    expect(screen.queryByRole("button", { name: /activate/i })).not.toBeInTheDocument();
  });

  it("renders active seller details when company profile exists", async () => {
    const mockProfile = {
      companyProfileId: "cp-123",
      legalName: "Acme Seller Global Corp",
      gstin: "29ABCDE1234F1Z5",
      email: "finance@acme.com",
      phone: "+91 80 9876 5432",
      addressLine1: "100 Tech Park Way",
      addressLine2: "Tower C, Floor 4",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560100",
      country: "India",
      isActive: true,
    };

    companyProfileService.getActiveCompanyProfile.mockResolvedValueOnce(mockProfile);

    render(
      <MemoryRouter>
        <CompanyProfilePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Acme Seller Global Corp")).toBeInTheDocument();
    });

    // Check status badge
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();

    // Check fields rendered
    expect(screen.getByText("29ABCDE1234F1Z5")).toBeInTheDocument();
    expect(screen.getByText("finance@acme.com")).toBeInTheDocument();
    expect(screen.getByText("+91 80 9876 5432")).toBeInTheDocument();
    expect(screen.getByText("100 Tech Park Way")).toBeInTheDocument();
    expect(screen.getByText(/Bengaluru, Karnataka/)).toBeInTheDocument();
    expect(screen.getByText("India")).toBeInTheDocument();

    // Edit button available
    expect(screen.getAllByRole("button", { name: /edit/i }).length).toBeGreaterThan(0);

    // Confirm no Activate button exists
    expect(screen.queryByRole("button", { name: /activate/i })).not.toBeInTheDocument();
  });

  it("opens modal when clicking Configure Company Profile in empty state", async () => {
    const user = userEvent.setup();
    companyProfileService.getActiveCompanyProfile.mockResolvedValueOnce(null);

    render(
      <MemoryRouter>
        <CompanyProfilePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /configure company profile/i })).toBeInTheDocument();
    });

    const configureBtn = screen.getByRole("button", { name: /configure company profile/i });
    await user.click(configureBtn);

    // Modal title should appear
    expect(screen.getByRole("heading", { name: "Configure Company Profile" })).toBeInTheDocument();
    expect(screen.getByLabelText(/legal \/ company name/i)).toBeInTheDocument();
  });
});
