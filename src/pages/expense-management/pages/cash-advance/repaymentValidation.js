// Client-side checks for an employee repayment. The backend repeats these checks and is the authority:
// it rejects any amount above the outstanding balance, so a bypassed check cannot overpay an advance.

const TWO_DECIMALS = /^\d+(\.\d{1,2})?$/;

/**
 * @param {string|number} rawAmount  the amount typed by the user
 * @param {string|number} outstanding the advance's outstanding balance
 * @param {(amount: number) => string} formatAmount used only to build the message
 * @returns {string} an error message, or "" when the amount is valid
 */
export function validateRepaymentAmount(rawAmount, outstanding, formatAmount = (n) => String(n)) {
  const text = String(rawAmount ?? "").trim();
  if (text === "" || Number.isNaN(Number(text))) {
    return "Enter a repayment amount.";
  }
  const amount = Number(text);
  if (amount <= 0) {
    return "Repayment amount must be greater than zero.";
  }
  if (!TWO_DECIMALS.test(text)) {
    return "Repayment amount can have at most 2 decimal places.";
  }

  const balance = Number(outstanding) || 0;
  if (balance <= 0) {
    return "This advance has no outstanding balance to repay.";
  }
  // Compare in hundredths so binary floating point cannot let an overpayment through
  if (Math.round(amount * 100) > Math.round(balance * 100)) {
    return `Repayment cannot exceed the outstanding balance of ${formatAmount(balance)}.`;
  }
  return "";
}
