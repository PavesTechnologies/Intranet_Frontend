import { Info } from "lucide-react";
import FinanceSectionCard from "./FinanceSectionCard";
import { formatInrCompact } from "../utils/financeFormatters";

function Tile({ label, source, value, hint, emphasis = false }) {
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${emphasis ? "border-indigo-200 bg-indigo-50/50" : "border-gray-200 bg-white"}`} title={hint}>
      <p className="truncate text-[11px] text-gray-500">
        {label}
        {source && <span className="text-gray-400"> · {source}</span>}
      </p>
      <p className="mt-1 text-lg font-bold text-gray-900">{value}</p>
    </div>
  );
}

/**
 * GST and TDS deliberately rendered as two separate groups. TDS credit (from
 * customers, AR) and TDS payable (deducted from vendors, AP) are never netted.
 * Net GST Liability = Output GST − Eligible ITC (before statutory adjustments).
 */
export default function TaxComplianceOverview({ tax, onViewDetails, className = "" }) {
  const { gst, tds } = tax;
  const netGst = gst.outputGst - gst.eligibleItc;

  return (
    <FinanceSectionCard
      title="Tax & Compliance Overview"
      accent="bg-emerald-600"
      linkLabel="View tax details"
      onLinkClick={onViewDetails}
      className={className}
    >
      <div className="space-y-3">
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">GST</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Tile label="Output GST" source="AR" value={formatInrCompact(gst.outputGst)} hint="GST charged on customer sales" />
            <Tile label="Eligible Input ITC" source="AP" value={formatInrCompact(gst.eligibleItc)} hint="Eligible and available input tax credit only" />
            <Tile
              label="Net GST Liability"
              value={formatInrCompact(netGst)}
              hint="Output GST less eligible ITC, before statutory adjustments and utilisation rules"
              emphasis
            />
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">TDS</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Tile label="TDS Credit from Customers" source="AR" value={formatInrCompact(tds.creditFromCustomers)} hint="Deducted by customers against the company's PAN" />
            <Tile label="TDS Payable" source="AP" value={formatInrCompact(tds.payable)} hint="Deducted by the company from vendor payments" />
            <Tile label="TDS Deposited" source="AP" value={formatInrCompact(tds.deposited)} hint="Vendor TDS deposited with the government" />
          </div>
        </div>
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-[11px] text-gray-500">
        <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Illustrative sample values only — not actual tax liabilities. TDS credit and TDS payable are tracked separately and never offset.
      </p>
    </FinanceSectionCard>
  );
}
