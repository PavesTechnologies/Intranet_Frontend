// Routes the AR dashboard links into. Kept in one place so stage cards,
// worklist items and footer links never drift from App.jsx.
export const AR_ROUTES = {
  overview: "/account-receivable/project-billing-setup/overview",
  workspace: "/account-receivable/project-billing-setup/workspace",
  billingApprovals: "/account-receivable/billing-approvals",
  acquisition: "/account-receivable/billing-data-acquisition/workspace",
  tax: "/account-receivable/tax-calculation",
  invoiceGeneration: "/account-receivable/invoice-generation",
  invoiceApproval: "/account-receivable/invoice-approval",
  masterData: "/account-receivable/master-data",
  invoice: (invoiceId) => `/account-receivable/invoices/${encodeURIComponent(invoiceId)}`,
};
