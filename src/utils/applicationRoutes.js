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

/**
 * Canonical page-shell contract (P2.24a). A route listed here has its page
 * component wrapped in the canonical `PageContainer` (either internally, or
 * — for dual-use components rendered both as a route and nested inside
 * another page — at the route element itself in App.jsx). Layout.jsx checks
 * this list so it can omit its own `p-4` for these routes only, avoiding a
 * doubled-up "Layout padding + PageContainer padding" stack, while every
 * other (not-yet-migrated) route keeps Layout's historical padding exactly
 * as before.
 *
 * This is a pathname allow-list, not React Router route metadata, because
 * this app's routing is a plain `<BrowserRouter>`/`<Routes>` tree (see
 * App.jsx) rather than a data router created via `createBrowserRouter` —
 * `handle`/`useMatches` route metadata only exists on that latter API, and
 * migrating the whole app's router to adopt it is far outside this task's
 * scope. This list follows the same established pattern as
 * `FINANCE_ROUTE_PREFIXES`/`getApplicationFromPath` above. A future module
 * opts into the canonical shell simply by adding its own routes here once
 * its pages use `PageContainer` — no further Layout change is needed.
 *
 * Keep in sync with the Leave Management routes registered in App.jsx.
 */
const CANONICAL_PAGE_SHELL_EXACT_ROUTES = [
  "/leave-management",
  "/leave-management/hr",
  "/leave-management/manager",
  "/employee-leave-balance",
  "/edit-holidays",
  "/approval-rules",
  "/leave-policy",
];

// Routes with a dynamic segment are matched by prefix instead of exact string.
const CANONICAL_PAGE_SHELL_PREFIX_ROUTES = ["/leave-details/"];

export function isCanonicalPageShellRoute(pathname) {
  if (CANONICAL_PAGE_SHELL_EXACT_ROUTES.includes(pathname)) return true;
  return CANONICAL_PAGE_SHELL_PREFIX_ROUTES.some((prefix) => pathname.startsWith(prefix));
}
