import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import JdDetails from "./JdDetails";
import JdCalibrationPanel from "./components/JdCalibrationPanel";
import { useAuth } from "../../../contexts/AuthContext";
import * as jdservice from "../service/jdservice";

// Smoke render tests with every service mocked: the JD Details page and its
// Calibration panel must mount without throwing. A const/let read before its
// declaration (e.g. in a dependency array) crashes the page on load, and the
// build doesn't catch that - rendering does.

vi.mock("../../../contexts/AuthContext", () => ({ useAuth: vi.fn() }));

vi.mock("./airsStore", () => ({
  useAirsStore: () => ({ jds: [], campaigns: [], updateJd: vi.fn(), restoreJdVersion: vi.fn(), addCampaign: vi.fn() }),
}));

vi.mock("../service/jdservice", async (importOriginal) => ({
  ...(await importOriginal()),
  getJDById: vi.fn(),
  getJDSkills: vi.fn(),
  getJDUnknownSkills: vi.fn(),
  getJDCalibration: vi.fn(),
  getJDCalibrationVersions: vi.fn(),
  getJDUnknownSkillSuggestions: vi.fn(),
  saveJDCalibration: vi.fn(),
  resolveJDUnknownSkill: vi.fn(),
}));

vi.mock("../campaigns/services/campaignservice", async (importOriginal) => ({
  ...(await importOriginal()),
  getAllCampaigns: vi.fn().mockResolvedValue({ success: true, data: { items: [], total: 0 } }),
  getPipelineSummary: vi.fn().mockResolvedValue({ success: true, data: {} }),
}));

const JD = {
  id: "jd-1", title: "AI transformation lead", version_number: 1, is_active_version: true,
  raw_text: "Lead AI adoption.", min_experience_years: 10, education_criteria: null,
  calibration_status: "NOT_CALIBRATED", calibration_version: 0, is_verified: "PARTIALLY_VERIFIED",
  has_live_campaign: false, created_at: "2026-10-01T00:00:00Z", extracted_json: {},
};

const VIEW = {
  jd_id: "jd-1", title: "AI transformation lead", version_number: 1,
  calibration_status: "NOT_CALIBRATED", calibration_version: 0, calibrated_by: null, calibrated_by_name: null,
  calibrated_at: null, verification_status: "PARTIALLY_VERIFIED", pending_unknown_skill_count: 1,
  skills: [{ jd_skill_id: "s-1", canonical_skill_id: "c-1", name: "Program Management", tier: "CORE",
             ambiguous: false, sense_options: [], sense_key: null, suggested_sense_key: null, suggested_sense_basis: null }],
  unknown_skills: [{ unknown_skill_id: "u-1", raw_text: "Agentic Workflow Design", tier: "CORE", status: "PENDING",
                     resolution: null, blocks_calibration: true }],
  core_skill_count: 1, min_experience_years: 10, extracted_min_experience_years: 10,
  experience_tolerance_years: null, default_experience_tolerance_years: 1, education_requirement: "MANDATORY",
  education_degree: null, education_field: null, live_campaigns: [], can_calibrate: true,
  warnings: [], blocking_unknown_skills: ["Agentic Workflow Design"],
};

beforeEach(() => {
  useAuth.mockReturnValue({ user: { roles: ["HR_ADMIN"] }, hasRole: () => true, hasAnyPermission: () => true });
  jdservice.getJDById.mockResolvedValue({ data: JD });
  jdservice.getJDSkills.mockResolvedValue({ success: true, data: [] });
  jdservice.getJDUnknownSkills.mockResolvedValue({ success: true, data: [] });
  jdservice.getJDCalibration.mockResolvedValue(VIEW);
  jdservice.getJDCalibrationVersions.mockResolvedValue([]);
  jdservice.getJDUnknownSkillSuggestions.mockResolvedValue([
    { unknown_skill_id: "u-1", suggestions: [{ canonical_skill_id: "c-9", canonical_name: "Crew AI", similarity: 0.71 }] },
  ]);
});

describe("JD Details", () => {
  it("renders the JD and opens the Calibration tab", async () => {
    render(
      <MemoryRouter initialEntries={["/ai-screening/jds/jd-1"]}>
        <Routes>
          <Route path="/ai-screening/jds/:id" element={<JdDetails />} />
        </Routes>
      </MemoryRouter>,
    );
    expect((await screen.findAllByText("AI transformation lead")).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Calibration" }));
    expect(await screen.findByText("Not in the catalogue (unknown skills)")).toBeInTheDocument();
  });
});

describe("JD Calibration panel", () => {
  it("shows an unresolved core unknown skill as a blocker and disables saving", async () => {
    render(<JdCalibrationPanel jdId="jd-1" canCalibrate onSaved={vi.fn()} />);
    expect(await screen.findByText("Agentic Workflow Design")).toBeInTheDocument();
    expect(screen.getByText(/resolve before calibrating/i)).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Crew AI/ })).toBeInTheDocument();
    expect(screen.getByText(/Blank uses the extracted minimum \(10 years\)/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Calibrate JD" })).toBeDisabled();
  });
});
