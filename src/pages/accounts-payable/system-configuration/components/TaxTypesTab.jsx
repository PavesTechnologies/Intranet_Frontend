import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import SearchInput from "../../../../components/filter/Searchbar";
import FormSelect from "../../../../components/forms/FormSelect";
import Modal from "../../../../components/Modal/modal";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import FormInput from "../../../../components/forms/FormInput";
import StatusBadge from "../../../../components/status/statusbadge";
import ToggleSwitch from "./ToggleSwitch";
import useLocalCrudList from "../hooks/useLocalCrudList";
import {
  TAX_TYPES_MOCK,
  TAX_COUNTRY_OPTIONS,
  TAX_CALCULATION_TYPE_OPTIONS,
} from "../mocks/systemConfigMockData";

const ALL_COUNTRIES = "";

const emptyForm = () => ({
  country: TAX_COUNTRY_OPTIONS[0].value,
  taxName: "",
  taxCode: "",
  calculationType: "PERCENTAGE",
  rateValue: "",
  withholding: false,
  effectiveFrom: "",
  effectiveTo: "",
  systemDefault: false,
  active: true,
});

const formatRate = (item) =>
  item.calculationType === "PERCENTAGE" ? `${item.rateValue}%` : `${item.rateValue}`;

export default function TaxTypesTab() {
  const { items, add, update, remove } = useLocalCrudList(TAX_TYPES_MOCK);
  const [countryFilter, setCountryFilter] = useState(ALL_COUNTRIES);
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});

  const [deleteTarget, setDeleteTarget] = useState(null);

  const countryFilterOptions = [{ value: ALL_COUNTRIES, label: "All Countries" }, ...TAX_COUNTRY_OPTIONS];

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCountry = !countryFilter || item.country === countryFilter;
      const matchesSearch =
        !q || item.taxCode.toLowerCase().includes(q) || item.taxName.toLowerCase().includes(q);
      return matchesCountry && matchesSearch;
    });
  }, [items, countryFilter, search]);

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleToggleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.taxCode.trim()) nextErrors.taxCode = "Tax code is required.";
    if (!form.taxName.trim()) nextErrors.taxName = "Tax name is required.";
    if (form.rateValue === "" || Number(form.rateValue) < 0) {
      nextErrors.rateValue =
        form.calculationType === "PERCENTAGE" ? "Rate % is required." : "Fixed amount is required.";
    }
    if (!form.effectiveFrom) nextErrors.effectiveFrom = "Effective from date is required.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const openAddModal = () => {
    setCurrentItem(null);
    setForm(emptyForm());
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setCurrentItem(item);
    setForm({
      country: item.country,
      taxName: item.taxName,
      taxCode: item.taxCode,
      calculationType: item.calculationType,
      rateValue: String(item.rateValue),
      withholding: item.withholding,
      effectiveFrom: item.effectiveFrom,
      effectiveTo: item.effectiveTo || "",
      systemDefault: item.systemDefault,
      active: item.active,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      ...form,
      taxCode: form.taxCode.trim().toUpperCase(),
      taxName: form.taxName.trim(),
      rateValue: Number(form.rateValue),
    };
    if (currentItem) {
      update(currentItem.id, payload);
    } else {
      add(payload);
    }
    setIsModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    remove(deleteTarget.id);
    setDeleteTarget(null);
  };

  const headers = [
    "Tax Code",
    "Tax Name",
    "Calculation Type",
    "Rate / Amount",
    "Withholding",
    "Effective From",
    "Status",
    "Actions",
  ];
  const columns = [
    "taxCode",
    "taxName",
    "calculationType",
    "rateAmount",
    "withholding",
    "effectiveFrom",
    "status",
    "actions",
  ];

  const rows = filteredItems.map((item) => ({
    taxCode: <span className="font-mono text-xs font-semibold text-gray-700">{item.taxCode}</span>,
    taxName: <span className="font-medium text-gray-900">{item.taxName}</span>,
    calculationType: (
      <span className="text-xs font-medium text-gray-500">
        {item.calculationType === "PERCENTAGE" ? "Percentage" : "Fixed Amount"}
      </span>
    ),
    rateAmount: <span className="font-mono text-blue-600 font-semibold">{formatRate(item)}</span>,
    withholding: (
      <span className={item.withholding ? "text-amber-600 font-medium" : "text-gray-400"}>
        {item.withholding ? "Yes" : "No"}
      </span>
    ),
    effectiveFrom: item.effectiveFrom,
    status: <StatusBadge label={item.active ? "Active" : "Inactive"} size="sm" />,
    actions: (
      <div className="flex items-center gap-2 justify-center">
        <Button
          type="button"
          variant="link"
          size="icon"
          title="Edit Tax Type"
          className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition rounded-md"
          onClick={() => openEditModal(item)}
        >
          <Pencil size={16} />
        </Button>
        <Button
          type="button"
          variant="link"
          size="icon"
          title="Delete Tax Type"
          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-800 transition rounded-md"
          onClick={() => setDeleteTarget(item)}
        >
          <Trash2 size={16} />
        </Button>
      </div>
    ),
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full sm:w-56">
            <FormSelect
              label="Country"
              name="countryFilter"
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              options={countryFilterOptions}
            />
          </div>
          <div className="w-full sm:w-64">
            <SearchInput onSearch={setSearch} placeholder="Search by tax code or name..." />
          </div>
        </div>
        <Button variant="primary" onClick={openAddModal} className="whitespace-nowrap">
          <Plus size={16} />
          Add Tax Type
        </Button>
      </div>

      <div className="w-full overflow-x-auto rounded-lg">
        <GenericTable headers={headers} rows={rows} columns={columns} />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentItem ? "Edit Tax Type" : "Add Tax Type"}
        subtitle="Define a tax or withholding type used in invoice calculations."
        size="lg"
        closeOnBackdrop={false}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" form="tax-type-form" variant="primary" className="w-full sm:w-auto">
              Save Tax Type
            </Button>
          </div>
        }
      >
        <form id="tax-type-form" onSubmit={handleSave} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              label="Country"
              name="country"
              value={form.country}
              onChange={handleFieldChange}
              options={TAX_COUNTRY_OPTIONS}
            />
            <FormInput
              label="Tax Code"
              name="taxCode"
              placeholder="e.g. GST"
              value={form.taxCode}
              onChange={handleFieldChange}
              requiredMark
              error={errors.taxCode}
            />
          </div>

          <FormInput
            label="Tax Name"
            name="taxName"
            placeholder="e.g. Goods & Service Tax"
            value={form.taxName}
            onChange={handleFieldChange}
            requiredMark
            error={errors.taxName}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              label="Calculation Type"
              name="calculationType"
              value={form.calculationType}
              onChange={handleFieldChange}
              options={TAX_CALCULATION_TYPE_OPTIONS}
            />
            <FormInput
              label={form.calculationType === "PERCENTAGE" ? "Rate %" : "Fixed Amount"}
              name="rateValue"
              type="number"
              min="0"
              step="0.01"
              value={form.rateValue}
              onChange={handleFieldChange}
              requiredMark
              error={errors.rateValue}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Effective From"
              name="effectiveFrom"
              type="date"
              value={form.effectiveFrom}
              onChange={handleFieldChange}
              requiredMark
              error={errors.effectiveFrom}
            />
            <FormInput
              label="Effective To"
              name="effectiveTo"
              type="date"
              value={form.effectiveTo}
              onChange={handleFieldChange}
            />
          </div>

          <div className="grid grid-cols-3 gap-4 rounded-lg border border-gray-200 p-4">
            <ToggleSwitch
              label="Withholding"
              checked={form.withholding}
              onChange={(val) => handleToggleChange("withholding", val)}
            />
            <ToggleSwitch
              label="System Default"
              checked={form.systemDefault}
              onChange={(val) => handleToggleChange("systemDefault", val)}
            />
            <ToggleSwitch
              label="Active"
              checked={form.active}
              onChange={(val) => handleToggleChange("active", val)}
            />
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={!!deleteTarget}
        title="Delete Tax Type"
        message={`Are you sure you want to delete the tax type "${deleteTarget?.taxName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        variant="danger"
      />
    </div>
  );
}
