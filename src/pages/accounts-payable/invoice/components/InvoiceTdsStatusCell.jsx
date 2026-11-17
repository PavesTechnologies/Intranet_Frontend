import { useInvoiceTds } from "../hooks/useInvoiceTds";

// [background, text] — same pill palette as constants/statusBadge.js.
const STATES = {
  VERIFIED: { label: "TDS Verified", colors: ["#D1FAE5", "#047857"] },
  DETERMINED: { label: "Awaiting Verification", colors: ["#FFF7ED", "#C2410C"] },
  PENDING: { label: "Pending Determination", colors: ["#FEF3C7", "#92400E"] },
  NOT_DETERMINED: { label: "Not Determined", colors: ["#F3F4F6", "#374151"] },
  UNKNOWN: { label: "—", colors: ["#F3F4F6", "#374151"] },
};

/**
 * TDS determination status for one invoice row on the TDS Status tab. The invoice list response
 * carries no TDS status, so each row reads GET .../tds (cached per invoice under INVOICE_TDS_KEY,
 * the same query the detail page's TDS panel uses, so verifying there refreshes this cell).
 * A 404 means TDS hasn't been determined yet — a normal state, not an error.
 */
export default function InvoiceTdsStatusCell({ invoiceId }) {
  const { data, error, isLoading } = useInvoiceTds(invoiceId);

  if (isLoading) {
    return <span className="text-xs text-gray-400">Loading…</span>;
  }

  let state = STATES.UNKNOWN;
  if (error?.status === 404) state = STATES.NOT_DETERMINED;
  else if (data?.determination_status) state = STATES[data.determination_status] || STATES.UNKNOWN;

  const [background, color] = state.colors;
  return (
    <span
      title={state.label}
      data-testid="tds-status-badge"
      className="box-border inline-flex h-8 w-[145px] max-w-full shrink-0 items-center justify-center whitespace-nowrap rounded-full px-3 text-xs font-medium"
      style={{ backgroundColor: background, color }}
    >
      <span className="truncate">{state.label}</span>
    </span>
  );
}
