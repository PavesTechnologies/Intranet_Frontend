import { Info, Landmark } from "lucide-react";
import FinanceSectionCard from "./FinanceSectionCard";
import ClickTarget from "./ClickTarget";
import { formatInrCompact } from "../utils/financeFormatters";

function Tile({ label, source, value, hint, to, emphasis = false }) {
  return (
    <ClickTarget
      to={to}
      label={hint}
      className={`h-full rounded-xl border px-3 py-2.5 ${emphasis ? "border-[#0A0082]/20 bg-[#0A0082]/[0.04]" : "border-slate-200 bg-white"}`}
      clickableClassName="cursor-pointer hover:border-[#0A0082]/30 hover:shadow-sm"
    >
      <p className="truncate text-[11px] text-slate-500" title={hint}>
        {label}
        {source && <span className="text-slate-400"> · {source}</span>}
      </p>
      <p className={`mt-0.5 font-heading text-base font-semibold ${emphasis ? "text-[#0A0082]" : "text-slate-900"}`}>{value}</p>
    </ClickTarget>
  );
}

function Group({ label, children }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">{children}</div>
    </div>
  );
}

/**
 * GST and TDS deliberately rendered as two separate groups. TDS credit (from
 * customers, AR) and TDS payable (deducted from vendors, AP) are never netted.
 * Net GST Liability = Output GST − Eligible ITC (before statutory adjustments).
 * `links.gst` / `links.tds` are set only when the user's role can open them.
 */
export default function TaxComplianceOverview({ tax, links = {}, className = "" }) {
  const { gst, tds } = tax;
  const netGst = gst.outputGst - gst.eligibleItc;

  return (
    <FinanceSectionCard
      title="Tax & Compliance Overview"
      subtitle="GST and TDS position"
      icon={Landmark}
      linkLabel={links.gst ? "View tax details" : undefined}
      onLinkClick={links.gst ? links.onOpenGst : undefined}
      className={className}
    >
      <div className="space-y-3">
        <Group label="GST">
          <Tile label="Output GST" source="AR" value={formatInrCompact(gst.outputGst)} hint="GST charged on customer sales" to={links.gst} />
          <Tile label="Eligible Input ITC" source="AP" value={formatInrCompact(gst.eligibleItc)} hint="Eligible and available input tax credit only" to={links.gst} />
          <Tile
            label="Net GST Liability"
            value={formatInrCompact(netGst)}
            hint="Output GST less eligible ITC, before statutory adjustments and utilisation rules"
            to={links.gst}
            emphasis
          />
        </Group>
        <Group label="TDS">
          <Tile label="TDS Credit from Customers" source="AR" value={formatInrCompact(tds.creditFromCustomers)} hint="Deducted by customers against the company's PAN" to={links.tdsCredit} />
          <Tile label="TDS Payable" source="AP" value={formatInrCompact(tds.payable)} hint="Deducted by the company from vendor payments" to={links.tds} />
          <Tile label="TDS Deposited" source="AP" value={formatInrCompact(tds.deposited)} hint="Vendor TDS deposited with the government" to={links.tds} />
        </Group>
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-[11px] text-slate-500">
        <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Illustrative sample values only — not actual tax liabilities. TDS credit and TDS payable are tracked separately and never offset.
      </p>
    </FinanceSectionCard>
  );
}
