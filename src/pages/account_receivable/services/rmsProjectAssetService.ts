// Isolated RMS project-asset lookup for Epic 4 Phase 3 (RMS Asset Integration). Prepares the
// frontend for future invoice generation, which will need to know which RMS assets are
// assigned to a project and whether each is eligible for billing. No invoice UI consumes this
// yet — this file only establishes the integration point.
//
// This is the ONLY function that should ever produce a project's billable asset list; future
// consumers (Invoice Software Selection, Charge Generation, etc.) must call
// getBillableAssetsForProject(projectId) rather than hardcoding or duplicating mock data. When
// RMS is connected, only this file changes — replace the mock body below with a real GET call
// to the RMS endpoint for the given projectId and return response.data in the same shape.
// Nothing else in the module needs to change.
import type { ProjectBillableAsset } from "../types/projectBillableAsset";

const LATENCY_MS = 400;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

const MOCK_PROJECT_ASSETS: Record<string, ProjectBillableAsset[]> = {
  "101": [
    {
      assetId: "AST-1001",
      assetCode: "SW-PBI",
      assetName: "Power BI",
      assetCategory: "Software",
      quantity: 5,
      billingBasis: "RECURRING",
      assignmentStartDate: "2026-01-01",
      billableEligible: true,
    },
    {
      assetId: "AST-1002",
      assetCode: "SW-JIRA",
      assetName: "Jira",
      assetCategory: "Software",
      quantity: 10,
      billingBasis: "RECURRING",
      assignmentStartDate: "2026-01-01",
      billableEligible: true,
    },
    {
      assetId: "AST-1004",
      assetCode: "SW-VPN",
      assetName: "VPN",
      assetCategory: "Software",
      quantity: 10,
      billingBasis: "RECURRING",
      assignmentStartDate: "2026-01-01",
      billableEligible: false,
    },
  ],
  "102": [
    {
      assetId: "AST-1005",
      assetCode: "SW-GHE",
      assetName: "GitHub Enterprise",
      assetCategory: "Software",
      quantity: 8,
      billingBasis: "RECURRING",
      assignmentStartDate: "2026-02-01",
      billableEligible: true,
    },
    {
      assetId: "AST-1006",
      assetCode: "SW-ADBE",
      assetName: "Adobe License",
      assetCategory: "Software",
      quantity: 3,
      billingBasis: "RECURRING",
      assignmentStartDate: "2026-02-01",
      billableEligible: true,
    },
  ],
};

/**
 * @param projectId
 * @returns Assets RMS has assigned to the project, each flagged with RMS's own billing
 * eligibility. Returns an empty list for a project RMS has no assignments for.
 */
export function getBillableAssetsForProject(projectId: string): Promise<ProjectBillableAsset[]> {
  return delay(MOCK_PROJECT_ASSETS[String(projectId)] || []);
}
