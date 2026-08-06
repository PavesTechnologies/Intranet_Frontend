import React from "react";
import FormDatePicker from "../../../../components/forms/FormDatePicker";
import FilterListbox from "../../../../components/filter/FilterListbox";
import Button from "../../../../components/Button/Button";
import { Fonts } from "../../../../components/Fonts/Fonts";

export default function ReportFilterPanel({
  dateFrom,
  dateTo,
  vendorId,
  vendorOptions = [],
  onChange,
  onExport,
}) {
  const handleVendorChange = (value) => {
    onChange({ target: { name: "vendorId", value } });
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-white p-4 shadow-sm md:flex-row md:items-end md:justify-between">
      <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
        <FormDatePicker label="From" name="dateFrom" value={dateFrom} onChange={onChange} />
        <FormDatePicker label="To" name="dateTo" value={dateTo} onChange={onChange} />
        <div className="space-y-1">
          <label className={Fonts.label}>Vendor</label>
          <FilterListbox options={vendorOptions} value={vendorId} onChange={handleVendorChange} />
        </div>
      </div>
      <Button variant="outline" onClick={onExport}>
        Export
      </Button>
    </div>
  );
}
