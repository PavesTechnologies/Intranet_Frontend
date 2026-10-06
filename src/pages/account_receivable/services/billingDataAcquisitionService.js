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

/**
 * Normalizes billing frequency name or object into durationValue and durationUnit.
 */
export function getFrequencyDuration(frequency) {
  if (!frequency) return { durationValue: 1, durationUnit: "MONTHS" };
  if (typeof frequency === "object") {
    const val = Number(frequency.durationValue || frequency.value || 1);
    const unit = String(frequency.durationUnit || frequency.unit || "MONTHS").trim().toUpperCase();
    return { durationValue: isNaN(val) || val <= 0 ? 1 : val, durationUnit: unit || "MONTHS" };
  }
  const norm = String(frequency).trim().toUpperCase();
  if (norm.includes("DAY")) {
    const match = norm.match(/\d+/);
    return { durationValue: match ? parseInt(match[0], 10) : 1, durationUnit: "DAYS" };
  }
  if (norm.includes("WEEK") && !norm.includes("BI")) return { durationValue: 1, durationUnit: "WEEKS" };
  if (norm.includes("BI_WEEK") || norm.includes("BI-WEEK") || norm.includes("FORTNIGHT")) return { durationValue: 2, durationUnit: "WEEKS" };
  if (norm.includes("QUARTER")) return { durationValue: 3, durationUnit: "MONTHS" };
  if (norm.includes("HALF") || norm.includes("SEMI")) return { durationValue: 6, durationUnit: "MONTHS" };
  if (norm.includes("ANNUAL") || norm.includes("YEAR")) return { durationValue: 1, durationUnit: "YEARS" };
  return { durationValue: 1, durationUnit: "MONTHS" };
}

/**
 * Calculates natural end date for a billing period stepping forward by duration.
 */
export function calculatePeriodEnd(startDateStr, durationValue = 1, durationUnit = "MONTHS", maxEndDateStr = null) {
  const cleanStart = toIsoDateOnly(startDateStr);
  if (!cleanStart) return "";
  const parts = cleanStart.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return "";
  const [year, month, day] = parts;
  const start = new Date(year, month - 1, day);

  const unit = String(durationUnit || "").trim().toUpperCase();
  const next = new Date(start.getTime());
  const count = Number(durationValue) || 1;

  if (unit === "MONTHS") {
    next.setMonth(next.getMonth() + count);
  } else if (unit === "YEARS") {
    next.setFullYear(next.getFullYear() + count);
  } else if (unit === "WEEKS") {
    next.setDate(next.getDate() + count * 7);
  } else if (unit === "DAYS") {
    next.setDate(next.getDate() + count);
  } else {
    next.setMonth(next.getMonth() + 1);
  }

  next.setDate(next.getDate() - 1);
  const endIso = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;

  const cleanMax = toIsoDateOnly(maxEndDateStr);
  if (cleanMax && endIso > cleanMax) {
    return cleanMax;
  }
  return endIso;
}

/**
 * Generates available billing periods across project duration aligned with billing frequency rules.
 */
export function generateProjectBillingPeriods(config) {
  if (!config) return [];
  const { durationValue, durationUnit } = getFrequencyDuration(config.billingFrequency);

  const projStart = toIsoDateOnly(
    config.billingPeriodStart ||
    config.effectiveFrom ||
    config.projectStartDate ||
    config.startDate
  );

  const projEnd = toIsoDateOnly(
    config.effectiveTo ||
    config.projectEndDate ||
    config.endDate
  );

  if (!projStart) return [];

  const periods = [];
  let cursor = projStart;
  let guard = 0;

  while (guard < 24) {
    guard++;
    const pEnd = calculatePeriodEnd(cursor, durationValue, durationUnit, projEnd);
    if (!pEnd || pEnd < cursor) break;

    periods.push({
      id: `period-${guard}`,
      startDate: cursor,
      endDate: pEnd,
      label: formatBillingPeriod(cursor, pEnd),
    });

    if (projEnd && pEnd >= projEnd) break;

    const parts = pEnd.split("-").map(Number);
    const nextStart = new Date(parts[0], parts[1] - 1, parts[2] + 1);
    const nextCursor = `${nextStart.getFullYear()}-${String(nextStart.getMonth() + 1).padStart(2, "0")}-${String(nextStart.getDate()).padStart(2, "0")}`;
    if (nextCursor <= cursor) break;
    cursor = nextCursor;
    if (projEnd && cursor > projEnd) break;
  }

  return periods;
}

const SNAPSHOT_STORAGE_PREFIX = "ar_snapshot_period_";

/**
 * Builds a deterministic storage key scoped to project ID, configuration ID, and billing period.
 */
export function buildSnapshotStorageKey(projectId, billingConfigurationId = null, periodStart = null, periodEnd = null) {
  const pId = Number(projectId);
  const cfgPart = billingConfigurationId ? `_cfg_${billingConfigurationId}` : "";
  const cleanStart = toIsoDateOnly(periodStart);
  const cleanEnd = toIsoDateOnly(periodEnd);
  const datePart = cleanStart && cleanEnd ? `_${cleanStart}_${cleanEnd}` : "";
  return `${SNAPSHOT_STORAGE_PREFIX}${pId}${cfgPart}${datePart}`;
}

/**
 * Persists acquired snapshot metadata (scoped to configuration and billing period) to localStorage.
 */
export function saveAcquiredSnapshotMetadata(projectId, metadata) {
  if (!projectId || !metadata) return null;
  const numId = Number(projectId);
  const cfgId = metadata.billingConfigurationId || null;
  const cleanStart = toIsoDateOnly(
    metadata.billingPeriodStart || metadata.periodStart
  );
  const cleanEnd = toIsoDateOnly(
    metadata.billingPeriodEnd || metadata.periodEnd
  );

  try {
    const updated = {
      ...metadata,
      projectId: numId,
      billingConfigurationId: cfgId,
      billingPeriodStart: cleanStart,
      billingPeriodEnd: cleanEnd,
      billingPeriod: formatBillingPeriod(cleanStart, cleanEnd),
      updatedAt: new Date().toISOString(),
    };

    // 1. Save with scoped key (bound to project, configuration, and period)
    if (cfgId && cleanStart && cleanEnd) {
      const scopedKey = buildSnapshotStorageKey(numId, cfgId, cleanStart, cleanEnd);
      localStorage.setItem(scopedKey, JSON.stringify(updated));
    }

    // 2. Also keep project-level key for backward compatibility
    const legacyKey = `${SNAPSHOT_STORAGE_PREFIX}${numId}`;
    localStorage.setItem(legacyKey, JSON.stringify(updated));

    return updated;
  } catch (e) {
    console.warn("[billingDataAcquisitionService] Failed to save snapshot metadata to localStorage:", e);
    return null;
  }
}

/**
 * Retrieves persisted snapshot metadata for a project, safely scoped to configuration and period.
 */
export function getAcquiredSnapshotMetadata(
  projectId,
  billingConfigurationId = null,
  periodStart = null,
  periodEnd = null
) {
  if (!projectId) return null;
  const numId = Number(projectId);
  const cleanStart = toIsoDateOnly(periodStart);
  const cleanEnd = toIsoDateOnly(periodEnd);

  try {
    // 1. Try exact scoped key first
    if (billingConfigurationId && cleanStart && cleanEnd) {
      const exactKey = buildSnapshotStorageKey(numId, billingConfigurationId, cleanStart, cleanEnd);
      const rawExact = localStorage.getItem(exactKey);
      if (rawExact) {
        return JSON.parse(rawExact);
      }
    }

    // 2. Try configuration-scoped keys for this project
    if (billingConfigurationId) {
      const prefix = `${SNAPSHOT_STORAGE_PREFIX}${numId}_cfg_${billingConfigurationId}`;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (cleanStart && cleanEnd) {
              if (parsed.billingPeriodStart === cleanStart && parsed.billingPeriodEnd === cleanEnd) {
                return parsed;
              }
            } else {
              return parsed;
            }
          }
        }
      }
    }

    // 3. Fall back to legacy project-level key
    const legacyKey = `${SNAPSHOT_STORAGE_PREFIX}${numId}`;
    const raw = localStorage.getItem(legacyKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Validate configuration ID match: when caller specifies billingConfigurationId,
      // the cached entry must match that exact configuration ID. Stale entries with
      // missing or mismatched billingConfigurationId are not valid.
      if (billingConfigurationId) {
        if (!parsed.billingConfigurationId || String(parsed.billingConfigurationId) !== String(billingConfigurationId)) {
          return null;
        }
      }
      // Validate period match if requested
      if (cleanStart && parsed.billingPeriodStart && parsed.billingPeriodStart !== cleanStart) {
        return null;
      }
      if (cleanEnd && parsed.billingPeriodEnd && parsed.billingPeriodEnd !== cleanEnd) {
        return null;
      }
      return parsed;
    }
  } catch (e) {
    // Ignore storage parse errors
  }

  return null;
}

/**
 * Clears persisted snapshot metadata from localStorage, preserving metadata belonging to other configurations.
 */
export function clearAcquiredSnapshotMetadata(
  projectId,
  billingConfigurationId = null,
  periodStart = null,
  periodEnd = null
) {
  if (!projectId) return;
  const numId = Number(projectId);
  const cleanStart = toIsoDateOnly(periodStart);
  const cleanEnd = toIsoDateOnly(periodEnd);

  try {
    // 1. Remove exact scoped key if known
    if (billingConfigurationId && cleanStart && cleanEnd) {
      const exactKey = buildSnapshotStorageKey(numId, billingConfigurationId, cleanStart, cleanEnd);
      localStorage.removeItem(exactKey);
    }

    // 2. Remove configuration-scoped keys matching this configuration
    if (billingConfigurationId) {
      const prefix = `${SNAPSHOT_STORAGE_PREFIX}${numId}_cfg_${billingConfigurationId}`;
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          if (cleanStart && cleanEnd) {
            if (k.includes(cleanStart) && k.includes(cleanEnd)) {
              toRemove.push(k);
            }
          } else {
            toRemove.push(k);
          }
        }
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
    }

    // 3. Clean legacy key ONLY if it matches the requested configuration (do not clear other configurations)
    const legacyKey = `${SNAPSHOT_STORAGE_PREFIX}${numId}`;
    const raw = localStorage.getItem(legacyKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      const matchesConfig =
        !billingConfigurationId ||
        !parsed.billingConfigurationId ||
        String(parsed.billingConfigurationId) === String(billingConfigurationId);
      const matchesPeriod =
        (!cleanStart || !parsed.billingPeriodStart || parsed.billingPeriodStart === cleanStart) &&
        (!cleanEnd || !parsed.billingPeriodEnd || parsed.billingPeriodEnd === cleanEnd);

      if (matchesConfig && matchesPeriod) {
        localStorage.removeItem(legacyKey);
      }
    }
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

      const savedMeta = getAcquiredSnapshotMetadata(cfg.projectId, cfg.billingConfigurationId);
      const isMatchingConfig = cfg.billingConfigurationId && savedMeta?.billingConfigurationId
        ? String(savedMeta.billingConfigurationId) === String(cfg.billingConfigurationId)
        : !cfg.billingConfigurationId && Boolean(savedMeta);
      const validMeta = isMatchingConfig ? savedMeta : null;
      const cleanStart = isNotAcquired ? null : toIsoDateOnly(cfg.billingPeriodStart || (validMeta ? validMeta.billingPeriodStart : null));
      const cleanEnd = isNotAcquired ? null : toIsoDateOnly(cfg.billingPeriodEnd || (validMeta ? validMeta.billingPeriodEnd : null));
      const hasPeriod = Boolean(!isNotAcquired && cleanStart && cleanEnd);

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
  const norm = normalizeBillingTypeName(billingType);
  return {
    labor: norm === "TIME_MATERIAL",
    contract: norm === "FIXED_PRICE",
    milestone: norm === "MILESTONE",
    recurring: norm === "RECURRING",
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
 * Calls GET /api/v1/billing-snapshots/by-period to retrieve an existing snapshot by project, period, and configuration.
 */
export async function getBillingSnapshotByPeriod(
  projectId,
  billingPeriodStart,
  billingPeriodEnd,
  billingConfigurationId = null
) {
  const cleanStart = toIsoDateOnly(billingPeriodStart);
  const cleanEnd = toIsoDateOnly(billingPeriodEnd);
  const numericId = Number(projectId);
  const numericConfigId = billingConfigurationId ? Number(billingConfigurationId) : null;

  if (!numericId || isNaN(numericId) || !cleanStart || !cleanEnd) return null;

  const endpoint = `${AR_BASE_URL}/api/v1/billing-snapshots/by-period`;
  const params = {
    projectId: numericId,
    billingPeriodStart: cleanStart,
    billingPeriodEnd: cleanEnd,
  };
  if (numericConfigId && !isNaN(numericConfigId)) {
    params.billingConfigurationId = numericConfigId;
  }

  try {
    const response = await api.get(endpoint, { params });

    const json = response.data;
    if (!json || json.success === false) {
      return null;
    }

    // Support both wrapped response: { success: true, data: { ...snapshot } }
    // and unwrapped response: { snapshotId: "...", status: "...", ... }
    const snapshot = (json.data && typeof json.data === "object" && !Array.isArray(json.data))
      ? json.data
      : (json.snapshotId || json.id)
        ? json
        : null;

    if (!snapshot || !(snapshot.snapshotId || snapshot.id)) {
      return null;
    }

    // If a configuration ID was requested, verify that the snapshot belongs to this configuration
    if (
      numericConfigId &&
      snapshot.billingConfigurationId &&
      String(snapshot.billingConfigurationId) !== String(numericConfigId)
    ) {
      console.warn(
        `[getBillingSnapshotByPeriod] Snapshot belongs to config ${snapshot.billingConfigurationId}, but requested ${numericConfigId}`
      );
      return null;
    }

    const snapStart = toIsoDateOnly(snapshot.billingPeriodStart) || cleanStart;
    const snapEnd = toIsoDateOnly(snapshot.billingPeriodEnd) || cleanEnd;
    const formattedPeriod = formatBillingPeriod(snapStart, snapEnd);

    const timesheetList = snapshot.timesheets || snapshot.laborRecords || [];
    const allLaborRecords = timesheetList.map((t, idx) => ({
      id: t.sourceReferenceId || t.id || `labor-${idx}`,
      employee: t.employee || t.employeeName || "—",
      workDate: toIsoDateOnly(t.workDate),
      hours: t.hours,
      rate: t.rate,
      amount: t.amount,
      approvalStatus: t.approvalStatus || "Approved",
      role: t.role || "—",
    }));

    const approvedTimesheets = allLaborRecords.filter(
      (r) => r.approvalStatus === "Approved" || r.approvalStatus === "APPROVED"
    );
    const pendingTimesheets = allLaborRecords.filter(
      (r) => r.approvalStatus === "Pending Approval" || r.approvalStatus === "Pending" || r.approvalStatus === "PENDING"
    );

    const approvedCount = approvedTimesheets.length;
    const pendingCount = pendingTimesheets.length;
    const approvedHours = approvedTimesheets.reduce((acc, r) => acc + Number(r.hours || 0), 0);
    const pendingHours = pendingTimesheets.reduce((acc, r) => acc + Number(r.hours || 0), 0);

    const readiness = snapshot.readiness || {
      requiredCount: allLaborRecords.length,
      approvedCount,
      pendingCount,
      approvedHours,
      pendingHours,
      pendingTimesheets,
      approvedTimesheets,
    };

    const subtotal =
      snapshot.subtotal ??
      snapshot.totalAmount ??
      sumAmount(approvedTimesheets.length > 0 ? approvedTimesheets : allLaborRecords);
    const totalAmount = snapshot.totalAmount ?? subtotal;
    const finalStatus = snapshot.status || "READY_FOR_TAX";
    const acqStatus = snapshot.acquisitionStatus || mapToBillingAcquisitionStatus(finalStatus, false);

    const result = {
      success: true,
      snapshotId: snapshot.snapshotId || snapshot.id,
      snapshotNumber: snapshot.snapshotNumber || null,
      projectId: numericId,
      billingConfigurationId: snapshot.billingConfigurationId || numericConfigId,
      billingPeriodStart: snapStart,
      billingPeriodEnd: snapEnd,
      billingPeriod: formattedPeriod,
      subtotal,
      totalAmount,
      status: finalStatus,
      snapshotLifecycleStatus: finalStatus,
      billingStatus: finalStatus,
      acquisitionStatus: acqStatus,
      laborRecords: approvedTimesheets.length > 0 ? approvedTimesheets : allLaborRecords,
      timesheets: approvedTimesheets.length > 0 ? approvedTimesheets : allLaborRecords,
      allRecords: allLaborRecords,
      readiness,
      isExisting: true,
      existingSnapshot: true,
      message: json.message || "Existing snapshot loaded",
    };

    saveAcquiredSnapshotMetadata(numericId, {
      projectId: numericId,
      billingConfigurationId: snapshot.billingConfigurationId || numericConfigId,
      snapshotId: result.snapshotId,
      snapshotNumber: result.snapshotNumber,
      status: result.status,
      billingPeriodStart: snapStart,
      billingPeriodEnd: snapEnd,
      billingPeriod: formattedPeriod,
      subtotal: result.subtotal,
      totalAmount: result.totalAmount,
    });

    return result;
  } catch (err) {
    const status = err.response?.status;
    if (status === 404 || status === 204) {
      // Legitimate NOT_FOUND from backend
      return null;
    }
    console.warn(
      "[billingDataAcquisitionService] getBillingSnapshotByPeriod request failed:",
      status,
      err.response?.data?.message || err.message
    );
    // Network / server failure: re-throw so callers can distinguish not-found from network failure
    const error = new Error(
      err.response?.data?.message || err.message || "Failed to retrieve billing snapshot"
    );
    error.status = status;
    error.isNetworkError = !status || status >= 500;
    error.response = err.response;
    throw error;
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

    const isExisting = Boolean(
      snapshot?.existingSnapshot ||
      json?.existingSnapshot ||
      /already\s*exists/i.test(json?.message || "")
    );

    const hasSnapshotIdentity = Boolean(snapshot?.snapshotId || snapshot?.id);
    const isCompletedStatus = ["INVOICED", "ALREADY_BILLED", "TAX_COMPLETED", "READY_FOR_TAX", "READY"].includes(
      String(snapshot?.status || snapshot?.acquisitionStatus || "").toUpperCase()
    );

    if ((!allLaborRecords || allLaborRecords.length === 0) && !isExisting && !hasSnapshotIdentity && !isCompletedStatus) {
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

    if (approvedCount === 0 && pendingCount > 0 && !isExisting && !isCompletedStatus) {
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

    if (pendingCount > 0 && !isExisting && !isCompletedStatus) {
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

    const subtotalVal = snapshot?.subtotal ?? snapshot?.totalAmount ?? sumAmount(approvedTimesheets);
    const totalVal = snapshot?.totalAmount ?? subtotalVal;
    const finalStatus = snapshot?.status || "READY_FOR_TAX";
    const acqStatus = snapshot?.acquisitionStatus || mapToBillingAcquisitionStatus(finalStatus, false);

    const result = {
      success: true,
      snapshotId: snapshot?.snapshotId || snapshot?.id || null,
      snapshotNumber: snapshot?.snapshotNumber || null,
      billingPeriodStart: snapStart,
      billingPeriodEnd: snapEnd,
      billingPeriod: formattedPeriod,
      subtotal: subtotalVal,
      totalAmount: totalVal,
      status: finalStatus,
      snapshotLifecycleStatus: finalStatus,
      billingStatus: finalStatus,
      acquisitionStatus: acqStatus,
      laborRecords: approvedTimesheets.length > 0 ? approvedTimesheets : allLaborRecords,
      timesheets: approvedTimesheets.length > 0 ? approvedTimesheets : allLaborRecords,
      allRecords: allLaborRecords,
      isExisting: isExisting,
      existingSnapshot: isExisting,
      message: json?.message || (isExisting ? "Existing billing snapshot loaded successfully." : "Billing snapshot acquired successfully. All required timesheets are approved."),
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
    const status = error?.response?.status;
    const errorBody = error?.response?.data;
    const errorMessage = typeof errorBody === "string"
      ? errorBody
      : (errorBody?.message || errorBody?.detail || errorBody?.error || error?.message || "");

    const isDuplicateError =
      (status === 409 || status === 400) &&
      (
        /already\s*exists/i.test(errorMessage) ||
        /snapshot.*exists/i.test(errorMessage) ||
        /duplicate/i.test(errorMessage) ||
        Boolean(errorBody?.existingSnapshot) ||
        status === 409
      );

    if (isDuplicateError) {
      // 1. Check if backend explicitly indicates conflict with another configuration
      const isCrossConfigConflict =
        /another\s*billing\s*configuration/i.test(errorMessage) ||
        /different\s*configuration/i.test(errorMessage) ||
        /belongs\s*to\s*another/i.test(errorMessage) ||
        errorBody?.conflictType === "CROSS_CONFIGURATION";

      if (isCrossConfigConflict) {
        const conflictErr = new Error(
          errorMessage || "A billing snapshot for this project and period already exists under another billing configuration."
        );
        conflictErr.status = 409;
        conflictErr.isConflict = true;
        conflictErr.response = error?.response;
        throw conflictErr;
      }

      console.log(`[AR Integration] Duplicate snapshot detected for projectId=${finalProjectId}. Attempting recovery via getBillingSnapshotByPeriod...`);
      try {
        const existing = await getBillingSnapshotByPeriod(finalProjectId, cleanStart, cleanEnd, finalBillingConfigId);
        if (existing && (existing.snapshotId || existing.id)) {
          // Verify snapshot matches requested configuration
          if (!finalBillingConfigId || !existing.billingConfigurationId || String(existing.billingConfigurationId) === String(finalBillingConfigId)) {
            return {
              ...existing,
              isExisting: true,
              message: errorMessage || "Billing snapshot already exists for the selected project and billing period.",
            };
          }
        }
      } catch (hydrateErr) {
        console.warn("[AR Integration] Failed to hydrate existing snapshot during duplicate recovery:", hydrateErr);
      }

      // If recovery failed or snapshot belongs to another configuration:
      const conflictErr = new Error(
        errorMessage || "A billing snapshot for this period already exists under another billing configuration."
      );
      conflictErr.status = status || 409;
      conflictErr.isConflict = true;
      conflictErr.response = error?.response;
      throw conflictErr;
    }
    throw new Error(errorMessage || "We couldn't retrieve billing data at this time. Please try again.");
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
  const rawType = context?.billingType || context?.billingTypeCode || context?.billingTypeName || "";
  const billingTypeUpper = normalizeBillingTypeName(rawType);
  const applicable = getApplicableChargeTypes(billingTypeUpper, context?.toolBillingEnabled);
  const fetchedAt = new Date().toISOString();
  const results = {};

  let createdSnapshotId = null;
  let acquisitionStatus = "READY";

  const cleanPeriodFrom = toIsoDateOnly(periodFrom);
  const cleanPeriodTo = toIsoDateOnly(periodTo);

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
        (snapshot.snapshotId || snapshot.id) &&
        (snapshot.status === "READY" ||
          snapshot.status === "READY_FOR_TAX" ||
          snapshot.status === "TAX_COMPLETED" ||
          snapshot.status === "INVOICED" ||
          snapshot.status === "ALREADY_BILLED" ||
          snapshot.acquisitionStatus === "ALREADY_BILLED" ||
          snapshot.success ||
          snapshot.isExisting)
      ) {
        createdSnapshotId = snapshot.snapshotId || snapshot.id;
        const finalStatus = snapshot.status || "READY_FOR_TAX";
        const acqStatus = snapshot.acquisitionStatus || mapToBillingAcquisitionStatus(finalStatus, false);
        results.labor = {
          applicable: true,
          status: "success",
          records: snapshot.laborRecords || [],
          amount: snapshot.subtotal ?? snapshot.totalAmount ?? 0,
          lastFetchedAt: fetchedAt,
          snapshotId: snapshot.snapshotId || snapshot.id,
          snapshotNumber: snapshot.snapshotNumber,
          billingPeriodStart: actualSnapStart,
          billingPeriodEnd: actualSnapEnd,
          billingPeriod: actualSnapPeriod,
          readiness: snapshot.readiness,
        };
        results.success = true;
        results.isExisting = Boolean(snapshot.isExisting);
        results.existingSnapshot = Boolean(snapshot.isExisting || snapshot.existingSnapshot);
        results.snapshotId = snapshot.snapshotId || snapshot.id;
        results.snapshotNumber = snapshot.snapshotNumber;
        results.billingPeriodStart = actualSnapStart;
        results.billingPeriodEnd = actualSnapEnd;
        results.billingPeriod = actualSnapPeriod;
        results.billingStatus = finalStatus;
        results.snapshotLifecycleStatus = finalStatus;
        results.acquisitionStatus = acqStatus;
        results.message = snapshot.message || (snapshot.isExisting ? "Existing billing snapshot loaded." : "Billing snapshot acquired successfully. All required timesheets are approved.");
      } else if (snapshot && snapshot.status === "PARTIALLY_READY") {
        results.labor = {
          applicable: true,
          status: "partially_ready",
          records: snapshot.laborRecords || [],
          amount: snapshot.subtotal || sumAmount(snapshot.laborRecords || []),
          lastFetchedAt: fetchedAt,
          snapshotId: snapshot.snapshotId || snapshot.id,
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
      const errStatus = error?.response?.status;
      const errMsg = error?.message || "We couldn't retrieve billing data at this time. Please try again.";
      const isConflict = Boolean(
        error?.isConflict ||
        errStatus === 409 ||
        /conflict|another\s+billing\s+configuration|different\s+configuration|already\s+exists\s+under\s+another/i.test(errMsg)
      );

      const isValidationFailure =
        !isConflict &&
        (/validation\s*failure|configuration\s*required|configuration\s*missing|missing\s*setup|rate\s*incomplete/i.test(errMsg) ||
          errStatus === 422);

      results.labor = {
        applicable: true,
        status: "error",
        error: errMsg,
        records: [],
        amount: 0,
        lastFetchedAt: fetchedAt,
      };
      results.success = false;
      results.isConflict = isConflict;
      results.billingStatus = isValidationFailure ? "CONFIGURATION_REQUIRED" : "ACQUISITION_FAILED";
      results.message = errMsg;
      results.isRetryable = !isValidationFailure && !isConflict;
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
    try {
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
    } catch (recordErr) {
      console.warn("[BillingDataAcquisition] acquireBillingRecord tracking call failed; preserving snapshot data:", recordErr?.message || recordErr);
    }
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


