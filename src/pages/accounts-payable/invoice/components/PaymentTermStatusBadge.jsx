import clsx from "clsx";
import { PAYMENT_TERM_STATUS_META } from "../../constants/paymentTerms";

/** Badge for a payment-term validation status (COMPLIANT / MISMATCH / REVIEW_REQUIRED /
 * VERIFIED_OVERRIDE). Renders "Not checked" for an invoice that predates the feature. */
export default function PaymentTermStatusBadge({ status, className }) {
  const meta = PAYMENT_TERM_STATUS_META[status] || {
    label: "Not checked",
    className: "bg-gray-100 text-gray-600 border-gray-300",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold",
        meta.className,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}
