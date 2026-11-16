/**
 * MSME content is not shown in the AP frontend. The backend still returns MSME items in some lists
 * (dashboard highlights, compliance rows, action-center actions, the report catalogue), so they are
 * dropped here by their key or link rather than changing the API.
 */
const MSME = /msme/i;

/** True for an MSME-specific item, matched on its `key` or `link`. */
export const isMsmeItem = (item) => MSME.test(item?.key || "") || MSME.test(item?.link || "");

/** The list without its MSME-specific items; tolerates a missing list. */
export const withoutMsme = (list) => (list || []).filter((item) => !isMsmeItem(item));
