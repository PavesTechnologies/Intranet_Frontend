import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus,
  Eye,
  Trash2,
  ShieldAlert,
  AlertCircle,
  Info,
} from "lucide-react";

import PageHeader from "../../../../components/ui/PageHeader";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import Button from "../../../../components/Button/Button";
import FormInput from "../../../../components/forms/FormInput";
import Modal from "../../../../components/Modal/modal";
import StatusBadge from "../../../../components/status/statusbadge";
import { showStatusToast } from "../../../../components/toastfy/toast";
import SearchInput from "../../../../components/filter/Searchbar";
import ARClearFiltersButton from "../../components/common/ARClearFiltersButton";
import Pagination from "../../../../components/Pagination/pagination";
import ARTable from "../../components/common/ARTable";
import BackIconButton from "../../components/common/BackIconButton";
import DetailsDrawer from "../../components/common/DetailsDrawer";
import {
  getExchangeRates,
  createDailyRatesBatch,
  createExchangeRate,
  getApiErrorMessage,
  isMissingEndpointError,
} from "../../services/currencyExchangeRateService";
import { getActiveCurrencies, DEFAULT_SUPPORTED_CURRENCIES } from "../../services/currencyService";

const PAGE_SIZE = 8;

const RATE_SOURCES = [
  "MANUAL",
  "RBI Official",
  "European Central Bank (ECB)",
  "Federal Reserve",
  "Bank of England",
  "Reuters / Bloomberg",
];

const INITIAL_BATCH_TARGETS = ["USD", "EUR", "GBP", "AUD", "CAD", "SGD"];

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateValue = (val) => {
  if (!val) return "—";
  try {
    const date = new Date(val);
    if (isNaN(date.getTime())) return String(val);
    const day = String(date.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day}-${months[date.getMonth()]}-${date.getFullYear()}`;
  } catch {
    return String(val);
  }
};

const formatRate = (rate) => {
  if (rate === null || rate === undefined || isNaN(Number(rate))) return "—";
  const num = Number(rate);
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  });
};

const InlineActionButton = ({ icon, label, onClick, disabled = false }) => (
  <Button
    type="button"
    variant="ghost"
    size="icon"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
  >
    {icon}
  </Button>
);

export default function CurrencyExchangeRateMasterPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [exchangeRates, setExchangeRates] = useState([]);
  const [currencies, setCurrencies] = useState(DEFAULT_SUPPORTED_CURRENCIES);
  const [loading, setLoading] = useState(false);
  const [permissionError, setPermissionError] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [sourceCurrencyFilter, setSourceCurrencyFilter] = useState("");
  const [targetCurrencyFilter, setTargetCurrencyFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Maintain Daily Currency Rates Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [baseCurrency, setBaseCurrency] = useState("INR");
  const [effectiveDate, setEffectiveDate] = useState(getTodayDateString());
  const [rateSource, setRateSource] = useState("MANUAL");
  const [rateRows, setRateRows] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // View Details Drawer State
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState(null);

  const loadCurrencies = async () => {
    try {
      const list = await getActiveCurrencies();
      if (list && list.length > 0) {
        setCurrencies(list);
      }
    } catch {
      // fallback to default supported currencies
    }
  };

  const loadExchangeRates = async () => {
    setLoading(true);
    setPermissionError(false);
    try {
      const result = await getExchangeRates();
      if (result.success) {
        setExchangeRates(result.data || []);
      }
    } catch (error) {
      if (error?.response?.status === 403) {
        setPermissionError(true);
      } else if (!isMissingEndpointError(error)) {
        showStatusToast(getApiErrorMessage(error, "Failed to load exchange rates."), "error");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurrencies();
    loadExchangeRates();
  }, []);

  const buildInitialRows = (base, currencyList) => {
    const supportedCodes = new Set(
      (currencyList || []).map((c) => (c.currencyCode || c.value || "").toUpperCase()).filter(Boolean)
    );
    const initialTargets = INITIAL_BATCH_TARGETS.filter(
      (code) => code !== base && supportedCodes.has(code)
    );

    return initialTargets.map((code, idx) => ({
      id: `row-${code}-${idx}-${Date.now()}`,
      targetCurrency: code,
      exchangeRate: "",
    }));
  };

  const handleOpenMaintainDailyModal = () => {
    const defaultBase = "INR";
    const today = getTodayDateString();
    setBaseCurrency(defaultBase);
    setEffectiveDate(today);
    setRateSource("MANUAL");
    setRateRows(buildInitialRows(defaultBase, currencies));
    setFormErrors({});
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      handleOpenMaintainDailyModal();
      searchParams.delete("new");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currencies]);

  const handleBaseCurrencyChange = (newBase) => {
    setBaseCurrency(newBase);
    // Remove rows where target matches new base currency
    setRateRows((prev) => prev.filter((r) => r.targetCurrency !== newBase));
    setFormErrors((prev) => {
      const updated = { ...prev };
      delete updated.baseCurrency;
      return updated;
    });
  };

  const handleAddRow = () => {
    const usedTargets = new Set(rateRows.map((r) => r.targetCurrency));
    const available = (currencies || []).find(
      (c) => {
        const code = (c.currencyCode || c.value || "").toUpperCase();
        return code && code !== baseCurrency && !usedTargets.has(code);
      }
    );
    const newTarget = available ? (available.currencyCode || available.value).toUpperCase() : "";

    setRateRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        targetCurrency: newTarget,
        exchangeRate: "",
      },
    ]);
  };

  const handleRemoveRow = (rowId) => {
    setRateRows((prev) => prev.filter((r) => r.id !== rowId));
    setFormErrors((prev) => {
      const updated = { ...prev };
      delete updated[rowId];
      return updated;
    });
  };

  const handleRowChange = (rowId, field, value) => {
    setRateRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, [field]: value } : r))
    );
    setFormErrors((prev) => {
      const updated = { ...prev };
      if (updated[rowId]?.[field]) {
        delete updated[rowId][field];
      }
      delete updated.duplicate;
      delete updated.general;
      return updated;
    });
  };

  const validateBatchForm = () => {
    const errors = {};
    if (!baseCurrency) {
      errors.baseCurrency = "Base currency is required";
    }
    if (!effectiveDate) {
      errors.effectiveDate = "Effective date is required";
    }
    if (!rateSource) {
      errors.rateSource = "Rate source is required";
    }

    if (!rateRows || rateRows.length === 0) {
      errors.general = "Please add at least one currency rate.";
      setFormErrors(errors);
      return false;
    }

    const seenTargets = new Set();
    rateRows.forEach((row, index) => {
      const rowErr = {};
      const target = (row.targetCurrency || "").trim().toUpperCase();
      const rawRate = row.exchangeRate;
      const rateNum = parseFloat(rawRate);

      if (!target) {
        rowErr.targetCurrency = "Target currency is required";
      } else if (target === baseCurrency) {
        rowErr.targetCurrency = "Target currency must differ from base currency";
      } else if (seenTargets.has(target)) {
        rowErr.targetCurrency = `Duplicate target currency: ${target}`;
        errors.duplicate = `Duplicate target currency found: ${target}. Each target currency within the batch must be unique.`;
      } else {
        seenTargets.add(target);
      }

      if (rawRate === "" || rawRate === null || rawRate === undefined) {
        rowErr.exchangeRate = "Rate is required";
      } else if (isNaN(rateNum) || rateNum <= 0) {
        rowErr.exchangeRate = "Rate must be greater than zero";
      }

      // Check if this (base, target, effectiveDate) already exists in persisted register
      if (target && target !== baseCurrency) {
        const isDuplicateDate = exchangeRates.some((item) => {
          const itemDate = item.effectiveDate ? String(item.effectiveDate).substring(0, 10) : "";
          return (
            item.sourceCurrency?.toUpperCase() === baseCurrency &&
            item.targetCurrency?.toUpperCase() === target &&
            itemDate === effectiveDate
          );
        });

        if (isDuplicateDate) {
          const dupMsg = `An exchange rate for ${baseCurrency} → ${target} on ${effectiveDate} already exists. To preserve historical billing integrity, duplicate effective-dated rates cannot be created.`;
          errors.duplicate = dupMsg;
          rowErr.exchangeRate = "Rate already exists for this date";
        }
      }

      if (Object.keys(rowErr).length > 0) {
        errors[row.id] = rowErr;
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveDailyRates = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!validateBatchForm()) return;

    const payload = {
      sourceCurrency: baseCurrency.trim().toUpperCase(),
      effectiveDate,
      rateSource: rateSource.trim(),
      rates: rateRows.map((r) => ({
        targetCurrency: r.targetCurrency.trim().toUpperCase(),
        exchangeRate: parseFloat(r.exchangeRate),
      })),
    };

    setSubmitting(true);
    try {
      const savedRates = await createDailyRatesBatch(payload);
      showStatusToast("Daily exchange rates saved successfully.", "success");
      setIsModalOpen(false);
      // Immediately refresh the authoritative register
      await loadExchangeRates();
    } catch (error) {
      if (
        error?.response?.status === 409 ||
        String(error?.response?.data?.message || "").toLowerCase().includes("duplicate") ||
        String(error?.response?.data?.message || "").toLowerCase().includes("already exists")
      ) {
        const dupMsg = error?.response?.data?.message ||
          `An exchange rate for one or more currency pairs on ${payload.effectiveDate} already exists. Historical rate records cannot be overwritten.`;
        setFormErrors((prev) => ({ ...prev, duplicate: dupMsg }));
        showStatusToast(dupMsg, "error");
      } else {
        showStatusToast(getApiErrorMessage(error, "Failed to save daily exchange rates."), "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = useMemo(() => {
    return exchangeRates.filter((item) => {
      if (sourceCurrencyFilter && item.sourceCurrency !== sourceCurrencyFilter) {
        return false;
      }
      if (targetCurrencyFilter && item.targetCurrency !== targetCurrencyFilter) {
        return false;
      }

      const query = searchQuery.trim().toLowerCase();
      if (query) {
        const haystack = `${item.sourceCurrency} ${item.targetCurrency} ${item.rateSource || ""} ${item.notes || ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }, [exchangeRates, searchQuery, sourceCurrencyFilter, targetCurrencyFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredItems, currentPage]);

  const hasActiveFilters = Boolean(
    searchQuery || sourceCurrencyFilter || targetCurrencyFilter
  );

  const handleResetFilters = () => {
    setSearchQuery("");
    setSourceCurrencyFilter("");
    setTargetCurrencyFilter("");
    setCurrentPage(1);
  };

  const handleOpenViewModal = (item) => {
    setViewingItem(item);
    setIsViewOpen(true);
  };

  const currencyOptions = useMemo(() => {
    const seen = new Set();
    const opts = [];
    (currencies || []).forEach((c) => {
      const val = (c?.currencyCode || c?.value || "").toUpperCase();
      if (val && !seen.has(val)) {
        seen.add(val);
        opts.push({
          value: val,
          label: `${val} - ${c.currencyName || val}`,
          name: c.currencyName || val,
        });
      }
    });
    return opts;
  }, [currencies]);

  const getCurrencyName = (code) => {
    if (!code) return "—";
    const found = currencyOptions.find((c) => c.value === code);
    return found?.name || code;
  };

  const tableHeaders = [
    "Source Currency",
    "Target Currency",
    "Exchange Rate",
    "Effective Date",
    "Rate Source",
    "Status",
    "Last Updated",
    "Actions",
  ];

  const tableColumns = [
    "sourceCurrency",
    "targetCurrency",
    "exchangeRate",
    "effectiveDate",
    "rateSource",
    "status",
    "lastUpdated",
    "actions",
  ];

  const tableRows = useMemo(() => {
    return paginatedItems.map((item) => ({
      sourceCurrency: (
        <span className="inline-flex items-center rounded bg-slate-100 px-2.5 py-0.5 font-mono text-xs font-semibold text-slate-800">
          {item.sourceCurrency}
        </span>
      ),
      targetCurrency: (
        <span className="inline-flex items-center rounded bg-indigo-50 px-2.5 py-0.5 font-mono text-xs font-semibold text-indigo-700">
          {item.targetCurrency}
        </span>
      ),
      exchangeRate: (
        <span className="font-mono text-xs font-semibold tabular-nums text-slate-900">
          {formatRate(item.exchangeRate)}
        </span>
      ),
      effectiveDate: (
        <span className="text-xs font-medium text-slate-700">
          {formatDateValue(item.effectiveDate)}
        </span>
      ),
      rateSource: (
        <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-0.5 text-xs text-slate-700 border border-slate-200">
          {item.rateSource || "MANUAL"}
        </span>
      ),
      status: <StatusBadge label={item.status || "ACTIVE"} size="sm" />,
      lastUpdated: (
        <span className="text-xs text-slate-500">
          {formatDateValue(item.updatedAt || item.createdAt)}
        </span>
      ),
      actions: (
        <div className="flex items-center justify-center">
          <InlineActionButton
            icon={<Eye className="h-4 w-4" />}
            label="View Details"
            onClick={() => handleOpenViewModal(item)}
          />
        </div>
      ),
    }));
  }, [paginatedItems]);

  return (
    <div className="w-full space-y-6" data-testid="currency-exchange-rates-page">
      <div className="flex items-center gap-3">
        <BackIconButton
          onClick={() => navigate("/account-receivable/master-data")}
          label="Back to Configurations"
        />
        <div className="flex-1">
          <PageHeader
            title="Currency Exchange Rates"
            subtitle="Manage authoritative exchange rates for cross-currency Expense Management (XMS) and AR billing"
            actions={
              <Button
                onClick={handleOpenMaintainDailyModal}
                disabled={loading}
                className="flex items-center gap-1.5"
                data-testid="maintain-daily-rates-btn"
                aria-label="Maintain Daily Rates"
              >
                <Plus className="h-4 w-4" />
                Maintain Daily Rates
              </Button>
            }
          />
        </div>
      </div>

      {permissionError && (
        <div
          data-testid="permission-error-alert"
          className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          <ShieldAlert className="h-4 w-4 shrink-0" />
          You do not have permission to manage currency exchange rates.
        </div>
      )}

      {/* Exchange Rate Register Card */}
      <PageCard className="overflow-hidden">
        <PageCardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Exchange Rate Register</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Authoritative currency conversions for cross-currency expense billing snapshots
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2">
              <div className="w-full sm:w-56">
                <SearchInput
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search currency, source..."
                />
              </div>

              {/* Source Currency Filter */}
              <div className="w-36">
                <select
                  value={sourceCurrencyFilter}
                  onChange={(e) => {
                    setSourceCurrencyFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-9 rounded-lg border border-gray-300 bg-white px-2.5 text-xs text-slate-700 shadow-xs outline-none transition focus:border-blue-500"
                  aria-label="Filter by Source Currency"
                >
                  <option value="">From: All</option>
                  {currencyOptions.map((c) => (
                    <option key={c.value} value={c.value}>{c.value}</option>
                  ))}
                </select>
              </div>

              {/* Target Currency Filter */}
              <div className="w-36">
                <select
                  value={targetCurrencyFilter}
                  onChange={(e) => {
                    setTargetCurrencyFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-9 rounded-lg border border-gray-300 bg-white px-2.5 text-xs text-slate-700 shadow-xs outline-none transition focus:border-blue-500"
                  aria-label="Filter by Target Currency"
                >
                  <option value="">To: All</option>
                  {currencyOptions.map((c) => (
                    <option key={c.value} value={c.value}>{c.value}</option>
                  ))}
                </select>
              </div>

              {hasActiveFilters && (
                <ARClearFiltersButton onClick={handleResetFilters} />
              )}
            </div>
          </div>

          <ARTable
            headers={tableHeaders}
            columns={tableColumns}
            rows={tableRows}
            alignments={{
              sourceCurrency: "left",
              targetCurrency: "left",
              exchangeRate: "left",
              effectiveDate: "left",
              rateSource: "left",
              status: "center",
              lastUpdated: "left",
              actions: "center",
            }}
            loading={loading}
            emptyMessage={
              hasActiveFilters
                ? "No exchange rates match the selected filters."
                : "No exchange rates registered. Click 'Maintain Daily Rates' to enter daily currency exchange rates."
            }
          />

          {!loading && filteredItems.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredItems.length)} of {filteredItems.length} exchange rates
              </p>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPrevious={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                onNext={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
              />
            </div>
          )}
        </PageCardContent>
      </PageCard>

      {/* Maintain Daily Currency Rates Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Maintain Daily Currency Rates"
        subtitle="Enter daily exchange rates for multiple target currencies against a single base currency in one operation."
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              <span>Rates are effective-dated and historical records are preserved.</span>
            </p>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveDailyRates}
                loading={submitting}
                loadingText="Saving Daily Rates..."
                data-testid="save-daily-rates-btn"
              >
                Save Daily Rates
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-5" data-testid="maintain-daily-rates-modal">
          {formErrors.duplicate && (
            <div
              data-testid="duplicate-rate-alert"
              className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <span>{formErrors.duplicate}</span>
            </div>
          )}

          {formErrors.general && (
            <div
              data-testid="general-error-alert"
              className="flex items-start gap-2.5 rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <span>{formErrors.general}</span>
            </div>
          )}

          {/* Header Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Base Currency (From) *
              </label>
              <select
                aria-label="Base Currency"
                value={baseCurrency}
                onChange={(e) => handleBaseCurrencyChange(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-xs outline-none transition focus:border-blue-500"
              >
                {currencyOptions.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              {formErrors.baseCurrency && (
                <p className="mt-1 text-xs text-rose-500">{formErrors.baseCurrency}</p>
              )}
            </div>

            <div>
              <FormInput
                label="Effective Date *"
                name="effectiveDate"
                type="date"
                value={effectiveDate}
                onChange={(e) => {
                  setEffectiveDate(e.target.value);
                  setFormErrors((prev) => {
                    const u = { ...prev };
                    delete u.effectiveDate;
                    delete u.duplicate;
                    return u;
                  });
                }}
                error={formErrors.effectiveDate}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rate Source *
              </label>
              <select
                aria-label="Rate Source"
                value={rateSource}
                onChange={(e) => setRateSource(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-slate-700 shadow-xs outline-none transition focus:border-blue-500"
              >
                {RATE_SOURCES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {formErrors.rateSource && (
                <p className="mt-1 text-xs text-rose-500">{formErrors.rateSource}</p>
              )}
            </div>
          </div>

          {/* Rate Entry Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Target Currencies & Conversion Rates
                </h3>
                <p className="text-[11px] text-slate-500">
                  Enter the value of 1 {baseCurrency} in each target currency
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddRow}
                className="flex items-center gap-1.5 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                data-testid="add-currency-row-btn"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Currency
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3 w-44">Target Currency</th>
                    <th className="py-2.5 px-3 w-48">Currency Name</th>
                    <th className="py-2.5 px-3 min-w-[180px]">Value for 1 {baseCurrency}</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Direction of Conversion</th>
                    <th className="py-2.5 px-3 w-16 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {rateRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        No target currencies added. Click &quot;Add Currency&quot; to add target rates.
                      </td>
                    </tr>
                  ) : (
                    rateRows.map((row, idx) => {
                      const rowErr = formErrors[row.id] || {};
                      const rowPreviewValue =
                        row.exchangeRate && !isNaN(Number(row.exchangeRate)) && Number(row.exchangeRate) > 0
                          ? row.exchangeRate
                          : "[entered rate]";
                      return (
                        <tr key={row.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <select
                              aria-label={`Target Currency Row ${idx + 1}`}
                              value={row.targetCurrency}
                              onChange={(e) => handleRowChange(row.id, "targetCurrency", e.target.value)}
                              className="w-full h-8 rounded-md border border-gray-300 bg-white px-2 text-xs font-mono font-semibold text-slate-800 outline-none transition focus:border-blue-500"
                            >
                              <option value="">Select Target...</option>
                              {currencyOptions
                                .filter((c) => c.value !== baseCurrency)
                                .map((c) => (
                                  <option key={c.value} value={c.value}>
                                    {c.value}
                                  </option>
                                ))}
                            </select>
                            {rowErr.targetCurrency && (
                              <p className="mt-0.5 text-[10px] text-rose-500">{rowErr.targetCurrency}</p>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 font-medium">
                            {getCurrencyName(row.targetCurrency)}
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              step="0.000001"
                              min="0.000001"
                              aria-label={`Exchange Rate Row ${idx + 1}`}
                              placeholder="e.g. 0.012500"
                              value={row.exchangeRate}
                              onChange={(e) => handleRowChange(row.id, "exchangeRate", e.target.value)}
                              className="w-full h-8 rounded-md border border-gray-300 bg-white px-2.5 font-mono text-xs text-slate-900 outline-none transition focus:border-blue-500"
                            />
                            {rowErr.exchangeRate && (
                              <p className="mt-0.5 text-[10px] text-rose-500">{rowErr.exchangeRate}</p>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className="inline-flex items-center font-mono text-xs font-bold text-slate-800 bg-slate-100 rounded px-2 py-1"
                              data-testid={`row-direction-${idx}`}
                            >
                              1 {baseCurrency} = {rowPreviewValue} {row.targetCurrency || "TGT"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveRow(row.id)}
                              aria-label={`Remove row ${idx + 1}`}
                              title="Remove currency row"
                              className="text-slate-400 hover:text-rose-600"
                              data-testid={`remove-row-btn-${idx}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>

      {/* View Details Drawer */}
      <DetailsDrawer
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        title="Exchange Rate Details"
        subtitle={
          viewingItem
            ? `${viewingItem.sourceCurrency} → ${viewingItem.targetCurrency} conversion specification`
            : ""
        }
      >
        {viewingItem && (
          <div className="space-y-4 text-xs">
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Currency Pair:</span>
                <span className="font-semibold text-slate-900 font-mono">
                  {viewingItem.sourceCurrency} → {viewingItem.targetCurrency}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Exchange Rate:</span>
                <span className="font-bold text-indigo-900 font-mono">
                  1 {viewingItem.sourceCurrency} = {formatRate(viewingItem.exchangeRate)} {viewingItem.targetCurrency}
                </span>
              </div>
              {viewingItem.exchangeRate > 0 && (
                <div className="flex justify-between items-center text-[11px] text-slate-400">
                  <span>Inverse Basis:</span>
                  <span className="font-mono">
                    1 {viewingItem.targetCurrency} ≈ {(1 / viewingItem.exchangeRate).toFixed(4)} {viewingItem.sourceCurrency}
                  </span>
                </div>
              )}
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-2.5 text-[11px] text-blue-800">
              <span className="font-semibold">Historical Integrity:</span> Effective-dated exchange rates are preserved immutably for auditability and snapshot repeatability.
            </div>

            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Effective Date:</span>
                <span className="font-medium text-slate-800">{formatDateValue(viewingItem.effectiveDate)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Rate Source / Authority:</span>
                <span className="font-medium text-slate-800">{viewingItem.rateSource || "MANUAL"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Status:</span>
                <StatusBadge label={viewingItem.status || "ACTIVE"} size="sm" />
              </div>
              {viewingItem.approvedBy && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Approved By:</span>
                  <span className="font-medium text-slate-800">{viewingItem.approvedBy}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Created:</span>
                <span className="text-slate-700">{formatDateValue(viewingItem.createdAt)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Last Updated:</span>
                <span className="text-slate-700">{formatDateValue(viewingItem.updatedAt || viewingItem.createdAt)}</span>
              </div>
              {viewingItem.notes && (
                <div className="pt-2">
                  <span className="text-slate-500 block mb-1">Notes:</span>
                  <p className="rounded bg-slate-50 p-2 text-slate-700 border border-slate-100">
                    {viewingItem.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </DetailsDrawer>
    </div>
  );
}
