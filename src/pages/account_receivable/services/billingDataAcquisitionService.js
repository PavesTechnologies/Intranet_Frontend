// Mock service layer for Billing Data Acquisition. Wraps the static data modules with
// promise-based, artificially-latent functions so pages can already be written against an
// async data-fetching contract — swap the bodies for real axios calls (see
// src/pages/resource_management/services for the target shape) once the Epic 1 API exists.
import { getBillingConfigurations } from "./billingConfigurationService";
import { BILLING_CONTEXTS } from "../data/billingContexts";
import { MOCK_TRANSACTIONS } from "../data/billingDataAcquisition";

const LATENCY_MS = 500;

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
      projectCode: "PRJ-1001",
      projectName: "ERP Modernization",
      client: "ABC Technologies",
      billingType: "TIME_MATERIAL",
      billingFrequency: "MONTHLY",
      billingPeriod: "14 Aug 2026 - 13 Sep 2026",
      periodStart: "2026-08-14",
      periodEnd: "2026-09-13",
      invoiceGeneration: "AUTOMATIC",
      billingStatus: "Ready",
      lastInvoice: "INV-1005",
      generatedOn: "13 Aug 2026",
      currency: "INR"
    },
    {
      id: "BC-2026-002",
      projectCode: "PRJ-1003",
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
