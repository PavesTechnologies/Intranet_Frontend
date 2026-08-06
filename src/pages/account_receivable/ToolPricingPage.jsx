import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Pencil, Ban, ChevronRight, Wrench } from "lucide-react";

import PageHeader from "../../components/ui/PageHeader";
import FilterCard from "../../components/ui/FilterCard";
import { PageCard, PageCardContent } from "../../components/Cards/PageCard";
import Button from "../../components/Button/Button";
import SearchInput from "../../components/filter/Searchbar";
import FormSelect from "../../components/forms/FormSelect";
import GenericTable from "../../components/Table/table";
import Pagination from "../../components/Pagination/pagination";
import StatusBadge from "../../components/status/statusbadge";
import ConfirmationModal from "../../components/confirmation_modal/ConfirmationModal";
import { showStatusToast } from "../../components/toastfy/toast";
import ActionMenu from "./components/ActionMenu";
import ToolPricingFormDialog from "./components/toolpricing/ToolPricingFormDialog";
import { BILLING_BASIS_OPTIONS, TOOL_STATUS_FILTER_OPTIONS } from "./data/toolCatalogOptions";
import { formatCurrency, formatDisplayDate } from "./utils/format";
import { getAvailableSoftwareAssets } from "./services/rmsAssetService";
import * as toolPricingService from "./services/toolPricingService";

const INITIAL_FILTERS = { search: "", status: "" };
const PAGE_SIZE = 6;

const TABLE_HEADERS = [
  "Asset Code",
  "Asset Name",
  "Billing Basis",
  "Currency",
  "Unit Price",
  "Effective From",
  "Effective To",
  "Status",
  "Actions",
];
const TABLE_COLUMNS = [
  "assetCode",
  "assetName",
  "billingBasis",
  "currency",
  "unitPrice",
  "effectiveFrom",
  "effectiveTo",
  "status",
  "actions",
];

const BILLING_BASIS_LABELS = BILLING_BASIS_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

const BREADCRUMB_ITEMS = [
  { label: "Account Receivable", to: "/account-receivable/dashboard" },
  { label: "Project Billing Setup", to: "/account-receivable/project-billing-setup/overview" },
  { label: "Tool Pricing", to: null },
];

export default function ToolPricingPage() {
  const [pricingItems, setPricingItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);

  // Assets are never created here — only looked up from RMS (via the isolated
  // rmsAssetService placeholder) so Finance can attach commercial pricing to them.
  const [assets, setAssets] = useState([]);
  const [assetsLoading, setAssetsLoading] = useState(true);

  const [currencyOptions, setCurrencyOptions] = useState([]);
  const [currenciesLoading, setCurrenciesLoading] = useState(true);

  const [dialogState, setDialogState] = useState(null); // { mode: 'create'|'edit'|'view', item? }
  const [saving, setSaving] = useState(false);

  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  const loadPricingItems = useCallback(() => {
    setLoading(true);
    return toolPricingService
      .getAll()
      .then((result) => setPricingItems(Array.isArray(result) ? result : []))
      .catch(() => {
        showStatusToast("Unable to load tool pricing. Please try again.", "error");
        setPricingItems([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadPricingItems();
  }, [loadPricingItems]);

  useEffect(() => {
    let isMounted = true;
    setAssetsLoading(true);

    getAvailableSoftwareAssets()
      .then((result) => {
        if (isMounted) setAssets(Array.isArray(result) ? result : []);
      })
      .catch(() => {
        if (isMounted) {
          showStatusToast("Unable to load assets from RMS.", "error");
          setAssets([]);
        }
      })
      .finally(() => {
        if (isMounted) setAssetsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setCurrenciesLoading(true);

    toolPricingService
      .getActiveCurrencies()
      .then((currencies) => {
        if (!isMounted) return;
        const options = (currencies || []).map((currency) => ({
          value: currency.currencyId,
          label: currency.currencyName ? `${currency.currencyCode} — ${currency.currencyName}` : currency.currencyCode,
        }));
        setCurrencyOptions(options);
      })
      .catch(() => {
        if (!isMounted) return;
        showStatusToast("Unable to load currencies from the Currency master.", "error");
        setCurrencyOptions([]);
      })
      .finally(() => {
        if (isMounted) setCurrenciesLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Used only to populate the dialog's Asset dropdown — table display and search read
  // assetCode/assetName straight off each pricing record instead (see filteredItems /
  // tableRows below), since the backend is the source of truth for those fields.
  const assetOptions = useMemo(
    () => assets.map((asset) => ({ value: asset.assetId, label: `${asset.assetCode} — ${asset.assetName}` })),
    [assets]
  );

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const handleSearch = (value) => {
    setFilters((prev) => ({ ...prev, search: value }));
    setCurrentPage(1);
  };

  const filteredItems = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return pricingItems.filter((item) => {
      const matchesSearch =
        !search ||
        (item.assetCode || "").toLowerCase().includes(search) ||
        (item.assetName || "").toLowerCase().includes(search);
      const matchesStatus = !filters.status || (filters.status === "ACTIVE" ? item.active : !item.active);

      return matchesSearch && matchesStatus;
    });
  }, [pricingItems, filters]);

  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE) || 1;
  const paginatedItems = filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleAdd = () => setDialogState({ mode: "create" });
  const handleView = (item) => setDialogState({ mode: "view", item });
  const handleEdit = (item) => setDialogState({ mode: "edit", item });
  const closeDialog = () => setDialogState(null);

  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      if (dialogState?.mode === "edit" && dialogState.item) {
        await toolPricingService.update(dialogState.item.id, payload);
        showStatusToast("Tool pricing updated successfully.", "success");
      } else {
        await toolPricingService.create(payload);
        showStatusToast("Tool pricing created successfully.", "success");
      }
      closeDialog();
      await loadPricingItems();
    } catch (error) {
      const status = error?.response?.status;
      const message =
        status === 400
          ? error.response?.data?.message || "Please check the pricing details and try again."
          : "Something went wrong while saving tool pricing.";
      showStatusToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;

    setDeactivateLoading(true);
    try {
      await toolPricingService.deleteById(deactivateTarget.id);
      showStatusToast("Tool pricing deactivated successfully.", "success");
      setDeactivateTarget(null);
      await loadPricingItems();
    } catch (error) {
      const message = error?.response?.data?.message || "Unable to deactivate tool pricing. Please try again.";
      showStatusToast(message, "error");
    } finally {
      setDeactivateLoading(false);
    }
  };

  // assetCode/assetName/currencyCode are rendered exactly as returned by getAll() — never
  // joined against the RMS/Currency lookups fetched above, and never cached beyond this
  // render. A fresh getAll() after every create/update/deactivate is what keeps this correct.
  const tableRows = useMemo(
    () =>
      paginatedItems.map((item) => ({
        assetCode: <span className="font-semibold text-slate-900">{item.assetCode}</span>,
        assetName: item.assetName,
        billingBasis: BILLING_BASIS_LABELS[item.billingBasis] || item.billingBasis,
        currency: item.currencyCode,
        unitPrice: formatCurrency(item.unitPrice, item.currencyCode),
        effectiveFrom: formatDisplayDate(item.effectiveFrom),
        effectiveTo: formatDisplayDate(item.effectiveTo),
        status: <StatusBadge label={item.active ? "Active" : "Inactive"} size="sm" />,
        actions: (
          <ActionMenu
            items={[
              { label: "View", icon: <Eye className="h-4 w-4" />, onClick: () => handleView(item) },
              { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: () => handleEdit(item) },
              {
                label: "Deactivate",
                icon: <Ban className="h-4 w-4" />,
                hidden: !item.active,
                danger: true,
                onClick: () => setDeactivateTarget(item),
              },
            ]}
          />
        ),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paginatedItems]
  );

  return (
    <div className="space-y-6 p-6">
      <nav className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
        {BREADCRUMB_ITEMS.map((item, index) => (
          <span key={item.label} className="flex items-center gap-2">
            {item.to ? (
              <Link to={item.to} className="hover:text-slate-800">
                {item.label}
              </Link>
            ) : (
              <span className="text-slate-900">{item.label}</span>
            )}
            {index < BREADCRUMB_ITEMS.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-slate-300" />}
          </span>
        ))}
      </nav>

      <PageHeader
        title="Tool Pricing"
        subtitle="Configure commercial pricing for RMS-sourced software and tool assets."
        actions={
          <Button variant="primary" onClick={handleAdd}>
            + Add Tool Pricing
          </Button>
        }
      />

      <FilterCard title="Filters" description="Search and narrow down tool pricing.">
        <div className="w-full md:w-72">
          <SearchInput
            value={filters.search}
            onChange={handleFilterChange}
            onSearch={handleSearch}
            placeholder="Search by asset code or name..."
          />
        </div>
        <div className="w-full sm:w-48">
          <FormSelect
            label="Status"
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            options={TOOL_STATUS_FILTER_OPTIONS}
          />
        </div>
      </FilterCard>

      <PageCard>
        <PageCardContent className="p-6">
          {!loading && filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <Wrench className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="mb-1 text-sm font-semibold text-slate-900">No Tool Pricing Found</h3>
              <p className="text-xs text-slate-500">Try adjusting your filters, or add new tool pricing.</p>
            </div>
          ) : (
            <>
              <div className="w-full overflow-x-auto">
                <GenericTable headers={TABLE_HEADERS} columns={TABLE_COLUMNS} rows={tableRows} loading={loading} />
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPrevious={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                onNext={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              />
            </>
          )}
        </PageCardContent>
      </PageCard>

      <ToolPricingFormDialog
        isOpen={Boolean(dialogState)}
        mode={dialogState?.mode}
        initialValue={dialogState?.item}
        assetOptions={assetOptions}
        assetsLoading={assetsLoading}
        currencyOptions={currencyOptions}
        currenciesLoading={currenciesLoading}
        saving={saving}
        onClose={closeDialog}
        onSubmit={handleSubmit}
      />

      <ConfirmationModal
        isOpen={Boolean(deactivateTarget)}
        title="Deactivate Tool Pricing"
        message={
          deactivateTarget
            ? "Are you sure you want to deactivate this tool pricing? It will no longer be available for new tool billing."
            : ""
        }
        confirmText="Deactivate"
        variant="danger"
        isLoading={deactivateLoading}
        onCancel={() => setDeactivateTarget(null)}
        onConfirm={handleConfirmDeactivate}
      />
    </div>
  );
}
