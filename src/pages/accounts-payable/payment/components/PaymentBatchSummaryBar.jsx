import React from "react";
import Button from "../../../../components/Button/Button";
import { Fonts } from "../../../../components/Fonts/Fonts";
import { formatCurrency } from "../../utils/formatters";

/**
 * Sticky summary bar shown alongside the Payment Queue table:
 * selected invoice count, total selected amount, and the CTA that kicks
 * off a payment run for the currently-selected invoices.
 */
const PaymentBatchSummaryBar = ({ selectedCount = 0, totalAmount = 0, onStartPaymentRun }) => (
  <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-center gap-6">
      <div>
        <p className={Fonts.smallText}>Selected Invoices</p>
        <p className={Fonts.heading4}>{selectedCount}</p>
      </div>
      <div>
        <p className={Fonts.smallText}>Total Amount</p>
        <p className={Fonts.heading4}>{formatCurrency(totalAmount)}</p>
      </div>
    </div>
    <Button variant="primary" size="medium" disabled={selectedCount === 0} onClick={onStartPaymentRun}>
      Start Payment Run
    </Button>
  </div>
);

export default PaymentBatchSummaryBar;
