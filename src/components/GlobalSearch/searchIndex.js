/**
 * Builds the list of pages the global search can jump to, filtered to what the
 * current user can open. Mirrors the sidebar's gating exactly (same menu data,
 * same filterMenuByRole / per-role helpers), so search never offers a page the
 * sidebar hides from that user.
 */
import {
  EO_SUBMENU,
  XMS_SUBMENU,
  AP_SUBMENU,
  FINANCE_ALL_ROLES,
} from "../../config/sidebarConfig";
import {
  userManagementSubmenu,
  getArSubmenu,
  getAirsSubmenu,
  getResourceManagementSubmenu,
  canSeeAccountReceivable,
  AIRS_ACCESS_ROLES,
} from "../../config/navigationMenus";
import { filterMenuByRole } from "../../utils/sidebarPermissions";
import { AP_ALL_ROLES } from "../../pages/accounts-payable/constants/apRoles";
import { AP_MANAGEMENT_ANY } from "../../pages/accounts-payable/constants/paymentTerms";

const normalizePath = (to) => (to.startsWith("/") ? to : `/${to}`).replace(/\/+$/, "") || "/";

/** Flattens a (filtered) menu tree into leaf links, keeping the parent trail. */
function flattenMenu(items, module, trail = []) {
  return items.flatMap((item) => {
    const label = item.label.trim();
    if (item.children?.length) return flattenMenu(item.children, module, [...trail, label]);
    return [{ label, path: normalizePath(item.to), module, trail }];
  });
}

/**
 * @param {object}   opts
 * @param {Function} opts.hasRole
 * @param {Function} opts.hasAnyPermission
 * @param {boolean}  opts.financeEnabled - FINANCE_TOGGLE; Finance modules are unreachable from the sidebar when off.
 * @returns {Array<{id, label, path, module, trail}>} unique by path+label
 */
export function buildPageIndex({ hasRole, hasAnyPermission = () => true, financeEnabled }) {
  const isAdmin = hasRole(["ADMIN"]);
  const isRM = hasRole(["RESOURCE_MANAGER"]);
  const isDM = hasRole(["DELIVERY_MANAGER"]);

  const pages = [
    { label: "Dashboard", path: "/dashboard", module: "Intranet", trail: [] },
    { label: "Leave Management", path: "/leave-management", module: "Intranet", trail: [] },
    { label: "Timesheets", path: "/timesheets", module: "Intranet", trail: [] },
  ];

  // Same rule as the sidebar's Projects entry: General or Project Manager only.
  if (hasRole(["GENERAL", "PROJECT_MANAGER"])) {
    pages.push({ label: "Projects", path: "/projects", module: "Intranet", trail: [] });
  }

  pages.push(...flattenMenu(filterMenuByRole(EO_SUBMENU, hasRole), "Employee Onboarding"));

  if (hasRole(AIRS_ACCESS_ROLES)) {
    pages.push(...flattenMenu(getAirsSubmenu(hasRole), "AI Screening"));
  }

  if (isAdmin) {
    pages.push(...flattenMenu(userManagementSubmenu, "User Management"));
  }

  if (isAdmin || isRM || isDM) {
    // Admin without RM/DM only gets the Client Management landing page in the sidebar.
    const rmItems = isAdmin && !isRM && !isDM
      ? [{ label: "Client Management", to: "/resource-management" }]
      : getResourceManagementSubmenu(hasRole);
    pages.push(...flattenMenu(rmItems, "Resource Management"));
  }

  if (financeEnabled && hasRole(FINANCE_ALL_ROLES)) {
    pages.push({ label: "Finance Dashboard", path: "/finance/dashboard", module: "Finance", trail: [] });
  }

  if (financeEnabled) {
    pages.push(...flattenMenu(filterMenuByRole(XMS_SUBMENU, hasRole), "Expense Management"));

    if (hasRole(AP_ALL_ROLES) || hasAnyPermission(AP_MANAGEMENT_ANY)) {
      pages.push(...flattenMenu(filterMenuByRole(AP_SUBMENU, hasRole, hasAnyPermission), "Accounts Payable"));
    }

    if (canSeeAccountReceivable(hasRole)) {
      pages.push(...flattenMenu(getArSubmenu(hasRole), "Account Receivable"));
    }
  }

  const seen = new Set();
  return pages
    .filter((p) => {
      const key = `${p.path}|${p.label.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((p) => ({ ...p, id: `page:${p.path}:${p.label}` }));
}

const tokenize = (q) => q.toLowerCase().trim().split(/\s+/).filter(Boolean);

/**
 * Scores how well `fields` match `query`. Every query word must appear somewhere
 * in the fields (AND); matches in the primary field (first) rank higher, and
 * prefix matches rank above substring matches. Returns 0 for no match.
 */
export function scoreMatch(query, fields) {
  const terms = tokenize(query);
  if (!terms.length) return 0;
  const [primary = "", ...rest] = fields.map((f) => String(f || "").toLowerCase());
  const secondary = rest.join(" ");
  let score = 0;
  for (const term of terms) {
    if (primary === term) score += 100;
    else if (primary.startsWith(term)) score += 60;
    else if (primary.split(/[\s/&-]+/).some((w) => w.startsWith(term))) score += 40;
    else if (primary.includes(term)) score += 25;
    else if (secondary.split(/[\s/&-]+/).some((w) => w.startsWith(term))) score += 12;
    else if (secondary.includes(term)) score += 6;
    else return 0;
  }
  return score;
}

/** Ranked page matches for `query`. */
export function searchPages(pages, query, limit = 8) {
  return pages
    .map((page) => ({ page, score: scoreMatch(query, [page.label, ...page.trail, page.module]) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.page.label.localeCompare(b.page.label))
    .slice(0, limit)
    .map((r) => r.page);
}

/** Ranked people matches for `query` (name first, then email / employee id). */
export function searchPeople(people, query, limit = 6) {
  return people
    .map((person) => ({ person, score: scoreMatch(query, [person.name, person.email, person.employeeId]) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.person.name.localeCompare(b.person.name))
    .slice(0, limit)
    .map((r) => r.person);
}
