import React from "react";
import Searchbar from "../../../../components/filter/Searchbar";
import FilterListbox from "../../../../components/filter/FilterListbox";
import { INVOICE_STATUS_OPTIONS } from "../../constants/invoiceStatus";
import { VENDORS } from "../../mocks/apFixtures";

const STATUS_OPTIONS = [{ value: "All", label: "All Statuses" }, ...INVOICE_STATUS_OPTIONS];
const VENDOR_OPTIONS = [
  { value: "All", label: "All Vendors" },
  ...VENDORS.map((vendor) => ({ value: vendor.id, label: vendor.name })),
];

const InvoiceFilterPanel = ({ search, onSearchChange, status, onStatusChange, vendorId, onVendorChange }) => (
  <div className="flex flex-col gap-3 md:flex-row md:items-center">
    <div className="w-full md:max-w-xs">
      <Searchbar
        value={search}
        onSearch={onSearchChange}
        placeholder="Search invoice # or vendor..."
        delay={300}
      />
    </div>
    <div className="w-full md:w-56">
      <FilterListbox options={STATUS_OPTIONS} value={status} onChange={onStatusChange} />
    </div>
    <div className="w-full md:w-56">
      <FilterListbox options={VENDOR_OPTIONS} value={vendorId} onChange={onVendorChange} />
    </div>
  </div>
);

export default InvoiceFilterPanel;
