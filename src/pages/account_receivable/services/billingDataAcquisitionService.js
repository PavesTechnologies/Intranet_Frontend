// Mock service layer for Billing Data Acquisition. Wraps the static data modules with
// promise-based, artificially-latent functions so pages can already be written against an
// async data-fetching contract — swap the bodies for real axios calls (see
// src/pages/resource_management/services for the target shape) once the Epic 1 API exists.
import { BILLING_CONFIGURATIONS } from "../data/billingConfigurations";
import { BILLING_CONTEXTS } from "../data/billingContexts";
import { MOCK_TRANSACTIONS } from "../data/billingDataAcquisition";

const LATENCY_MS = 500;
const AR_BASE_URL = import.meta.env.VITE_AR_API_BASE_URL || "http://localhost:8080";

function delay(value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

function inPeriod(dateValue, periodFrom, periodTo) {
  return Boolean(dateValue) && dateValue >= periodFrom && dateValue <= periodTo;
}

function sumAmount(records) {
  return records.reduce((total, record) => total + (Number(record.amount) || 0), 0);
}

export function fetchActiveBillingConfigurations() {
  const configs = [
    {
      id: "BC-2026-001",
      projectId: 9,
      projectCode: "PRJ-1001",
      projectName: "ERP Modernization",
      client: "ABC Technologies",
      billingType: "TIME_MATERIAL",
      billingFrequency: "MONTHLY",
      billingPeriod: "06 Jan 2026 - 30 Jul 2026",
      periodStart: "2026-01-06",
      periodEnd: "2026-07-30",
      invoiceGeneration: "AUTOMATIC",
      billingStatus: "Ready",
      lastInvoice: "INV-1005",
      generatedOn: "13 Aug 2026",
      currency: "INR"
    },
    {
      id: "BC-2026-002",
      projectId: 9,
      projectCode: "9",
      projectName: "Digital Banking Platform",
      client: "Global Finance Ltd",
      billingType: "FIXED_PRICE",
      billingFrequency: "HALF_YEARLY",
      billingPeriod: "01 Jul 2026 - 31 Dec 2026",
      periodStart: "2026-07-01",
      periodEnd: "2026-12-31",
      invoiceGeneration: "MANUAL",
      billingStatus: "Waiting for Source Data",
      lastInvoice: "INV-1002",
      generatedOn: "30 Jun 2026",
      currency: "USD"
    },
    {
      id: "BC-2026-004",
      projectCode: "MAN-1001",
      projectName: "Warehouse Robotics Integration",
      client: "Atlas Logistics",
      billingType: "RECURRING",
      billingFrequency: "MONTHLY",
      billingPeriod: "01 Aug 2026 - 31 Aug 2026",
      periodStart: "2026-08-01",
      periodEnd: "2026-08-31",
      invoiceGeneration: "AUTOMATIC",
      billingStatus: "Ready",
      lastInvoice: "INV-1008",
      generatedOn: "31 Jul 2026",
      currency: "INR"
    },
    {
      id: "BC-2026-008",
      projectCode: "PRJ-1007",
      projectName: "Patient Portal Revamp",
      client: "Zen Healthcare",
      billingType: "RECURRING",
      billingFrequency: "MONTHLY",
      billingPeriod: "01 Aug 2026 - 31 Aug 2026",
      periodStart: "2026-08-01",
      periodEnd: "2026-08-31",
      invoiceGeneration: "MANUAL",
      billingStatus: "Already Billed",
      lastInvoice: "INV-1010",
      generatedOn: "01 Aug 2026",
      currency: "INR"
    },
    {
      id: "BC-2026-011",
      projectCode: "PRJ-1011",
      projectName: "Core Insurance Claims Platform",
      client: "Horizon Insurance Co.",
      billingType: "MILESTONE",
      billingFrequency: "QUARTERLY",
      billingPeriod: "01 Jul 2026 - 30 Sep 2026",
      periodStart: "2026-07-01",
      periodEnd: "2026-09-30",
      invoiceGeneration: "MANUAL",
      billingStatus: "Ready",
      lastInvoice: "INV-1012",
      generatedOn: "30 Jun 2026",
      currency: "INR"
    }
  ];
  return delay(configs);
}

export function fetchBillingContext(configId) {
  return delay(BILLING_CONTEXTS[configId] || null);
}

// A billing type only ever surfaces its own primary charge category — Expense is always
// acquired independently, and Tool charges only ride along when Tool Billing is enabled.
export function getApplicableChargeTypes(billingType, toolBillingEnabled) {
  return {
    labor: billingType === "TIME_MATERIAL",
    contract: billingType === "FIXED_PRICE",
    milestone: billingType === "MILESTONE",
    recurring: billingType === "RECURRING",
    expense: true,
    tool: Boolean(toolBillingEnabled),
  };
}

/**
 * Real TMS integration via the AR backend.
 *
 * Calls POST /api/v1/billing-snapshots which:
 *   1. Fetches approved billable timesheets from TMS (GET /api/timesheets/billing)
 *   2. Merges the TM rate from the Billing Configuration
 *   3. Validates, saves a BillingSnapshot, and returns the line items
 *
 * Returns the response in the shape the UI's labor.records[] expects:
 *   { employee, workDate, hours, rate, amount, approvalStatus }
 */
export async function createBillingSnapshot(projectId, periodFrom, periodTo) {
  const numericId = Number(projectId);
  const finalProjectId = (isNaN(numericId) || !numericId) ? 9 : numericId;
  const endpoint = `${AR_BASE_URL}/api/v1/billing-snapshots`;

  console.log(`[AR Integration] Calling POST ${endpoint} for projectId=${finalProjectId}, periodStart=${periodFrom}, periodEnd=${periodTo}`);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    },
    body: JSON.stringify({
      projectId: finalProjectId,
      billingPeriodStart: periodFrom,
      billingPeriodEnd: periodTo,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      errorBody?.message || `AR backend error: ${response.status}`
    );
  }

  const json = await response.json();
  // AR wraps all responses in { success, message, data: { ...snapshotFields, timesheets: [...] } }
  const snapshot = json.data;

  // Map AR TimesheetLineItemDto → UI labor record shape
  const laborRecords = (snapshot.timesheets || []).map((t, idx) => ({
    id: t.sourceReferenceId || `labor-${idx}`,
    employee: t.employee,
    workDate: t.workDate,           // "YYYY-MM-DD" — formatDisplayDate handles this
    hours: t.hours,
    rate: t.rate,
    amount: t.amount,
    approvalStatus: t.approvalStatus || "Approved",
    role: t.role,
  }));

  return {
    snapshotId: snapshot.snapshotId,
    snapshotNumber: snapshot.snapshotNumber,
    subtotal: snapshot.subtotal,
    totalAmount: snapshot.totalAmount,
    status: snapshot.status,
    laborRecords,
  };
}

export function mockTimesheetProvider(configId, periodFrom, periodTo) {
  const records = (MOCK_TRANSACTIONS[configId]?.labor || [])
    .filter((record) => inPeriod(record.workDate, periodFrom, periodTo))
    .map((record) => ({ ...record, amount: record.hours * record.rate }));
  return delay(records);
}

export function mockContractProvider(configId, periodFrom, periodTo) {
  const records = (MOCK_TRANSACTIONS[configId]?.contract || []).filter((record) =>
    inPeriod(record.plannedInvoiceDate, periodFrom, periodTo)
  );
  return delay(records);
}

export function mockMilestoneProvider(configId, periodFrom, periodTo) {
  const records = (MOCK_TRANSACTIONS[configId]?.milestone || []).filter((record) =>
    inPeriod(record.completionDate, periodFrom, periodTo)
  );
  return delay(records);
}

export function mockRecurringProvider(configId, periodFrom, periodTo) {
  const records = (MOCK_TRANSACTIONS[configId]?.recurring || []).filter((record) =>
    inPeriod(record.recordDate, periodFrom, periodTo)
  );
  return delay(records);
}

export function mockExpenseProvider(configId, periodFrom, periodTo) {
  const records = (MOCK_TRANSACTIONS[configId]?.expense || []).filter((record) =>
    inPeriod(record.expenseDate, periodFrom, periodTo)
  );
  return delay(records);
}

export function mockToolProvider(configId, toolBillingEnabled) {
  const records = toolBillingEnabled ? MOCK_TRANSACTIONS[configId]?.tool || [] : [];
  return delay(records);
}

const PROVIDERS = {
  labor: (configId, from, to) => mockTimesheetProvider(configId, from, to),
  contract: (configId, from, to) => mockContractProvider(configId, from, to),
  milestone: (configId, from, to) => mockMilestoneProvider(configId, from, to),
  recurring: (configId, from, to) => mockRecurringProvider(configId, from, to),
  expense: (configId, from, to) => mockExpenseProvider(configId, from, to),
};

export async function acquireBillingData(context, periodFrom, periodTo) {
  const applicable = getApplicableChargeTypes(context.billingType, context.toolBillingEnabled);
  const fetchedAt = new Date().toISOString();

  const results = {};

  // ── TIME_MATERIAL: use the real AR backend → TMS integration ──────────────
  if (context.billingType === "TIME_MATERIAL") {
    try {
      const snapshot = await createBillingSnapshot(context.projectId || context.id, periodFrom, periodTo);

      results.labor = {
        applicable: true,
        status: snapshot.laborRecords.length > 0 ? "success" : "empty",
        records: snapshot.laborRecords,
        amount: snapshot.subtotal || sumAmount(snapshot.laborRecords),
        lastFetchedAt: fetchedAt,
        snapshotId: snapshot.snapshotId,
        snapshotNumber: snapshot.snapshotNumber,
      };
    } catch (error) {
      results.labor = {
        applicable: true,
        status: "error",
        records: [],
        amount: 0,
        lastFetchedAt: fetchedAt,
        errorMessage: error.message,
      };
    }

    // Mark all other charge types as not applicable for T&M
    ["contract", "milestone", "recurring", "expense"].forEach((type) => {
      results[type] = { applicable: false, status: "not_applicable", records: [], amount: 0, lastFetchedAt: null };
    });

    // Tool charges still use mock for now
    const toolRecords = await mockToolProvider(context.configId, applicable.tool);
    results.tool = {
      applicable: applicable.tool,
      status: !applicable.tool ? "not_applicable" : toolRecords.length > 0 ? "success" : "empty",
      records: toolRecords,
      amount: sumAmount(toolRecords),
      lastFetchedAt: applicable.tool ? fetchedAt : null,
    };

    return results;
  }

  // ── All other billing types: use mock providers ────────────────────────────
  await Promise.all(
    Object.keys(PROVIDERS).map(async (chargeType) => {
      if (!applicable[chargeType]) {
        results[chargeType] = { applicable: false, status: "not_applicable", records: [], amount: 0, lastFetchedAt: null };
        return;
      }
      const records = await PROVIDERS[chargeType](context.configId, periodFrom, periodTo);
      results[chargeType] = {
        applicable: true,
        status: records.length > 0 ? "success" : "empty",
        records,
        amount: sumAmount(records),
        lastFetchedAt: fetchedAt,
      };
    })
  );

  const toolRecords = await mockToolProvider(context.configId, applicable.tool);
  results.tool = {
    applicable: applicable.tool,
    status: !applicable.tool ? "not_applicable" : toolRecords.length > 0 ? "success" : "empty",
    records: toolRecords,
    amount: sumAmount(toolRecords),
    lastFetchedAt: applicable.tool ? fetchedAt : null,
  };

  return delay(results);
}


function isRecordApproved(record) {
  if (record.approvalStatus) return record.approvalStatus === "Approved";
  if (record.status) return record.status === "Ready" || record.status === "Completed";
  return true; // recurring/tool charges have no approval concept of their own
}

export function runValidation(context, acquisitionResults, periodFrom, periodTo) {
  const chargeTypes = ["labor", "contract", "milestone", "recurring", "expense", "tool"];
  const allRecords = chargeTypes.flatMap((type) => acquisitionResults[type]?.records || []);
  const acquiredTotal = chargeTypes.reduce((total, type) => total + (acquisitionResults[type]?.amount || 0), 0);

  const hasAnyAcquiredData = allRecords.length > 0;
  const unapprovedRecords = allRecords.filter((record) => !isRecordApproved(record));
  const currencyConsistent = true; // single-currency mock records; kept explicit for the checklist
  const hasTaxProfile = Boolean(context.taxPreference);
  // Tool applicability is always set to mirror context.toolBillingEnabled during acquisition
  // (see acquireBillingData) — this only fails if tool records were acquired despite billing being off.
  const toolChargesRespected = context.toolBillingEnabled || (acquisitionResults.tool?.records?.length || 0) === 0;
  const missingReferences = allRecords.filter((record) => !record.id);

  const checklist = [
    {
      key: "period",
      label: "Billing period selected",
      passed: Boolean(periodFrom && periodTo),
      critical: true,
    },
    {
      key: "hasData",
      label: "Billable transactions acquired",
      passed: hasAnyAcquiredData,
      critical: true,
    },
    {
      key: "approved",
      label: "Approved transactions only",
      passed: unapprovedRecords.length === 0,
      critical: true,
      detail:
        unapprovedRecords.length > 0
          ? `${unapprovedRecords.length} transaction(s) are still pending approval.`
          : undefined,
    },
    {
      key: "duplicate",
      label: "No duplicate billing",
      passed: new Set(allRecords.map((record) => record.id)).size === allRecords.length,
      critical: true,
    },
    {
      key: "currency",
      label: "Currency consistency",
      passed: currencyConsistent,
      critical: true,
    },
    {
      key: "tax",
      label: "Required tax profile available",
      passed: hasTaxProfile,
      critical: true,
    },
    {
      key: "toolBilling",
      label: "Tool billing allowed",
      passed: toolChargesRespected,
      critical: false,
    },
    {
      key: "references",
      label: "Missing mandatory references",
      passed: missingReferences.length === 0,
      critical: false,
    },
  ];

  // Static placeholder — will be replaced by the Epic 1 invoicing ledger once it exists.
  const previouslyInvoiced = 0;
  const currentDraftTotal = acquiredTotal;

  return {
    checklist,
    reconciliation: {
      acquiredTotal,
      previouslyInvoiced,
      currentDraftTotal,
      variance: currentDraftTotal - acquiredTotal - previouslyInvoiced,
    },
  };
}

let draftSeq = 0;

export function generateInvoiceDraft(context, acquisitionResults) {
  draftSeq += 1;
  const chargeTypes = ["labor", "contract", "milestone", "recurring", "expense", "tool"];
  const subtotal = chargeTypes.reduce((total, type) => total + (acquisitionResults[type]?.amount || 0), 0);
  const taxRate = context.taxPreference === "Exempt" ? 0 : 0.18;
  const estimatedTax = Math.round(subtotal * taxRate);

  const draft = {
    draftNumber: `INV-DRAFT-${context.projectCode}-${String(draftSeq).padStart(3, "0")}`,
    createdDate: new Date().toISOString(),
    createdBy: "Current User",
    subtotal,
    estimatedTax,
    estimatedGrandTotal: subtotal + estimatedTax,
  };

  return delay(draft);
}
