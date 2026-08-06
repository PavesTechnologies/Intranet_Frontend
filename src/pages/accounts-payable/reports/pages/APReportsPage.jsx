import React, { useMemo, useState } from "react";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import StatusBadge from "../../../../components/status/statusbadge";
import { Fonts } from "../../../../components/Fonts/Fonts";
import { showStatusToast } from "../../../../components/toastfy/toast";
import ReportFilterPanel from "../components/ReportFilterPanel";
import ReportSummaryTable from "../components/ReportSummaryTable";
import { useAPReports } from "../hooks/useAPReports";
import { VENDORS } from "../../mocks/apFixtures";
import { formatCurrency, formatNumber } from "../../utils/formatters";

const VENDOR_OPTIONS = [
  { value: "all", label: "All Vendors" },
  ...VENDORS.map((vendor) => ({ value: vendor.id, label: vendor.name })),
];

const PAYMENT_METHOD_COLORS = {
  ACH: "#2a78d6",
  Wire: "#6da7ec",
  Check: "#b7d3f6",
};

export default function APReportsPage() {
  const [filters, setFilters] = useState({ dateFrom: "", dateTo: "", vendorId: "all" });
  const { isLoading, isError, aging, vendorSpend, paymentMethod } = useAPReports();

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleExport = () => {
    showStatusToast("Export started (mock).", "info");
  };

  const filteredVendorSpend = useMemo(() => {
    if (filters.vendorId === "all") return vendorSpend;
    return vendorSpend.filter((row) => row.vendorId === filters.vendorId);
  }, [vendorSpend, filters.vendorId]);

  const agingRows = useMemo(
    () =>
      aging.map((bucket) => ({
        bucket: bucket.label,
        count: formatNumber(bucket.count),
        totalAmount: formatCurrency(bucket.totalAmount),
      })),
    [aging]
  );

  const vendorSpendRows = useMemo(
    () =>
      filteredVendorSpend.map((row) => ({
        vendorName: row.vendorName,
        category: row.category,
        totalInvoiced: formatCurrency(row.totalInvoiced),
        outstandingBalance: formatCurrency(row.outstandingBalance),
        status: <StatusBadge label={row.status} size="sm" />,
      })),
    [filteredVendorSpend]
  );

  const maxMethodPct = Math.max(...paymentMethod.map((m) => m.pct), 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Aging, vendor spend, and payment method reporting for Accounts Payable."
        actions={
          <Button variant="outline" onClick={handleExport}>
            Export CSV
          </Button>
        }
      />

      <ReportFilterPanel
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        vendorId={filters.vendorId}
        vendorOptions={VENDOR_OPTIONS}
        onChange={handleFilterChange}
        onExport={handleExport}
      />

      {isLoading && <LoadingSpinner text="Loading reports..." size="lg" />}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load report data.
        </div>
      )}

      {!isLoading && !isError && (
        <div className="space-y-6">
          <PageCard>
            <PageCardContent>
              <h2 className={`${Fonts.subheading} mb-1`}>Aging Summary</h2>
              <p className="mb-3 text-xs text-slate-400">Open (unpaid) invoices grouped by days past due, relative to due date.</p>
              <ReportSummaryTable
                headers={["Bucket", "Invoice Count", "Total Amount"]}
                columns={["bucket", "count", "totalAmount"]}
                rows={agingRows}
              />
            </PageCardContent>
          </PageCard>

          <PageCard>
            <PageCardContent>
              <h2 className={`${Fonts.subheading} mb-1`}>Vendor Spend Report</h2>
              <p className="mb-3 text-xs text-slate-400">Vendors ranked by total invoiced amount, with current outstanding balance.</p>
              <ReportSummaryTable
                headers={["Vendor", "Category", "Total Invoiced", "Outstanding Balance", "Status"]}
                columns={["vendorName", "category", "totalInvoiced", "outstandingBalance", "status"]}
                rows={vendorSpendRows}
              />
            </PageCardContent>
          </PageCard>

          <PageCard>
            <PageCardContent>
              <h2 className={`${Fonts.subheading} mb-1`}>Payment Method Report</h2>
              <p className="mb-4 text-xs text-slate-400">Weighted-average payment method split across all payment batches.</p>
              <div className="space-y-4">
                {paymentMethod.map((method) => (
                  <div key={method.method}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{method.method}</span>
                      <span className="text-slate-500">
                        {method.pct.toFixed(1)}% &middot; {formatCurrency(method.amount)}
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-gray-100">
                      <div
                        className="h-3 rounded-full"
                        style={{
                          width: `${Math.max(2, (method.pct / maxMethodPct) * 100)}%`,
                          backgroundColor: PAYMENT_METHOD_COLORS[method.method] || "#94a3b8",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-4">
                {paymentMethod.map((method) => (
                  <div key={`legend-${method.method}`} className="flex items-center gap-2 text-xs text-slate-500">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: PAYMENT_METHOD_COLORS[method.method] || "#94a3b8" }}
                    />
                    {method.method}
                  </div>
                ))}
              </div>
            </PageCardContent>
          </PageCard>
        </div>
      )}
    </div>
  );
}
