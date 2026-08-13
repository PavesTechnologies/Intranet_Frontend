/**
 * Maps the current route to the active "application" (product area) for the
 * Application Switcher. URL is the source of truth — visiting a Finance route
 * (directly, via refresh, or via the switcher) always resolves to "finance";
 * everything else resolves to "intranet". Keep this list in sync with the
 * Finance route prefixes registered in App.jsx.
 */
export const APPLICATIONS = {
  INTRANET: "intranet",
  FINANCE: "finance",
};

const FINANCE_ROUTE_PREFIXES = [
  "/finance",
  "/expense-management",
  "/accounts-payable",
  "/account-receivable",
];

/**
 * Global kill switch for the Finance Management application/product-area UX
 * (Application Switcher, Finance-scoped sidebar, /finance/dashboard). Set via
 * window.__APP_CONFIG__.FINANCE_TOGGLE in public/config.js. This is separate
 * from role-based access — it disables the feature for everyone, regardless
 * of role, leaving zero UI trace. It does NOT gate the pre-existing standalone
 * /expense-management, /accounts-payable, /account-receivable routes, which
 * keep their own role-based ProtectedRoute checks either way.
 */
export function isFinanceEnabled() {
  return Boolean(window.__APP_CONFIG__?.FINANCE_TOGGLE);
}

export function getApplicationFromPath(pathname) {
  if (!isFinanceEnabled()) return APPLICATIONS.INTRANET;

  return FINANCE_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
    ? APPLICATIONS.FINANCE
    : APPLICATIONS.INTRANET;
}
