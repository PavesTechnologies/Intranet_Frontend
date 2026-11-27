import { useAuth } from "../../../contexts/AuthContext";
import {
  XMS_EVERYONE,
  XMS_REPORT_VIEWERS,
  AR_MAKER_ROLES,
  AR_CHECKER_ROLES,
  FINANCE_OVERVIEW_ROLES,
} from "../../../config/sidebarConfig";
import { AP_ALL_ROLES } from "../../accounts-payable/constants/apRoles";
import { AP_ROUTES } from "../../accounts-payable/constants/routes";

/**
 * Single source of truth for where the Finance Management landing page links
 * to, and whether the logged-in user can actually open each destination. Every
 * check reuses the role sets that already guard the matching routes in App.jsx
 * / the Sidebar — no new authorization mechanism.
 *
 * Returns:
 *   modules        — { ap, ar, xms }: { visible, to }. `to` is always set (the
 *                    existing module dashboard); `visible` = user holds a role
 *                    the destination route accepts.
 *   canSeeOverview — user holds a FINANCE_OVERVIEW_ROLES role.
 *   reportsRoute   — role-appropriate existing reports page.
 *   canOpenReports — user can open reportsRoute.
 *
 * NOTE (current phase): FinanceDashboard renders every section and module card
 * for every user and does NOT use `visible`/`canSeeOverview` to hide anything —
 * they are only used to decide whether Action Center alerts are clickable. The
 * route guards in App.jsx still enforce access on the module pages themselves.
 */
export function useFinanceAccess() {
  const { hasRole } = useAuth();

  // AR is split Maker (Finance Executive)/Checker (Finance Manager) — Super
  // Admin satisfies both. A pure Checker must land on Billing Approvals, not
  // the Maker dashboard (AR_MAKER_ROLES-gated, would 403 them) — see
  // AR_MAKER_ROLES/AR_CHECKER_ROLES in sidebarConfig.js and the matching
  // route guards in App.jsx / menu split in Sidebar.jsx.
  const isFinanceExecutive = hasRole(["Finance_Executive", "FINANCE_EXECUTIVE"]);
  const canSeeArMaker = hasRole(AR_MAKER_ROLES);
  const canSeeArChecker = hasRole(AR_CHECKER_ROLES) && !isFinanceExecutive;
  const isPureArChecker = canSeeArChecker && !canSeeArMaker;

  const canAp = hasRole(AP_ALL_ROLES);
  const canXmsReports = hasRole(XMS_REPORT_VIEWERS);
  const isXmsApprover = hasRole(["Manager", "MANAGER", "Reporting_Manager", "REPORTING_MANAGER"]);

  const modules = {
    // Each role opens Expense Management on its own work page: Finance Executives on Finance (verify, approve advances,
    // track payments), approvers (managers, reporting managers) on Approvals, everyone else on the dashboard. The
    // dashboard stays one click away in the menu.
    xms: {
      visible: hasRole(XMS_EVERYONE),
      to: isFinanceExecutive ? "/expense-management/finance" : isXmsApprover ? "/expense-management/approvals" : "/expense-management/dashboard",
    },
    ap: { visible: canAp, to: AP_ROUTES.DASHBOARD },
    ar: {
      visible: canSeeArMaker || canSeeArChecker || isFinanceExecutive,
      to: isPureArChecker ? "/account-receivable/billing-approvals" : "/account-receivable/dashboard",
    },
  };

  const reportsRoute = !canAp && canXmsReports ? "/expense-management/reports" : AP_ROUTES.REPORTS;

  return {
    modules,
    canSeeOverview: hasRole(FINANCE_OVERVIEW_ROLES),
    reportsRoute,
    canOpenReports: canAp || canXmsReports,
  };
}
