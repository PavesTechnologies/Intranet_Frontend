import React from "react";
import { Receipt, Minus, Equal } from "lucide-react";
import AnimatedNumber from "./AnimatedNumber";

const formatAmount = (value) =>
  (Number(value) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Live Amount / GST / Net Amount calculation card.
 * netAmount = amount - taxAmount (mirrors the backend's own formula), so this
 * updates instantly as the user types, before the backend value ever returns.
 */
export default function GstCalculationCard({ amount, gst, symbol = "" }) {
  const numericAmount = Number(amount) || 0;
  const numericGst = Number(gst) || 0;
  const net = numericAmount - numericGst;
  const isInvalid = numericGst > numericAmount;

  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${
        isInvalid ? "border-red-200 bg-red-50" : "border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50"
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded-lg ${isInvalid ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}`}>
          <Receipt size={14} />
        </div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">VAT / GST Calculation</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="text-center">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Amount</p>
          <p className="text-lg font-bold text-gray-900">
            {symbol}
            <AnimatedNumber value={numericAmount} format={formatAmount} />
          </p>
        </div>

        <Minus size={16} className="text-gray-300 mt-3" />

        <div className="text-center">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">GST</p>
          <p className="text-lg font-bold text-amber-600">
            {symbol}
            <AnimatedNumber value={numericGst} format={formatAmount} />
          </p>
        </div>

        <Equal size={16} className="text-gray-300 mt-3" />

        <div className="text-center">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Net Amount</p>
          <p className={`text-lg font-bold ${isInvalid ? "text-red-600" : "text-emerald-700"}`}>
            {symbol}
            <AnimatedNumber value={net} format={formatAmount} />
          </p>
        </div>
      </div>

      {isInvalid && (
        <p className="mt-3 text-center text-xs font-medium text-red-600">
          GST cannot exceed the expense amount.
        </p>
      )}
    </div>
  );
}
