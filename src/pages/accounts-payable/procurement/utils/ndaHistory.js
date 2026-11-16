import { NDA_STATUS } from "../constants/vendorOnboarding";

/**
 * Shapes GET /apm/nda/vendor/{vendor_id}/history for the Manage NDA history view. Nothing is
 * derived beyond layout: which record is active and what its status is are read off the
 * response as-is.
 */

const asList = (value) => {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
};

/** Version number off a history record, whichever name the record serialises it under. */
export const ndaVersionOf = (record) =>
  record?.version ?? record?.version_no ?? record?.document_version ?? null;

/**
 * Display name for the NDA document. Only an explicit file name is shown — the storage key
 * is never used for this, so no internal object path reaches the UI.
 */
export const ndaDocumentNameOf = (record) =>
  record?.document_name || record?.file_name || record?.original_filename || null;

export const ndaUploadedAtOf = (record) =>
  record?.uploaded_at || record?.created_at || null;

/**
 * Department / category scope of a record. "Company-wide" only when the record explicitly
 * carries both scope fields as empty — a record that simply omits them shows nothing rather
 * than being claimed as company-wide.
 */
export const ndaScopeLabelOf = (record) => {
  if (!record) return null;

  const department = record.department_name || null;
  const category = record.purchase_category_name || record.category_name || null;
  if (department || category) return [department, category].filter(Boolean).join(" · ");

  const hasScopeFields = "department_id" in record && "purchase_category_id" in record;
  if (hasScopeFields && !record.department_id && !record.purchase_category_id) {
    return "Company-wide";
  }
  return null;
};

/**
 * A replacement is a later version of an earlier NDA. Only these can be verified straight
 * from Pending — a first version that is Pending is an unsent draft, which goes through the
 * existing send → sign → review lifecycle instead.
 */
export const isReplacementNda = (record) =>
  Number(ndaVersionOf(record)) > 1 ||
  Boolean(record?.replaced_nda_id || record?.previous_nda_id || record?.supersedes_nda_id);

/** Accept/Reject is offered only on an active replacement still awaiting verification. */
export const canVerifyNdaRecord = (record) =>
  Boolean(record?.is_active) &&
  record?.status_code === NDA_STATUS.PENDING &&
  isReplacementNda(record);

/**
 * @returns {{ active:object[], history:object[], count:number }} `active` holds the active
 *   record(s) — one per scope, so possibly several — and `history` every version newest first,
 *   each flagged `is_active` from the backend's own active list.
 */
export function normalizeNdaHistory(data) {
  const active = asList(data?.active);
  const activeIds = new Set(active.map((record) => String(record.nda_id)));

  const versions = asList(data?.versions).map((record) => ({
    ...record,
    is_active: record.is_active ?? activeIds.has(String(record.nda_id)),
  }));

  // An active record missing from `versions` is still a version on file.
  active.forEach((record) => {
    if (!versions.some((version) => String(version.nda_id) === String(record.nda_id))) {
      versions.push({ ...record, is_active: true });
    }
  });

  const history = [...versions].sort((a, b) => {
    const byVersion = (Number(ndaVersionOf(b)) || 0) - (Number(ndaVersionOf(a)) || 0);
    if (byVersion) return byVersion;
    return String(ndaUploadedAtOf(b) || "").localeCompare(String(ndaUploadedAtOf(a) || ""));
  });

  return {
    active: active.map((record) => ({ ...record, is_active: true })),
    history,
    count: data?.count ?? history.length,
  };
}
