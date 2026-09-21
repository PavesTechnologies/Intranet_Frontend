import api from "../../../api/axiosInstance";
import { BILLING_CONTEXTS } from "../data/billingContexts";
import { MOCK_TRANSACTIONS } from "../data/billingDataAcquisition";

const LATENCY_MS = 500;
const AR_BASE_URL =
  window.__APP_CONFIG__?.AR_BASE_URL ||
  window.APP_CONFIG?.AR_BASE_URL ||
  import.meta.env.VITE_AR_API_BASE_URL ||
  "http://localhost:8080";

function getToken() {
  return localStorage.getItem("token") || "";
}

function delay(value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

function inPeriod(dateValue, periodFrom, periodTo) {
  return Boolean(dateValue) && dateValue >= periodFrom && dateValue <= periodTo;
}

function sumAmount(records) {
  return records.reduce((total, record) => total + (Number(record.amount) || 0), 0);
}

// ─── Active Billing Configurations (Phase 1: real API) ────────────────────────

/**
 * Normalise a billing type name string (from billing_type_master) → internal UI key.
 * Exported so callers can filter active configurations down to a specific
 * billing type (e.g. TIME_MATERIAL) without re-implementing this mapping —
 * see fetchActiveBillingConfigurations's billingTypeCode field below.
 */
export function normalizeBillingTypeName(name) {
  if (!name) return "";
  const upper = String(name).trim().toUpperCase().replace(/\s+/g, "_");
  if (["TIME_AND_MATERIAL", "TIME_MATERIAL", "TIMESHEET_BASED"].includes(upper)) return "TIME_MATERIAL";
  if (["FIXED_PRICE", "FIXED"].includes(upper)) return "FIXED_PRICE";
  if (["MILESTONE", "MILESTONE_BASED"].includes(upper)) return "MILESTONE";
  if (["RECURRING", "SUBSCRIPTION", "SUBSCRIPTION_BASED", "RECURRING_BILLING"].includes(upper)) return "RECURRING";
  return upper;
}

/**
 * Normalise any date representation (array [YYYY, M, D], ISO string with T, or plain date string)
 * into a strict YYYY-MM-DD string.
 */
export function toIsoDateOnly(val) {
  if (!val) return "";
  if (Array.isArray(val)) {
    const [year, month, day] = val;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  const str = String(val).trim();
  if (str === "null" || str === "undefined" || str === "NaN") return "";
  if (str.includes("T")) return str.split("T")[0];
  return str;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

function formatSingleDate(iso) {
  if (!iso) return "\u2014";
  const clean = toIsoDateOnly(iso);
  if (!clean) return "\u2014";
  const parts = clean.split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day) && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const monthStr = MONTH_NAMES[month - 1];
      const dayStr = String(day).padStart(2, "0");
      return `${dayStr} ${monthStr} ${year}`;
    }
  }
  const d = new Date(clean + "T00:00:00");
  if (isNaN(d.getTime())) return "\u2014";
  const dayStr = String(d.getDate()).padStart(2, "0");
  const monthStr = MONTH_NAMES[d.getMonth()];
  return `${dayStr} ${monthStr} ${d.getFullYear()}`;
}

/**
 * Format an ISO date range (YYYY-MM-DD or array) into "DD Mon YYYY - DD Mon YYYY".
 * Safely returns "—" if either date is missing or invalid.
 */
export function formatBillingPeriod(startIso, endIso) {
  const cleanStart = toIsoDateOnly(startIso);
  const cleanEnd = toIsoDateOnly(endIso);
  if (!cleanStart || !cleanEnd) return "\u2014";
  const s = formatSingleDate(cleanStart);
  const e = formatSingleDate(cleanEnd);
  if (s === "\u2014" || e === "\u2014") return "\u2014";
  return `${s} - ${e}`;
}

const SNAPSHOT_STORAGE_PREFIX = "ar_snapshot_period_";

/**
 * Persists acquired snapshot metadata (including its actual billing period) to localStorage.
 */
export function saveAcquiredSnapshotMetadata(projectId, metadata) {
  if (!projectId || !metadata) return null;
  const numId = Number(projectId);
  try {
    const key = `${SNAPSHOT_STORAGE_PREFIX}${numId}`;
    const rawExisting = localStorage.getItem(key);
    const existing = rawExisting ? JSON.parse(rawExisting) : {};

    const cleanStart = toIsoDateOnly(
      metadata.billingPeriodStart || metadata.periodStart || existing.billingPeriodStart
    );
    const cleanEnd = toIsoDateOnly(
      metadata.billingPeriodEnd || metadata.periodEnd || existing.billingPeriodEnd
    );

    const updated = {
      ...existing,
      ...metadata,
      projectId: numId,
      billingPeriodStart: cleanStart,
      billingPeriodEnd: cleanEnd,
      billingPeriod: formatBillingPeriod(cleanStart, cleanEnd),
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn("[billingDataAcquisitionService] Failed to save snapshot metadata to localStorage:", e);
    return null;
  }
}

/**
 * Retrieves persisted snapshot metadata for a project.
 */
export function getAcquiredSnapshotMetadata(projectId) {
  if (!projectId) return null;
  const numId = Number(projectId);
  try {
    const key = `${SNAPSHOT_STORAGE_PREFIX}${numId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    // Ignore storage parse errors
  }

  return null;
}

/**
 * Clears persisted snapshot metadata from localStorage for a project.
 */
export function clearAcquiredSnapshotMetadata(projectId) {
  if (!projectId) return;
  const numId = Number(projectId);
  try {
    const key = `${SNAPSHOT_STORAGE_PREFIX}${numId}`;
    localStorage.removeItem(key);
  } catch (e) {
    // Ignore storage parse errors
  }
}

/**
 * Fetches ACTIVE billing configurations from the AR backend and maps
 * them to the shape the Billing Data Acquisition overview table expects.
 *
 * Endpoint: GET /api/billing-data-acquisition/active-configurations
 *
 * Server DTO → UI shape:
 *   projectName, projectCode  → projectName, projectCode
 *   clientName                → client
 *   billingType               → billingType  (normalised)
 *   frequency                 → billingFrequency
 *   billingPeriodStart/End    → billingPeriod (display), periodStart, periodEnd
 *   generationMode            → invoiceGeneration
 *   status                    → billingStatus  (NOT_ACQUIRED | READY | etc.)
 *   lastInvoice               → lastInvoice
 */
export async function fetchActiveBillingConfigurations() {
  const endpoint = `${AR_BASE_URL}/api/billing-data-acquisition/active-configurations`;
  const configListEndpoint = `${AR_BASE_URL}/api/billing-configurations`;

  try {
    const [acqRes, allConfigsRes] = await Promise.allSettled([
      api.get(endpoint),
      api.get(configListEndpoint),
    ]);

    const json = acqRes.status === "fulfilled" ? acqRes.value.data : [];
    const configs = Array.isArray(json) ? json : (json?.data ?? []);

    const allConfigsJson = allConfigsRes.status === "fulfilled" ? allConfigsRes.value.data : [];
    const rawAllConfigs = Array.isArray(allConfigsJson) ? allConfigsJson : (allConfigsJson?.data ?? []);

    const configMap = new Map();
    rawAllConfigs.forEach((c) => {
      if (c.billingConfigurationId) configMap.set(String(c.billingConfigurationId), c);
      if (c.projectId) configMap.set(String(c.projectId), c);
    });

    return configs.map((cfg) => {
      const isNotAcquired = String(cfg.status || "").trim().toUpperCase() === "NOT_ACQUIRED";

      // Authoritative backend rule: If status is NOT_ACQUIRED, expunge any stale localStorage metadata
      if (isNotAcquired) {
        clearAcquiredSnapshotMetadata(cfg.projectId);
      }

      const cleanStart = toIsoDateOnly(cfg.billingPeriodStart);
      const cleanEnd = toIsoDateOnly(cfg.billingPeriodEnd);
      const hasPeriod = Boolean(cleanStart && cleanEnd) && !isNotAcquired;

      // Project Duration (overall project/configuration duration, independent of billing period)
      const fullConfig = configMap.get(String(cfg.billingConfigurationId)) || configMap.get(String(cfg.projectId));
      const projectStart = toIsoDateOnly(fullConfig?.effectiveFrom || cfg.effectiveFrom || cfg.projectStartDate || cfg.startDate);
      const projectEnd = toIsoDateOnly(fullConfig?.effectiveTo || cfg.effectiveTo || cfg.projectEndDate || cfg.endDate);
      const projectDuration = (projectStart && projectEnd) ? formatBillingPeriod(projectStart, projectEnd) : "—";
      const paymentTerms = fullConfig?.paymentTermName || cfg.paymentTerms || "Net 30";

      return {
        // Identity
        id: `BC-${cfg.projectId}`,
        billingConfigurationId: cfg.billingConfigurationId,
        projectId: cfg.projectId,
        projectCode: cfg.projectCode ?? `PRJ-${cfg.projectId}`,
        projectName: cfg.projectName ?? "\u2014",

        // Client
        client: cfg.clientName ?? "\u2014",

        // Billing type — the API returns the human-readable master name directly
        // (e.g. "Timesheet Based", "Fixed Price"). Pass it through as-is.
        billingType: cfg.billingType ?? "\u2014",
        // Normalised UI key (TIME_MATERIAL, FIXED_PRICE, RECURRING, MILESTONE)
        // so callers needing one billing type only (Data Acquisition / T&M Tax
        // Calculation) can filter without re-deriving this mapping themselves.
        billingTypeCode: normalizeBillingTypeName(cfg.billingType),

        // Frequency — the API returns the human-readable name (e.g. "Monthly").
        billingFrequency: cfg.frequency ?? "",

        // Overall Project Duration (independent of billing period)
        projectStartDate: projectStart || null,
        projectEndDate: projectEnd || null,
        projectDuration,

        // Billing period — ISO strings (YYYY-MM-DD) → formatted display + raw dates
        // Uses the actual billing period returned by backend from latest BillingAcquisition.
        // For NOT_ACQUIRED, strictly null and "—". Never fall back to project duration or localStorage!
        billingPeriodStart: hasPeriod ? cleanStart : null,
        billingPeriodEnd: hasPeriod ? cleanEnd : null,
        billingPeriod: hasPeriod ? formatBillingPeriod(cleanStart, cleanEnd) : "—",
        periodStart: hasPeriod ? cleanStart : "",
        periodEnd: hasPeriod ? cleanEnd : "",

        // Generation mode from invoice_generation_type: AUTOMATIC | MANUAL
        invoiceGeneration: cfg.generationMode ?? "MANUAL",

        // Refined acquisition status model: NOT_ACQUIRED | READY | PARTIALLY_READY | ALREADY_BILLED
        billingStatus: cfg.status ?? "NOT_ACQUIRED",
        lastInvoice: cfg.lastInvoice ?? null,

        // Payment Terms & Currency
        paymentTerms,
        currency: cfg.currency ?? fullConfig?.currencyCode ?? "USD",
        currencyId: cfg.currencyId ?? cfg.currency_id ?? cfg.currencyMasterId ?? 1,
        currency_id: cfg.currency_id ?? cfg.currencyId ?? 1,
        currencyCode: cfg.currencyCode ?? cfg.currency ?? fullConfig?.currencyCode ?? "USD",
      };
    });
  } catch (error) {
    console.error("[BillingDataAcquisition] fetchActiveBillingConfigurations failed:", error);
    // Return empty array so the page shows "no data" rather than crashing
    return [];
  }
}

/**
 * Maps a BillingSnapshot / acquisition execution result to a valid backend BillingAcquisitionStatus.
 *
 * Backend BillingAcquisitionStatus enum values:
 * - NOT_ACQUIRED
 * - READY
 * - PARTIALLY_READY
 * - ALREADY_BILLED
 *
 * BillingSnapshotStatus (e.g. READY_FOR_TAX, TAX_COMPLETED) belongs exclusively
 * to BillingSnapshot and must NEVER be passed to the BillingAcquisition API.
 */
export function mapToBillingAcquisitionStatus(snapshotStatus, isPartial = false) {
  if (isPartial) return "PARTIALLY_READY";
  const upper = String(snapshotStatus || "").trim().toUpperCase();
  if (["PARTIALLY_READY", "PARTIAL", "PENDING_APPROVAL"].includes(upper)) {
    return "PARTIALLY_READY";
  }
  if (["ALREADY_BILLED", "INVOICED", "BILLED"].includes(upper)) {
    return "ALREADY_BILLED";
  }
  // For any successfully acquired snapshot (READY_FOR_TAX, TAX_COMPLETED, READY):
  return "READY";
}

/**
 * Calls POST /api/billing-data-acquisition/acquire to register/update
 * a BillingAcquisition execution record for Phase 2 lifecycle tracking.
 * Strictly uses a valid BillingAcquisitionStatus (READY | PARTIALLY_READY).
 * Throws an Error if the API rejects the request so failures are never swallowed.
 */
export async function acquireBillingRecord(billingConfigurationId, periodStart, periodEnd, snapshotId = null, status = "READY", currencyId = 1) {
  if (!billingConfigurationId) {
    throw new Error("Missing billingConfigurationId: cannot record billing acquisition.");
  }
  const endpoint = `${AR_BASE_URL}/api/billing-data-acquisition/acquire`;
  try {
    const response = await api.post(endpoint, {
      billingConfigurationId,
      billingPeriodStart: periodStart,
      billingPeriodEnd: periodEnd,
      snapshotId,
      status,
      currencyId: currencyId,
    });
    return response.data;
  } catch (err) {
    console.error("[BillingDataAcquisition] acquire POST error:", err);
    const errorMsg =
      err.response?.data?.message ||
      err.message ||
      "Failed to record billing acquisition in backend.";
    throw new Error(errorMsg);
  }
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

function resolveCurrencyId(currency) {
  if (typeof currency === "number" && !isNaN(currency)) return currency;
  if (!currency) return 1;
  const str = String(currency).trim().toUpperCase();
  if (str === "1" || str === "INR" || str === "RS" || str === "RUPEES") return 1;
  if (str === "2" || str === "USD" || str === "DOLLAR") return 2;
  if (str === "3" || str === "EUR" || str === "EURO") return 3;
  if (str === "4" || str === "GBP" || str === "POUND") return 4;
  const num = Number(str);
  return !isNaN(num) && num > 0 ? num : 1;
}

/**
 * Calls GET /api/v1/billing-snapshots/by-period to retrieve an existing snapshot by project and period.
 */
export async function getBillingSnapshotByPeriod(projectId, billingPeriodStart, billingPeriodEnd) {
  const cleanStart = toIsoDateOnly(billingPeriodStart);
  const cleanEnd = toIsoDateOnly(billingPeriodEnd);
  const numericId = Number(projectId);

  if (!numericId || isNaN(numericId) || !cleanStart || !cleanEnd) return null;

  const endpoint = `${AR_BASE_URL}/api/v1/billing-snapshots/by-period`;

  try {
    const response = await api.get(endpoint, {
      params: {
        projectId: numericId,
        billingPeriodStart: cleanStart,
        billingPeriodEnd: cleanEnd,
      },
    });

    const json = response.data;
    if (!json || json.success === false || !json.data) {
      return null;
    }

    const snapshot = json.data;
    if (!snapshot || !snapshot.snapshotId) {
      return null;
    }

    const snapStart = toIsoDateOnly(snapshot.billingPeriodStart) || cleanStart;
    const snapEnd = toIsoDateOnly(snapshot.billingPeriodEnd) || cleanEnd;
    const formattedPeriod = formatBillingPeriod(snapStart, snapEnd);

    const laborRecords = (snapshot.timesheets || []).map((t, idx) => ({
      id: t.sourceReferenceId || `labor-${idx}`,
      employee: t.employee,
      workDate: toIsoDateOnly(t.workDate),
      hours: t.hours,
      rate: t.rate,
      amount: t.amount,
      approvalStatus: t.approvalStatus || "Approved",
      role: t.role,
    }));

    const result = {
      success: true,
      snapshotId: snapshot.snapshotId,
      snapshotNumber: snapshot.snapshotNumber,
      billingPeriodStart: snapStart,
      billingPeriodEnd: snapEnd,
      billingPeriod: formattedPeriod,
      subtotal: snapshot.subtotal ?? snapshot.totalAmount ?? 0,
      totalAmount: snapshot.totalAmount ?? snapshot.subtotal ?? 0,
      status: snapshot.status || "READY",
      acquisitionStatus: snapshot.acquisitionStatus || "READY",
      laborRecords,
      timesheets: laborRecords,
      isExisting: true,
      message: json.message || "Existing snapshot loaded",
    };

    saveAcquiredSnapshotMetadata(numericId, {
      snapshotId: snapshot.snapshotId,
      snapshotNumber: snapshot.snapshotNumber,
      status: snapshot.status || "READY",
      billingPeriodStart: snapStart,
      billingPeriodEnd: snapEnd,
      billingPeriod: formattedPeriod,
      subtotal: result.subtotal,
      totalAmount: result.totalAmount,
    });

    return result;
  } catch (err) {
    console.warn(
      "[billingDataAcquisitionService] getBillingSnapshotByPeriod request failed:",
      err.response?.status,
      err.response?.data?.message || err.message
    );
    return null;
  }
}

/**
 * Real TMS integration via the AR backend.
 *
 * Calls POST /api/v1/billing-snapshots which:
 *   1. Fetches approved billable timesheets from TMS (GET /api/timesheets/billing)
 *   2. Merges the TM rate from the Billing Configuration
 *   3. Validates, saves a BillingSnapshot, and returns the line items
 *
 * Request payload contains only the 4 mandatory fields required by the contract:
 *   projectId, billingConfigurationId, billingPeriodStart, billingPeriodEnd
 */
export async function createBillingSnapshot(projectId, periodFrom, periodTo, billingConfigurationId = null) {
  const numericId = Number(projectId);
  const finalProjectId = (isNaN(numericId) || !numericId) ? 9 : numericId;
  const endpoint = `${AR_BASE_URL}/api/v1/billing-snapshots`;

  const cleanStart = toIsoDateOnly(periodFrom);
  const cleanEnd = toIsoDateOnly(periodTo);

  console.log(`[AR Integration] Calling POST ${endpoint} for projectId=${finalProjectId}, billingConfigurationId=${billingConfigurationId}, periodStart=${cleanStart}, periodEnd=${cleanEnd}`);

  const payload = {
    projectId: finalProjectId,
    billingConfigurationId: billingConfigurationId,
    billingPeriodStart: cleanStart,
    billingPeriodEnd: cleanEnd,
  };

  try {
    const response = await api.post(endpoint, payload);
    const json = response.data;

    // Check if business logic response explicitly indicates failure (e.g. success: false)
    if (json && json.success === false) {
      return {
        success: false,
        status: "NO_DATA",
        message: json.message || "No timesheets were acquired for the requested billing period",
        data: null,
        laborRecords: [],
        subtotal: 0,
        totalAmount: 0,
        snapshotId: null,
        snapshotNumber: null,
        billingPeriodStart: cleanStart,
        billingPeriodEnd: cleanEnd,
        billingPeriod: formatBillingPeriod(cleanStart, cleanEnd),
      };
    }

    const snapshot = json?.data || json;

    const snapStart = toIsoDateOnly(snapshot?.billingPeriodStart) || cleanStart;
    const snapEnd = toIsoDateOnly(snapshot?.billingPeriodEnd) || cleanEnd;
    const formattedPeriod = formatBillingPeriod(snapStart, snapEnd);

    // Map AR TimesheetLineItemDto → UI labor record shape
    const allLaborRecords = (snapshot?.timesheets || []).map((t, idx) => ({
      id: t.sourceReferenceId || `labor-${idx}`,
      employee: t.employee,
      workDate: toIsoDateOnly(t.workDate),           // "YYYY-MM-DD"
      hours: t.hours,
      rate: t.rate,
      amount: t.amount,
      approvalStatus: t.approvalStatus || "Approved",
      role: t.role,
    }));

    if (!allLaborRecords || allLaborRecords.length === 0) {
      return {
        success: false,
        status: "NO_BILLABLE_DATA",
        billingStatus: "NO_BILLABLE_DATA",
        reasonCode: "NO_TIMESHEETS_FOR_PERIOD",
        message: "No billable timesheet activity was found for this project during the selected billing period.",
        data: snapshot,
        laborRecords: [],
        subtotal: 0,
        totalAmount: 0,
        snapshotId: snapshot?.snapshotId || null,
        snapshotNumber: snapshot?.snapshotNumber || null,
        billingPeriodStart: snapStart,
        billingPeriodEnd: snapEnd,
        billingPeriod: formattedPeriod,
      };
    }

    const approvedTimesheets = allLaborRecords.filter(r => r.approvalStatus === "Approved" || r.approvalStatus === "APPROVED");
    const pendingTimesheets = allLaborRecords.filter(r => r.approvalStatus === "Pending Approval" || r.approvalStatus === "Pending" || r.approvalStatus === "PENDING");

    const approvedCount = approvedTimesheets.length;
    const pendingCount = pendingTimesheets.length;
    const approvedHours = approvedTimesheets.reduce((acc, r) => acc + Number(r.hours || 0), 0);
    const pendingHours = pendingTimesheets.reduce((acc, r) => acc + Number(r.hours || 0), 0);

    const readiness = {
      requiredCount: allLaborRecords.length,
      approvedCount,
      pendingCount,
      approvedHours,
      pendingHours,
      pendingTimesheets,
      approvedTimesheets,
    };

    if (approvedCount === 0 && pendingCount > 0) {
      return {
        success: false,
        status: "PENDING_APPROVAL",
        billingStatus: "PENDING_APPROVAL",
        reasonCode: "ALL_TIMESHEETS_PENDING",
        message: `Timesheets were found for this billing period, but none have been approved for billing yet (${pendingCount} pending, ${pendingHours} hrs).`,
        data: snapshot,
        laborRecords: [],
        allRecords: allLaborRecords,
        subtotal: 0,
        totalAmount: 0,
        snapshotId: snapshot?.snapshotId || null,
        snapshotNumber: snapshot?.snapshotNumber || null,
        billingPeriodStart: snapStart,
        billingPeriodEnd: snapEnd,
        billingPeriod: formattedPeriod,
        readiness,
      };
    }

    if (pendingCount > 0) {
      return {
        success: false,
        status: "PARTIALLY_READY",
        billingStatus: "PARTIALLY_READY",
        reasonCode: "SOME_TIMESHEETS_PENDING",
        message: `${pendingCount} timesheet(s) totaling ${pendingHours} hrs require manager approval before billing snapshot can be completed.`,
        data: snapshot,
        laborRecords: approvedTimesheets,
        allRecords: allLaborRecords,
        subtotal: sumAmount(approvedTimesheets),
        totalAmount: sumAmount(approvedTimesheets),
        snapshotId: snapshot?.snapshotId || null,
        snapshotNumber: snapshot?.snapshotNumber || null,
        billingPeriodStart: snapStart,
        billingPeriodEnd: snapEnd,
        billingPeriod: formattedPeriod,
        readiness,
      };
    }

    const subtotalVal = snapshot?.subtotal || sumAmount(approvedTimesheets);
    const totalVal = snapshot?.totalAmount || sumAmount(approvedTimesheets);
    const finalStatus = snapshot?.status || "READY_FOR_TAX";

    const result = {
      success: true,
      snapshotId: snapshot?.snapshotId || null,
      snapshotNumber: snapshot?.snapshotNumber || null,
      billingPeriodStart: snapStart,
      billingPeriodEnd: snapEnd,
      billingPeriod: formattedPeriod,
      subtotal: subtotalVal,
      totalAmount: totalVal,
      status: finalStatus,
      billingStatus: finalStatus,
      laborRecords: approvedTimesheets,
      timesheets: approvedTimesheets,
      allRecords: allLaborRecords,
      isExisting: Boolean(json?.message?.includes("already exists")),
      message: json?.message || "Billing snapshot acquired successfully. All required timesheets are approved.",
      readiness,
    };

    if (snapshot?.snapshotId) {
      saveAcquiredSnapshotMetadata(finalProjectId, {
        snapshotId: snapshot.snapshotId,
        snapshotNumber: snapshot.snapshotNumber,
        status: finalStatus,
        billingPeriodStart: snapStart,
        billingPeriodEnd: snapEnd,
        billingPeriod: formattedPeriod,
        subtotal: subtotalVal,
        totalAmount: totalVal,
      });
    }

    return result;
  } catch (error) {
    const errorBody = error?.response?.data || {};
    if (errorBody?.message?.includes("already exists")) {
      const existing = await getBillingSnapshotByPeriod(finalProjectId, cleanStart, cleanEnd);
      if (existing && existing.snapshotId) return existing;
    }
    throw new Error(errorBody?.message || error?.message || "We couldn't retrieve billing data at this time. Please try again.");
  }
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

  let createdSnapshotId = null;
  let acquisitionStatus = "READY";

  const cleanPeriodFrom = toIsoDateOnly(periodFrom);
  const cleanPeriodTo = toIsoDateOnly(periodTo);

  const billingTypeUpper = String(context.billingType || "").trim().toUpperCase().replace(/\s+/g, "_");
  const isTM = ["TIME_MATERIAL", "TIMESHEET_BASED", "TIME_AND_MATERIAL"].includes(billingTypeUpper);
  const isMilestone = ["MILESTONE", "MILESTONE_BASED"].includes(billingTypeUpper);
  const isRecurring = ["RECURRING", "SUBSCRIPTION", "SUBSCRIPTION_BASED"].includes(billingTypeUpper);
  const isFixed = ["FIXED_PRICE", "FIXED"].includes(billingTypeUpper);

  // ── TIME_MATERIAL: Real AR backend snapshot engine ──────────────
  if (isTM) {
    try {
      const snapshot = await createBillingSnapshot(
        context.projectId || context.id,
        cleanPeriodFrom,
        cleanPeriodTo,
        context.billingConfigurationId,
        context
      );

      const actualSnapStart = snapshot?.billingPeriodStart || cleanPeriodFrom;
      const actualSnapEnd = snapshot?.billingPeriodEnd || cleanPeriodTo;
      const actualSnapPeriod = snapshot?.billingPeriod || formatBillingPeriod(actualSnapStart, actualSnapEnd);

      if (
        snapshot &&
        snapshot.snapshotId &&
        (snapshot.status === "READY" ||
          snapshot.status === "READY_FOR_TAX" ||
          snapshot.status === "TAX_COMPLETED" ||
          snapshot.success)
      ) {
        createdSnapshotId = snapshot.snapshotId;
        const finalStatus = snapshot.status || "READY_FOR_TAX";
        acquisitionStatus = mapToBillingAcquisitionStatus(finalStatus, false);
        results.labor = {
          applicable: true,
          status: "success",
          records: snapshot.laborRecords || [],
          amount: snapshot.subtotal || sumAmount(snapshot.laborRecords || []),
          lastFetchedAt: fetchedAt,
          snapshotId: snapshot.snapshotId,
          snapshotNumber: snapshot.snapshotNumber,
          billingPeriodStart: actualSnapStart,
          billingPeriodEnd: actualSnapEnd,
          billingPeriod: actualSnapPeriod,
          readiness: snapshot.readiness,
        };
        results.success = true;
        results.snapshotId = snapshot.snapshotId;
        results.snapshotNumber = snapshot.snapshotNumber;
        results.billingPeriodStart = actualSnapStart;
        results.billingPeriodEnd = actualSnapEnd;
        results.billingPeriod = actualSnapPeriod;
        results.billingStatus = finalStatus;
        results.message = snapshot.message || "Billing snapshot acquired successfully. All required timesheets are approved.";
      } else if (snapshot && snapshot.status === "PARTIALLY_READY") {
        results.labor = {
          applicable: true,
          status: "partially_ready",
          records: snapshot.laborRecords || [],
          amount: snapshot.subtotal || sumAmount(snapshot.laborRecords || []),
          lastFetchedAt: fetchedAt,
          snapshotId: snapshot.snapshotId,
          snapshotNumber: snapshot.snapshotNumber,
          billingPeriodStart: actualSnapStart,
          billingPeriodEnd: actualSnapEnd,
          billingPeriod: actualSnapPeriod,
          readiness: snapshot.readiness,
        };
        results.success = false;
        results.billingStatus = "PARTIALLY_READY";
        results.billingPeriodStart = actualSnapStart;
        results.billingPeriodEnd = actualSnapEnd;
        results.billingPeriod = actualSnapPeriod;
        results.message = snapshot.message || "Timesheet approvals pending.";
      } else if (snapshot && snapshot.status === "PENDING_APPROVAL") {
        results.labor = {
          applicable: true,
          status: "pending_approval",
          records: [],
          amount: 0,
          lastFetchedAt: fetchedAt,
          billingPeriodStart: actualSnapStart,
          billingPeriodEnd: actualSnapEnd,
          billingPeriod: actualSnapPeriod,
          readiness: snapshot.readiness,
        };
        results.success = false;
        results.billingStatus = "PENDING_APPROVAL";
        results.billingPeriodStart = actualSnapStart;
        results.billingPeriodEnd = actualSnapEnd;
        results.billingPeriod = actualSnapPeriod;
        results.message = snapshot.message || "Timesheets found, but none are approved yet.";
      } else {
        results.labor = {
          applicable: true,
          status: "no_data",
          records: [],
          amount: 0,
          lastFetchedAt: fetchedAt,
          billingPeriodStart: actualSnapStart,
          billingPeriodEnd: actualSnapEnd,
          billingPeriod: actualSnapPeriod,
        };
        results.success = false;
        results.billingStatus = "NO_BILLABLE_DATA";
        results.billingPeriodStart = actualSnapStart;
        results.billingPeriodEnd = actualSnapEnd;
        results.billingPeriod = actualSnapPeriod;
        results.message = snapshot?.message || "No billable timesheet activity was found for this project during the selected billing period.";
      }
    } catch (error) {
      console.error("[BillingDataAcquisition] Snapshot acquisition failed:", error);
      results.labor = {
        applicable: true,
        status: "error",
        error: error?.message || "We couldn't retrieve billing data at this time. Please try again.",
        records: [],
        amount: 0,
        lastFetchedAt: fetchedAt,
      };
      results.success = false;
      results.billingStatus = "ACQUISITION_FAILED";
      results.message = error?.message || "We couldn't retrieve billing data at this time. Please try again.";
    }

    ["contract", "milestone", "recurring", "expense"].forEach((type) => {
      results[type] = { applicable: false, status: "not_applicable", records: [], amount: 0, lastFetchedAt: null };
    });
  } else if (isMilestone) {
    results.milestone = {
      applicable: true,
      status: "empty",
      records: [],
      amount: 0,
      lastFetchedAt: fetchedAt,
    };
    results.success = false;
    results.billingStatus = "NO_DATA";
    results.message = "No billable milestone records found for the selected billing period.";
    ["labor", "contract", "recurring", "expense"].forEach((type) => {
      results[type] = { applicable: false, status: "not_applicable", records: [], amount: 0, lastFetchedAt: null };
    });
  } else if (isRecurring) {
    results.recurring = {
      applicable: true,
      status: "empty",
      records: [],
      amount: 0,
      lastFetchedAt: fetchedAt,
    };
    results.success = false;
    results.billingStatus = "NO_DATA";
    results.message = "No billable recurring charges found for the selected billing period.";
    ["labor", "contract", "milestone", "expense"].forEach((type) => {
      results[type] = { applicable: false, status: "not_applicable", records: [], amount: 0, lastFetchedAt: null };
    });
  } else {
    results.contract = {
      applicable: true,
      status: "empty",
      records: [],
      amount: 0,
      lastFetchedAt: fetchedAt,
    };
    results.success = false;
    results.billingStatus = "NO_DATA";
    results.message = "No billable contract records found for the selected billing period.";
    ["labor", "milestone", "recurring", "expense"].forEach((type) => {
      results[type] = { applicable: false, status: "not_applicable", records: [], amount: 0, lastFetchedAt: null };
    });
  }

  results.tool = {
    applicable: applicable.tool,
    status: !applicable.tool ? "not_applicable" : "empty",
    records: [],
    amount: 0,
    lastFetchedAt: fetchedAt,
  };

  // Record acquisition result in backend tracking table ONLY if snapshot creation succeeded with valid data.
  // The overall Acquire Snapshot operation is only considered successful when BOTH operations succeed:
  // 1. BillingSnapshot creation succeeds.
  // 2. BillingAcquisition record creation succeeds.
  if (results.success && context?.billingConfigurationId && createdSnapshotId) {
    const isPartial = results.billingStatus === "PARTIALLY_READY" || results.labor?.status === "partially_ready";
    const recordStatus = mapToBillingAcquisitionStatus(acquisitionStatus || results.billingStatus, isPartial);

    await acquireBillingRecord(
      context.billingConfigurationId,
      cleanPeriodFrom,
      cleanPeriodTo,
      createdSnapshotId,
      recordStatus,
      context.currencyId || context.currency_id || 1
    );
  }

  return results;
}

const REMINDER_COOLDOWN_MS = 5 * 60 * 1000; // 5-minute anti-spam cooldown

/**
 * Sends a notification/email reminder to the assigned Project Manager for pending timesheets.
 * Enforces 5-minute rate limit cooldown per project/billing period to prevent spam.
 */
export async function sendProjectManagerReminder(config, pendingTimesheets = [], customPM = null) {
  if (!config) return { success: false, message: "Invalid project configuration" };
  const projectId = config.projectId || config.id || "PRJ";
  const periodKey = `${projectId}_${config.periodStart || config.billingPeriod}_${config.periodEnd || ""}`;
  const storageKey = `pm_reminder_log_${periodKey}`;

  const pmName = customPM?.name || config.projectManager || "Alex Morgan (Project Lead)";
  const pmEmail = customPM?.email || config.projectManagerEmail || "alex.morgan@company.com";

  // Check rate limit log
  try {
    const rawLog = localStorage.getItem(storageKey);
    if (rawLog) {
      const log = JSON.parse(rawLog);
      const elapsed = Date.now() - log.sentAt;
      if (elapsed < REMINDER_COOLDOWN_MS) {
        const minutesAgo = Math.max(1, Math.ceil(elapsed / 60000));
        return {
          success: false,
          rateLimited: true,
          message: `Reminder was already sent to Project Manager (${pmName}) ${minutesAgo} minute(s) ago.`,
        };
      }
    }
  } catch (e) {
    console.error("Error reading reminder rate limit log:", e);
  }

  // Record reminder dispatch
  const newLog = {
    projectId,
    billingPeriod: config.billingPeriod,
    recipient: pmEmail,
    recipientName: pmName,
    sentAt: Date.now(),
    pendingCount: pendingTimesheets.length,
  };

  try {
    localStorage.setItem(storageKey, JSON.stringify(newLog));
  } catch (e) {
    console.error("Error saving reminder log:", e);
  }

  // Simulate network dispatch delay
  await delay(400);

  return {
    success: true,
    rateLimited: false,
    message: `Reminder notification sent to Project Manager (${pmName}) for ${pendingTimesheets.length || 3} pending timesheet(s).`,
    recipient: pmName,
    sentAt: new Date(newLog.sentAt).toISOString(),
  };
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

/**
 * Single source of truth for AR Acquisition Status Normalization.
 *
 * Authoritative lifecycle rule:
 * - If no BillingSnapshot exists -> NOT_ACQUIRED.
 * - If BillingSnapshot exists -> BillingSnapshot.status is authoritative.
 *
 * Standalone BillingAcquisitionStatus.READY must NOT be converted to READY_FOR_TAX
 * without an existing BillingSnapshot.
 *
 * Fallback rule:
 * - null/undefined falls back to NOT_ACQUIRED.
 * - An unknown/unrecognized non-null status is not silently treated as NOT_ACQUIRED;
 *   a warning is logged and the unmapped status is returned.
 */
export function normalizeAcquisitionStatus(rawStatusOrConfig, hasSnapshotParam) {
  let rawStatus;
  let hasSnapshot;

  if (rawStatusOrConfig && typeof rawStatusOrConfig === "object") {
    rawStatus = rawStatusOrConfig.billingStatus || rawStatusOrConfig.status;
    hasSnapshot =
      hasSnapshotParam !== undefined
        ? Boolean(hasSnapshotParam)
        : Boolean(rawStatusOrConfig.snapshotId || rawStatusOrConfig.existingSnapshot);
  } else {
    rawStatus = rawStatusOrConfig;
    hasSnapshot = Boolean(hasSnapshotParam);
  }

  // Fallback for null/undefined/empty
  if (rawStatus == null || rawStatus === "") {
    return "NOT_ACQUIRED";
  }

  const s = String(rawStatus).trim().toUpperCase().replace(/\s+/g, "_");

  // 1. Explicit NOT_ACQUIRED representations
  if (["NOT_ACQUIRED", "NOTACQUIRED", "NOT_ACQUIRED_YET"].includes(s)) {
    return "NOT_ACQUIRED";
  }

  // 2. Standalone acquisition status READY (BillingAcquisitionStatus.READY):
  // If no snapshot exists, source data is ready but not yet acquired -> NOT_ACQUIRED
  if (s === "READY" && !hasSnapshot) {
    return "NOT_ACQUIRED";
  }

  // 3. Known snapshot lifecycle statuses
  if (["READY_FOR_TAX", "READY_TO_TAX", "SUCCESS", "ACQUIRED"].includes(s)) {
    return "READY_FOR_TAX";
  }

  // READY with an existing snapshot
  if (s === "READY" && hasSnapshot) {
    return "READY_FOR_TAX";
  }

  // IN_TAX grouped under READY_FOR_TAX for acquisition queue filtering
  if (s === "IN_TAX") {
    return "READY_FOR_TAX";
  }

  if (s === "TAX_COMPLETED") {
    return "TAX_COMPLETED";
  }

  if (["INVOICED", "ALREADY_BILLED", "BILLED"].includes(s)) {
    return "INVOICED";
  }

  // Known transient / pre-snapshot acquisition workflow statuses
  if (["VALIDATING", "ACQUIRING", "IN_PROGRESS"].includes(s)) {
    return "NOT_ACQUIRED";
  }

  // 4. Fallback for unrecognized non-null statuses:
  // Do NOT silently treat unknown/unrecognized non-null status as NOT_ACQUIRED.
  console.warn(
    `[billingDataAcquisitionService] Unrecognized billing acquisition status: "${rawStatus}". Status cannot be mapped to a known lifecycle state.`
  );
  return s;
}

/**
 * Calculates executive KPI counts over the total active project population.
 */
export function getAcquisitionKpis(configs = []) {
  const totalSetups = configs.length;

  let notAcquiredCount = 0;
  let readyForTaxCount = 0;
  let taxCompletedCount = 0;
  let invoicedCount = 0;

  configs.forEach((c) => {
    const hasSnapshot = Boolean(c.snapshotId || c.existingSnapshot);
    const st = normalizeAcquisitionStatus(c.billingStatus, hasSnapshot);
    if (st === "NOT_ACQUIRED") {
      notAcquiredCount++;
    } else if (st === "READY_FOR_TAX") {
      readyForTaxCount++;
    } else if (st === "TAX_COMPLETED") {
      taxCompletedCount++;
    } else if (st === "INVOICED") {
      invoicedCount++;
    }
  });

  return {
    totalSetups,
    notAcquired: notAcquiredCount,
    readyForTax: readyForTaxCount,
    taxCompleted: taxCompletedCount,
    invoiced: invoicedCount,
    // Backwards compatibility aliases:
    ready: readyForTaxCount,
    needsApproval: 0,
  };
}


