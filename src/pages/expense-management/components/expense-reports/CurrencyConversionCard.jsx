import React from "react";
import { ArrowDown, Coins, Landmark, Clock3 } from "lucide-react";
import AnimatedNumber from "./AnimatedNumber";

const formatAmount = (value, maximumFractionDigits = 2) =>
  (Number(value) || 0).toLocaleString(undefined, {
    minimumFractionDigits: maximumFractionDigits,
    maximumFractionDigits,
  });

/**
 * "100 USD -> 95.9693 -> ₹9,596.93 INR" visual conversion chain.
 * exchangeRate/baseAmount/baseCurrencyCode are backend-calculated and only
 * exist once the line item has actually been saved — before that we show a
 * pending state rather than fabricating a client-side rate.
 */
export default function CurrencyConversionCard({
  amount,
  currencyCode,
  exchangeRate,
  baseAmount,
  baseCurrencyCode,
  pending = false,
}) {
  const sameCurrency = currencyCode && baseCurrencyCode && currencyCode === baseCurrencyCode;

  return (
    <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-600">
          <Coins size={14} />
        </div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Multi-Currency Conversion
        </p>
      </div>

      <div className="flex flex-col items-center gap-1.5 text-center">
        <div className="inline-flex items-baseline gap-1.5 rounded-lg bg-white border border-gray-200 px-4 py-2 shadow-sm">
          <span className="text-lg font-bold text-gray-900">{formatAmount(amount)}</span>
          <span className="text-xs font-semibold text-gray-500 uppercase">{currencyCode || "—"}</span>
        </div>

        <ArrowDown size={16} className="text-indigo-300" />

        {pending ? (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 text-gray-500 px-3 py-1 text-xs font-medium">
            <Clock3 size={12} />
            Exchange rate calculated on save
          </div>
        ) : sameCurrency ? (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-green-50 text-green-700 border border-green-200 px-3 py-1 text-xs font-semibold">
            Same as base currency
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 text-indigo-700 px-3 py-1 text-xs font-mono font-semibold">
            <AnimatedNumber value={Number(exchangeRate) || 0} format={(v) => formatAmount(v, 4)} />
          </div>
        )}

        <ArrowDown size={16} className="text-indigo-300" />

        <div className="inline-flex items-center gap-2 rounded-lg bg-[#0A0082] px-4 py-2.5 shadow-sm">
          <Landmark size={16} className="text-indigo-200" />
          <span className="text-lg font-bold text-white">
            {pending ? (
              "—"
            ) : (
              <AnimatedNumber value={Number(baseAmount) || 0} format={(v) => formatAmount(v)} />
            )}
          </span>
          <span className="text-xs font-semibold text-indigo-200 uppercase">
            {baseCurrencyCode || "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
