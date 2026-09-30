import { FileText, FileSignature, PackageCheck, Files, IndianRupee } from "lucide-react";

import StatCard from "../../../../components/Cards/StatCard";
import { formatCurrency } from "../../utils/formatters";
import {
  useVendorPurchaseOrders,
  useVendorNdas,
  useVendorGrns,
  useVendorDocuments,
  sumPurchaseOrderValue,
} from "../hooks/useVendorCollections";

/**
 * Vendor Activity — the counts already carried by the vendor-scoped collection endpoints.
 *
 * Every number here is the `count` the backend returned for that collection; nothing is
 * hardcoded and nothing is inferred from another card. Total PO Value is the sum of the
 * purchase orders' own `total_amount`, the order total the PO module already computed.
 *
 * The same query keys back the PO / GRN / NDA / Documents tabs, so opening a tab reuses these
 * responses instead of issuing a second request.
 *
 * @param {{ vendorId: string|number }} props
 */
export default function VendorActivityCards({ vendorId }) {
  const purchaseOrders = useVendorPurchaseOrders(vendorId);
  const ndas = useVendorNdas(vendorId);
  const grns = useVendorGrns(vendorId);
  const documents = useVendorDocuments(vendorId);

  /**
   * A count is shown only once its own request has answered. A failed collection shows "—"
   * rather than 0, because 0 is a real answer here (an empty collection is a normal 200) and
   * must not be confused with "we could not ask".
   */
  const countValue = ({ count, isLoading, isError }) => (isLoading || isError ? "—" : count);

  const poTotalValue =
    purchaseOrders.isLoading || purchaseOrders.isError
      ? "—"
      : formatCurrency(sumPurchaseOrderValue(purchaseOrders.items));

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard
        title="Purchase Orders"
        value={countValue(purchaseOrders)}
        subtitle="Raised for this vendor"
        icon={FileText}
      />

      <StatCard
        title="NDA Documents"
        value={countValue(ndas)}
        subtitle="On file"
        icon={FileSignature}
        textColor="text-indigo-700"
      />

      <StatCard
        title="GRNs"
        value={countValue(grns)}
        subtitle="Goods received"
        icon={PackageCheck}
        textColor="text-amber-700"
      />

      <StatCard
        title="Documents"
        value={countValue(documents)}
        subtitle="Across all records"
        icon={Files}
      />

      <StatCard
        title="Total PO Value"
        value={poTotalValue}
        subtitle="Sum of purchase order totals"
        icon={IndianRupee}
        textColor="text-emerald-700"
      />
    </div>
  );
}
