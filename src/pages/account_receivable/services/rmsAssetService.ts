// Isolated RMS asset lookup for Epic 4 Phase 2 (Tool Pricing). Finance does not create assets
// here — assets are owned by RMS (Resource Management System) and only selected for pricing.
// This file is designed exactly as if RMS already exists: the shape below is the real RMS
// contract, and only the transport (mock promise vs. HTTP call) is temporarily stubbed.
//
// This is the ONLY function that should ever produce the asset list; every consumer (Tool
// Pricing page and dialog) must call getAvailableSoftwareAssets() rather than hardcoding
// options. When RMS is connected, only this file changes — replace the mock body below with a
// real GET call to the RMS endpoint (see src/pages/resource_management/services for the target
// axios shape) and return response.data in the same shape. Nothing else in the module needs
// to change.
const LATENCY_MS = 400;

function delay(value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

const MOCK_RMS_SOFTWARE_ASSETS = [
  { assetId: "AST-1001", assetCode: "SW-PBI", assetName: "Power BI", assetCategory: "Software" },
  { assetId: "AST-1002", assetCode: "SW-JIRA", assetName: "Jira", assetCategory: "Software" },
  { assetId: "AST-1003", assetCode: "SW-GH", assetName: "GitHub", assetCategory: "Software" },
];

/**
 * @returns {Promise<import("../types/toolPricing").RmsAsset[]>}
 */
export function getAvailableSoftwareAssets() {
  return delay(MOCK_RMS_SOFTWARE_ASSETS);
}
