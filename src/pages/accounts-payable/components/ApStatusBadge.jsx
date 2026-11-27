import clsx from "clsx";
import { resolveInvoiceStatus, resolveTdsStatus } from "../constants/statusBadge";

/**
 * The one Invoice Status / TDS Status badge for Accounts Payable. Every badge is the same
 * 145 × 32 pill so the two status columns line up; a label too long for it is truncated, with
 * the full text kept in the DOM (read by screen readers) and in a hover tooltip.
 *
 * Deliberately not components/status/statusbadge.jsx: that badge is shared with Accounts
 * Receivable and the other AP statuses and picks colours from keywords in the label, whereas
 * these colours are fixed per status in constants/statusBadge.js.
 *
 * @param {{ type?: "invoice"|"tds", status?: string, label?: string,
 *   determinationStatus?: string, className?: string }} props
 *   For `type="tds"`: `status` is the tracking code, `label` the backend's label and
 *   `determinationStatus` the TDS determination (see resolveTdsStatus).
 */
export default function ApStatusBadge({
  type = "invoice",
  status,
  label,
  determinationStatus,
  className,
}) {
  const { label: text, colors } =
    type === "tds"
      ? resolveTdsStatus({ status, label, determinationStatus })
      : resolveInvoiceStatus(status);
  const [background, color] = colors;

  return (
    <span
      title={text}
      data-testid="ap-status-badge"
      className={clsx(
        "box-border inline-flex h-8 w-[145px] max-w-full shrink-0 items-center justify-center",
        "whitespace-nowrap rounded-full px-3 align-middle text-xs font-medium",
        className,
      )}
      style={{ backgroundColor: background, color }}
    >
      <span className="min-w-0 truncate">{text}</span>
    </span>
  );
}
