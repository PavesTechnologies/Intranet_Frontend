import React from "react";
import { Fonts } from "../../../../components/Fonts/Fonts";

export const NOTIFICATION_RULE_DEFINITIONS = [
  {
    key: "invoicePendingApprovalOverdue",
    label: "Invoice pending approval > 3 days",
    description: "Notify approvers when an invoice has been awaiting approval for more than 3 days.",
  },
  {
    key: "paymentBatchScheduled",
    label: "Payment batch scheduled",
    description: "Notify the AP team when a new payment batch has been scheduled for release.",
  },
  {
    key: "vendorBankDetailsChanged",
    label: "Vendor bank details changed",
    description: "Notify AP admins when a vendor's bank account details are added or modified.",
  },
  {
    key: "newExceptionRaised",
    label: "New exception raised",
    description: "Notify the exceptions team whenever a new matching exception is flagged.",
  },
  {
    key: "invoiceOverdue",
    label: "Invoice overdue",
    description: "Notify the AP team when an approved invoice passes its due date unpaid.",
  },
  {
    key: "approvalThresholdBreached",
    label: "Approval rule threshold breached",
    description: "Notify finance leadership when an invoice exceeds its approval tier threshold.",
  },
];

const NotificationRuleList = ({ settings = {}, onToggle }) => (
  <div className="divide-y divide-gray-100">
    {NOTIFICATION_RULE_DEFINITIONS.map((rule) => (
      <div key={rule.key} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
        <div className="min-w-0">
          <p className={Fonts.label}>{rule.label}</p>
          <p className={`${Fonts.caption} mt-1 not-italic`}>{rule.description}</p>
        </div>

        <input
          type="checkbox"
          checked={Boolean(settings[rule.key])}
          onChange={() => onToggle(rule.key)}
          aria-label={rule.label}
          className="mt-1 h-5 w-5 shrink-0 cursor-pointer rounded border-gray-300 text-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/30"
        />
      </div>
    ))}
  </div>
);

export default NotificationRuleList;
