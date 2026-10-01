import { describe, it, expect } from "vitest";

import {
  ACTION_REQUIRED_TYPES,
  MODULE_LABEL,
  MODULE_ORDER,
  entityReference,
  isActionRequired,
  isOverdue,
  moduleLabel,
  resolveNotificationRoute,
} from "./notifications";
import { AP_ROUTES } from "../../constants/routes";

/** A NotificationDTO as the API returns it. */
const notification = (overrides = {}) => ({
  id: 1,
  notification_type: "PR_APPROVED_SOURCING",
  module: "PROCUREMENT",
  title: "PR-000059 — Procurement action required",
  message: "PR-000059 has been approved and is ready for sourcing.",
  priority: "HIGH",
  entity_type: "PURCHASE_REQUISITION",
  entity_id: "59",
  entity_display_id: "PR-000059",
  action_label: "Start RFQ",
  deep_link: "/procurement/purchase-requisitions/59",
  deadline: null,
  is_read: false,
  is_resolved: false,
  created_at: "2026-09-20T09:00:00",
  read_at: null,
  payload: {},
  ...overrides,
});

describe("resolveNotificationRoute — entity mapping", () => {
  it("sends a purchase requisition to the PR detail page", () => {
    expect(resolveNotificationRoute(notification())).toBe(
      AP_ROUTES.PROCUREMENT_PR_DETAIL("59"),
    );
  });

  it("ignores the backend's placeholder deep_link", () => {
    const route = resolveNotificationRoute(notification());

    // The backend ships "/procurement/purchase-requisitions/59", which this app does not
    // register — following it would 404.
    expect(route).not.toBe("/procurement/purchase-requisitions/59");
    expect(route).toBe("/accounts-payable/procurement/requisitions/59");
  });

  it("sends an RFQ to the RFQ detail page", () => {
    const route = resolveNotificationRoute(
      notification({
        notification_type: "RFQ_VENDOR_EMAIL_FAILURE",
        entity_type: "RFQ",
        entity_id: "12",
      }),
    );

    expect(route).toBe(AP_ROUTES.PROCUREMENT_RFQ_DETAIL("12"));
  });

  it("sends a quotation to its RFQ when metadata carries rfq_id", () => {
    const route = resolveNotificationRoute(
      notification({
        notification_type: "QUOTATION_RECEIVED",
        entity_type: "QUOTATION",
        entity_id: "77",
        payload: { metadata: { rfq_id: 12, pr_id: 59 } },
      }),
    );

    // There is no quotation detail route; the RFQ page is where a quotation is reviewed.
    expect(route).toBe(AP_ROUTES.PROCUREMENT_RFQ_DETAIL("12"));
  });

  it("falls back to the Procurement quotation tab when no rfq_id is available", () => {
    const route = resolveNotificationRoute(
      notification({
        notification_type: "QUOTATION_RECEIVED",
        entity_type: "QUOTATION",
        entity_id: "77",
        payload: { metadata: {} },
      }),
    );

    expect(route).toBe(`${AP_ROUTES.PROCUREMENT}?tab=quotation`);
  });

  it("sends an onboarding request to the internal request detail page", () => {
    const route = resolveNotificationRoute(
      notification({
        notification_type: "VENDOR_ONBOARDING_ASSIGNED",
        entity_type: "VENDOR_ONBOARDING_REQUEST",
        entity_id: "8",
      }),
    );

    expect(route).toBe(AP_ROUTES.VENDOR_INTERNAL_REQUEST_DETAIL("8"));
  });

  it("sends an NDA to the PR that owns its sourcing", () => {
    const route = resolveNotificationRoute(
      notification({
        notification_type: "NDA_REQUIRED",
        entity_type: "VENDOR_NDA",
        entity_id: "31",
        payload: { metadata: { pr_id: 59, vendor_id: 7 } },
      }),
    );

    // NDAs have no route of their own — the workflow lives on the PR/RFQ screens.
    expect(route).toBe(AP_ROUTES.PROCUREMENT_PR_DETAIL("59"));
  });

  it("falls back to the vendor's own page when an NDA has no pr_id", () => {
    const route = resolveNotificationRoute(
      notification({
        notification_type: "NDA_PENDING",
        entity_type: "VENDOR_NDA",
        entity_id: "31",
        payload: { metadata: { vendor_id: 7 } },
      }),
    );

    expect(route).toBe(AP_ROUTES.VENDOR_DETAIL("7"));
  });

  it("sends an invoice to the invoice detail page", () => {
    const route = resolveNotificationRoute(
      notification({
        notification_type: "INVOICE_REVIEW_REQUIRED",
        entity_type: "INVOICE",
        entity_id: "1024",
      }),
    );

    expect(route).toBe(AP_ROUTES.INVOICE_DETAIL("1024"));
  });

  it("resolves an approval step to the invoice it belongs to", () => {
    const route = resolveNotificationRoute(
      notification({
        notification_type: "INVOICE_APPROVAL_REQUIRED",
        entity_type: "INVOICE_APPROVAL_STEP",
        entity_id: "900",
        payload: { metadata: { invoice_id: 1024, level_number: 2 } },
      }),
    );

    // entity_id is the step, which has no page of its own.
    expect(route).toBe(AP_ROUTES.INVOICE_DETAIL("1024"));
  });

  it("sends a payment to Payment History, where payment status is worked", () => {
    const route = resolveNotificationRoute(
      notification({
        notification_type: "PAYMENT_FAILED",
        module: "PAYMENTS",
        entity_type: "PAYMENT",
        entity_id: "5",
      }),
    );

    // No payment detail route is registered, and the legacy payment queue is a different
    // API; Payment History lists /apm/payment rows with their status.
    expect(route).toBe(AP_ROUTES.PAYMENT_HISTORY);
  });
});

describe("resolveNotificationRoute — type-level destinations", () => {
  it("sends a completed onboarding back to the PR it was raised from", () => {
    const route = resolveNotificationRoute(
      notification({
        notification_type: "VENDOR_ONBOARDING_COMPLETED",
        module: "VENDOR_MANAGEMENT",
        entity_type: "VENDOR_ONBOARDING_REQUEST",
        entity_id: "8",
        payload: { metadata: { pr_id: 59, reason: null } },
      }),
    );

    // "Continue procurement / RFQ" - the PO Officer continues on the PR, not the closed request.
    expect(route).toBe(AP_ROUTES.PROCUREMENT_PR_DETAIL("59"));
  });

  it("sends a completed onboarding without a PR to Vendor Management", () => {
    const route = resolveNotificationRoute(
      notification({
        notification_type: "VENDOR_ONBOARDING_COMPLETED",
        entity_type: "VENDOR_ONBOARDING_REQUEST",
        entity_id: "8",
      }),
    );

    expect(route).toBe(AP_ROUTES.VENDOR_LIST);
  });

  it("sends vendor selection to the Procurement vendor-selection tab", () => {
    const route = resolveNotificationRoute(
      notification({
        notification_type: "VENDOR_SELECTION_REQUIRED",
        entity_type: "RFQ",
        entity_id: "12",
      }),
    );

    expect(route).toBe(`${AP_ROUTES.PROCUREMENT}?tab=vendorSelection`);
  });

  it("pre-selects the PR on the vendor-selection tab when the backend sends it", () => {
    const route = resolveNotificationRoute(
      notification({
        notification_type: "VENDOR_SELECTION_REQUIRED",
        entity_type: "RFQ",
        entity_id: "12",
        payload: { metadata: { pr_id: 59 } },
      }),
    );

    expect(route).toBe(`${AP_ROUTES.PROCUREMENT}?tab=vendorSelection&prId=59`);
  });

  it("sends a quotation without an RFQ to the quotation tab for its PR", () => {
    const route = resolveNotificationRoute(
      notification({
        notification_type: "QUOTATION_RECEIVED",
        entity_type: "QUOTATION",
        entity_id: "77",
        payload: { metadata: { pr_id: 59, rfq_id: null } },
      }),
    );

    expect(route).toBe(`${AP_ROUTES.PROCUREMENT}?tab=quotation&prId=59`);
  });

  it("sends PO generation to the PR detail page, where the action lives", () => {
    const route = resolveNotificationRoute(
      notification({
        notification_type: "PO_GENERATION_REQUIRED",
        entity_type: "PURCHASE_REQUISITION",
        entity_id: "59",
      }),
    );

    expect(route).toBe(AP_ROUTES.PROCUREMENT_PR_DETAIL("59"));
  });

  it("sends a blocked approval workflow to System Configuration, not the invoice", () => {
    const route = resolveNotificationRoute(
      notification({
        notification_type: "WORKFLOW_CONFIGURATION_BLOCKED",
        entity_type: "INVOICE",
        entity_id: "1024",
      }),
    );

    expect(route).toBe(AP_ROUTES.SYSTEM_CONFIG);
  });
});

/**
 * Every notification_type the backend CATALOG emits (Backend/Business_Layer/utils/
 * notification_types.py), with the entity + metadata its emitter really sends
 * (notification_events.py), and the page it must open.
 */
const EMITTED = [
  // Procurement — PR workflow (PR Approver / PR Requester)
  ["PR_APPROVAL_REQUIRED", "PURCHASE_REQUISITION", "59", { resubmitted: false }, AP_ROUTES.PROCUREMENT_PR_DETAIL("59")],
  ["PR_RETURNED", "PURCHASE_REQUISITION", "59", { reason: "clarify" }, AP_ROUTES.PROCUREMENT_PR_DETAIL("59")],
  // Procurement
  ["PR_APPROVED_SOURCING", "PURCHASE_REQUISITION", "59", {}, AP_ROUTES.PROCUREMENT_PR_DETAIL("59")],
  ["PO_GENERATION_REQUIRED", "PURCHASE_REQUISITION", "59", { quotation_id: 77, vendor_id: 7 }, AP_ROUTES.PROCUREMENT_PR_DETAIL("59")],
  ["PROCUREMENT_BLOCKED", "RFQ", "12", { pr_id: 59 }, AP_ROUTES.PROCUREMENT_RFQ_DETAIL("12")],
  ["RFQ_VENDOR_EMAIL_FAILURE", "RFQ", "12", { pr_id: 59 }, AP_ROUTES.PROCUREMENT_RFQ_DETAIL("12")],
  ["RFQ_DEADLINE_REACHED", "RFQ", "12", {}, AP_ROUTES.PROCUREMENT_RFQ_DETAIL("12")],
  ["VENDOR_SELECTION_REQUIRED", "RFQ", "12", { pr_id: 59 }, `${AP_ROUTES.PROCUREMENT}?tab=vendorSelection&prId=59`],
  ["QUOTATION_RECEIVED", "QUOTATION", "77", { pr_id: 59, rfq_id: 12 }, AP_ROUTES.PROCUREMENT_RFQ_DETAIL("12")],
  ["QUOTATION_VALIDITY_ENDING", "QUOTATION", "77", { rfq_id: 12 }, AP_ROUTES.PROCUREMENT_RFQ_DETAIL("12")],
  ["NDA_REQUIRED", "VENDOR_NDA", "31", { vendor_id: 7, pr_id: 59 }, AP_ROUTES.PROCUREMENT_PR_DETAIL("59")],
  ["NDA_PENDING", "VENDOR_NDA", "31", { vendor_id: 7, pr_id: 59 }, AP_ROUTES.PROCUREMENT_PR_DETAIL("59")],
  ["NDA_SIGNED_REVIEW_PENDING", "VENDOR_NDA", "31", { vendor_id: 7, pr_id: 59 }, AP_ROUTES.PROCUREMENT_PR_DETAIL("59")],
  ["NDA_EXPIRED_RFQ_BLOCKED", "VENDOR_NDA", "31", { vendor_id: 7, pr_id: 59 }, AP_ROUTES.PROCUREMENT_PR_DETAIL("59")],
  // Vendor Management
  ["VENDOR_ONBOARDING_REQUESTED", "VENDOR_ONBOARDING_REQUEST", "8", { pr_id: 59 }, AP_ROUTES.VENDOR_INTERNAL_REQUEST_DETAIL("8")],
  ["VENDOR_ONBOARDING_ASSIGNED", "VENDOR_ONBOARDING_REQUEST", "8", { pr_id: 59 }, AP_ROUTES.VENDOR_INTERNAL_REQUEST_DETAIL("8")],
  ["VENDOR_INFORMATION_REQUIRED", "VENDOR_ONBOARDING_REQUEST", "8", { pr_id: 59 }, AP_ROUTES.VENDOR_INTERNAL_REQUEST_DETAIL("8")],
  ["VENDOR_PRESCREEN_REQUIRED", "VENDOR_ONBOARDING_REQUEST", "8", { pr_id: 59 }, AP_ROUTES.VENDOR_INTERNAL_REQUEST_DETAIL("8")],
  ["VENDOR_ONBOARDING_FAILED", "VENDOR_ONBOARDING_REQUEST", "8", { pr_id: 59 }, AP_ROUTES.VENDOR_INTERNAL_REQUEST_DETAIL("8")],
  ["VENDOR_ONBOARDING_COMPLETED", "VENDOR_ONBOARDING_REQUEST", "8", { pr_id: 59 }, AP_ROUTES.PROCUREMENT_PR_DETAIL("59")],
  // Invoice Management
  ["INVOICE_REVIEW_REQUIRED", "INVOICE", "1024", { vendor_id: 7 }, AP_ROUTES.INVOICE_DETAIL("1024")],
  ["INVOICE_VALIDATION_EXCEPTION", "INVOICE", "1024", {}, AP_ROUTES.INVOICE_DETAIL("1024")],
  ["INVOICE_RETURNED", "INVOICE", "1024", {}, AP_ROUTES.INVOICE_DETAIL("1024")],
  ["INVOICE_PAYMENT_ACTION_REQUIRED", "INVOICE", "1024", {}, AP_ROUTES.INVOICE_DETAIL("1024")],
  ["INVOICE_DUE", "INVOICE", "1024", {}, AP_ROUTES.INVOICE_DETAIL("1024")],
  ["INVOICE_OVERDUE", "INVOICE", "1024", {}, AP_ROUTES.INVOICE_DETAIL("1024")],
  ["INVOICE_APPROVAL_REQUIRED", "INVOICE_APPROVAL_STEP", "900", { invoice_id: 1024 }, AP_ROUTES.INVOICE_DETAIL("1024")],
  ["INVOICE_APPROVAL_AGEING", "INVOICE_APPROVAL_STEP", "900", { invoice_id: 1024 }, AP_ROUTES.INVOICE_DETAIL("1024")],
  // Payments — PAYMENT_READY is raised on the invoice, whose detail page has the payment panel.
  ["PAYMENT_READY", "INVOICE", "1024", { vendor_id: 7 }, AP_ROUTES.INVOICE_DETAIL("1024")],
  ["PAYMENT_DUE", "PAYMENT", "5", {}, AP_ROUTES.PAYMENT_HISTORY],
  ["PAYMENT_FAILED", "PAYMENT", "5", { vendor_id: 7, invoice_ids: [1024] }, AP_ROUTES.PAYMENT_HISTORY],
  ["PAYMENT_EXCEPTION", "PAYMENT", "5", {}, AP_ROUTES.PAYMENT_HISTORY],
  ["FINANCE_ACTION_REQUIRED", "PAYMENT", "5", {}, AP_ROUTES.PAYMENT_HISTORY],
  ["FINANCE_ESCALATION", "PAYMENT", "5", { vendor_id: 7, invoice_ids: [1024] }, AP_ROUTES.PAYMENT_HISTORY],
  // System Configuration
  ["WORKFLOW_CONFIGURATION_BLOCKED", "INVOICE", "1024", { error: "no policy" }, AP_ROUTES.SYSTEM_CONFIG],
  ["SYSTEM_CONFIGURATION_EXCEPTION", "CDC_FAILURE", "3", { kafka_topic: "ums.users" }, AP_ROUTES.SYSTEM_CONFIG],
];

describe("resolveNotificationRoute — every backend notification type", () => {
  it.each(EMITTED)("%s on %s opens a registered page", (type, entityType, entityId, metadata, expected) => {
    const route = resolveNotificationRoute(
      notification({
        notification_type: type,
        entity_type: entityType,
        entity_id: entityId,
        payload: { metadata },
      }),
    );

    expect(route).toBe(expected);
    // Never the backend's placeholder deep links, which this app does not register.
    expect(route.startsWith("/accounts-payable/")).toBe(true);
  });

  it("keeps the identifiers the notification carries in the destination", () => {
    const route = resolveNotificationRoute(
      notification({
        notification_type: "INVOICE_APPROVAL_REQUIRED",
        entity_type: "INVOICE_APPROVAL_STEP",
        entity_id: "900",
        payload: { metadata: { invoice_id: 4321 } },
      }),
    );

    expect(route).toContain("4321");
  });

  it("does not depend on the module to route — the same entity routes the same way", () => {
    const withModule = notification({ entity_type: "INVOICE", entity_id: "3", module: "PAYMENTS" });
    const withoutModule = notification({ entity_type: "INVOICE", entity_id: "3", module: null });

    expect(resolveNotificationRoute(withModule)).toBe(resolveNotificationRoute(withoutModule));
  });
});

describe("resolveNotificationRoute — unknown values", () => {
  it("returns null for an entity type this build does not know", () => {
    const route = resolveNotificationRoute(
      notification({
        notification_type: "SOME_FUTURE_TYPE",
        entity_type: "SOME_FUTURE_ENTITY",
        entity_id: "1",
      }),
    );

    // No route means the card renders without an action rather than offering a dead link.
    expect(route).toBeNull();
  });

  it("still resolves a known entity carrying an unknown notification type", () => {
    const route = resolveNotificationRoute(
      notification({ notification_type: "SOME_FUTURE_TYPE", entity_type: "INVOICE", entity_id: "3" }),
    );

    expect(route).toBe(AP_ROUTES.INVOICE_DETAIL("3"));
  });

  it("does not throw on a null notification", () => {
    expect(resolveNotificationRoute(null)).toBeNull();
  });
});

describe("isOverdue", () => {
  it("is false when the backend set no deadline", () => {
    expect(isOverdue(notification())).toBe(false);
  });

  it("is true once a deadline has passed", () => {
    expect(isOverdue(notification({ deadline: "2020-01-01" }))).toBe(true);
  });

  it("is false for a deadline still in the future", () => {
    expect(isOverdue(notification({ deadline: "2099-12-31" }))).toBe(false);
  });

  it("is false for an unparsable deadline rather than guessing", () => {
    expect(isOverdue(notification({ deadline: "not-a-date" }))).toBe(false);
  });

  it("is false once the backend has resolved the notification", () => {
    // The work is done; a passed deadline on history is not pending work.
    expect(isOverdue(notification({ deadline: "2020-01-01", is_resolved: true }))).toBe(false);
  });
});

describe("entityReference", () => {
  it("combines the entity label with the backend's display id", () => {
    expect(entityReference(notification())).toBe("Purchase Requisition PR-000059");
  });

  it("falls back to the display id alone for an unknown entity type", () => {
    expect(
      entityReference(notification({ entity_type: "MYSTERY", entity_display_id: "X-1" })),
    ).toBe("X-1");
  });

  it("returns null when there is nothing to show", () => {
    expect(
      entityReference(notification({ entity_type: "MYSTERY", entity_display_id: null })),
    ).toBeNull();
  });
});

describe("ACTION_REQUIRED_TYPES", () => {
  it("matches the backend catalog exactly: every catalogued type asks for work", () => {
    const catalog = EMITTED.map(([type]) => type);

    expect([...ACTION_REQUIRED_TYPES].sort()).toEqual([...catalog].sort());
  });

  it("only contains types the backend catalog actually emits", () => {
    // Guards against a typo silently emptying the Action Required tab.
    expect(ACTION_REQUIRED_TYPES.has("PR_APPROVED_SOURCING")).toBe(true);
    expect(ACTION_REQUIRED_TYPES.has("INVOICE_APPROVAL_REQUIRED")).toBe(true);
    // An overdue invoice is work, not a notice.
    expect(ACTION_REQUIRED_TYPES.has("INVOICE_OVERDUE")).toBe(true);
    // "Continue procurement" - resolved by the backend once the vendor is invited.
    expect(ACTION_REQUIRED_TYPES.has("VENDOR_ONBOARDING_COMPLETED")).toBe(true);
    expect(ACTION_REQUIRED_TYPES.has("PR_APPROVAL_REQUIRED")).toBe(true);
    expect(ACTION_REQUIRED_TYPES.has("PR_RETURNED")).toBe(true);
  });
});

describe("AP navigation wiring", () => {
  it("exposes Notifications in the Accounts Payable sidebar submenu", async () => {
    const { AP_SUBMENU } = await import("../../../../config/sidebarConfig");
    const { AP_ALL_ROLES } = await import("../../constants/apRoles");

    const item = AP_SUBMENU.find((entry) => entry.label === "Notifications");

    expect(item).toBeDefined();
    // Reuses the one route the header bell and the dashboard also link to.
    expect(item.to).toBe(AP_ROUTES.NOTIFICATIONS);
    // Same gate as the route: any AP user, with the backend deciding what they see.
    expect(item.allowedRoles).toBe(AP_ALL_ROLES);
  });

  it("keeps the existing AP submenu destinations intact", async () => {
    const { AP_SUBMENU } = await import("../../../../config/sidebarConfig");

    const labels = AP_SUBMENU.map((entry) => entry.label);

    expect(labels).toEqual(
      expect.arrayContaining([
        "Dashboard",
        "Vendor Management",
        "Invoice Management",
        "Payments",
        "Procurement",
        "System Configuration",
      ]),
    );
  });
});

describe("isActionRequired", () => {
  it("is true for an unresolved action-oriented notification", () => {
    expect(isActionRequired(notification())).toBe(true);
  });

  it("stays true after the notification is read, while it is unresolved", () => {
    // Reading a notification does not do the work it asks for.
    expect(isActionRequired(notification({ is_read: true }))).toBe(true);
  });

  it("is false once the backend resolves it", () => {
    expect(isActionRequired(notification({ is_resolved: true }))).toBe(false);
    expect(isActionRequired(notification({ is_read: true, is_resolved: true }))).toBe(false);
  });

  it("is false for an unread informational notification", () => {
    // Unread is not the same as actionable.
    expect(
      isActionRequired(notification({ notification_type: "SOME_INFO_NOTICE", is_read: false })),
    ).toBe(false);
  });

  it("is false for a type this build does not know, rather than inventing work", () => {
    expect(isActionRequired(notification({ notification_type: "SOME_FUTURE_TYPE" }))).toBe(false);
  });

  it("does not throw on a missing notification", () => {
    expect(isActionRequired(null)).toBe(false);
  });
});

describe("modules", () => {
  it("offers exactly the backend's filterable modules", () => {
    // notification_types.py MODULES - anything else is rejected with a 422.
    expect(MODULE_ORDER).toEqual([
      "PROCUREMENT",
      "VENDOR_MANAGEMENT",
      "INVOICE_MANAGEMENT",
      "PAYMENTS",
      "SYSTEM_CONFIGURATION",
    ]);
    MODULE_ORDER.forEach((module) => expect(MODULE_LABEL[module]).toBeTruthy());
  });

  it("labels the known modules", () => {
    expect(moduleLabel("PROCUREMENT")).toBe("Procurement");
    expect(moduleLabel("VENDOR_MANAGEMENT")).toBe("Vendor Management");
    expect(moduleLabel("INVOICE_MANAGEMENT")).toBe("Invoice Management");
    expect(moduleLabel("PAYMENTS")).toBe("Payments");
    expect(moduleLabel("SYSTEM_CONFIGURATION")).toBe("System Configuration");
  });

  it("renders a module this build does not know from its raw value", () => {
    expect(moduleLabel("GOODS_RECEIPT")).toBe("Goods Receipt");
  });

  it("falls back to Other when the backend sent no module", () => {
    expect(moduleLabel(null)).toBe("Other");
    expect(moduleLabel(undefined)).toBe("Other");
  });
});
