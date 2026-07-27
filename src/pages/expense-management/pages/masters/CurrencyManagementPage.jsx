
import React, { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Coins, TrendingUp, RefreshCw, Layers, DollarSign, Calendar, Sliders } from "lucide-react";
import Select from "react-select";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import { PageCard, PageCardContent } from "@/components/Cards/PageCard";
import GenericTable from "@/components/Table/table";
import Pagination from "@/components/Pagination/pagination";
import Button from "@/components/Button/Button";
import SearchInput from "@/components/filter/Searchbar";
import Modal from "@/components/Modal/modal";
import ConfirmationModal from "@/components/confirmation_modal/ConfirmationModal";
import StatusBadge from "@/components/status/statusbadge";
import LoadingSpinner from "@/components/LoadingSpinner";
import FormInput from "@/components/forms/FormInput";
import FormSelect from "@/components/forms/FormSelect";
import { useAuth } from "@/contexts/AuthContext";
import { showStatusToast } from "@/components/toastfy/toast";
import api from "@/api/axiosInstance";
import { Fonts } from "@/components/Fonts/Fonts";

const EXPENSE_API_BASE = window.__APP_CONFIG__?.EXPENSE_MANAGEMENT_URL || "";

const currencyService = {
  getAll: (params) => {
    return api.get("/xms/admin/currencies", {
      baseURL: EXPENSE_API_BASE,
      params,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
  },
  getById: (id) => {
    return api.get(`/xms/admin/currencies/${id}`, {
      baseURL: EXPENSE_API_BASE,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
  },
  create: (payload) => {
    return api.post("/xms/admin/currencies", payload, {
      baseURL: EXPENSE_API_BASE,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
  },
  update: (id, payload) => {
    return api.put(`/xms/admin/currencies/${id}`, payload, {
      baseURL: EXPENSE_API_BASE,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
  },
  delete: (id) => {
    return api.delete(`/xms/admin/currencies/${id}`, {
      baseURL: EXPENSE_API_BASE,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
  },
};

const exchangeRateService = {
  getAll: (params) => {
    return api.get("/xms/admin/exchange-rates", {
      baseURL: EXPENSE_API_BASE,
      params,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
  },
  getById: (id) => {
    return api.get(`/xms/admin/exchange-rates/${id}`, {
      baseURL: EXPENSE_API_BASE,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
  },
  create: (payload) => {
    return api.post("/xms/admin/exchange-rates", payload, {
      baseURL: EXPENSE_API_BASE,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
  },
  update: (id, payload) => {
    return api.put(`/xms/admin/exchange-rates/${id}`, payload, {
      baseURL: EXPENSE_API_BASE,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
  },
  delete: (id) => {
    return api.delete(`/xms/admin/exchange-rates/${id}`, {
      baseURL: EXPENSE_API_BASE,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
  },
  refresh: () => {
    return api.post("/xms/admin/exchange-rates/refresh", {}, {
      baseURL: EXPENSE_API_BASE,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
  },
};

const ITEMS_PER_PAGE = 10;

const selectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: "0.5rem",
    borderColor: state.isFocused ? "#3b82f6" : "#d1d5db",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(59, 130, 246, 0.5)" : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    padding: "0.125rem 0.25rem",
    minHeight: "42px",
    backgroundColor: "#ffffff",
    "&:hover": {
      borderColor: state.isFocused ? "#3b82f6" : "#d1d5db",
    },
  }),
  menu: (base) => ({
    ...base,
    zIndex: 9999,
  }),
};

export default function CurrencyManagementPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole(["Admin", "Super_Admin"]);

  const [activeTab, setActiveTab] = useState("currencies"); // "currencies" | "exchangeRates"

  // Currencies State
  const [currencies, setCurrencies] = useState([]);
  const [allCurrencies, setAllCurrencies] = useState([]);
  const [isCurrenciesServerPaginated, setIsCurrenciesServerPaginated] = useState(false);
  const [totalCurrenciesCount, setTotalCurrenciesCount] = useState(0);
  const [currenciesLoading, setCurrenciesLoading] = useState(true);
  const [currencyCurrentPage, setCurrencyCurrentPage] = useState(1);
  const [currencySearch, setCurrencySearch] = useState("");
  const [currencyStatusFilter, setCurrencyStatusFilter] = useState(""); // "ACTIVE" | "INACTIVE" | ""

  // Exchange Rates State
  const [exchangeRates, setExchangeRates] = useState([]);
  const [allExchangeRates, setAllExchangeRates] = useState([]);
  const [isRatesServerPaginated, setIsRatesServerPaginated] = useState(false);
  const [totalRatesCount, setTotalRatesCount] = useState(0);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [rateCurrentPage, setRateCurrentPage] = useState(1);
  const [rateFromCurrencyFilter, setRateFromCurrencyFilter] = useState("");
  const [rateToCurrencyFilter, setRateToCurrencyFilter] = useState("");
  const [rateEffectiveDateFilter, setRateEffectiveDateFilter] = useState("");

  // Modals & Submitting
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [currentCurrency, setCurrentCurrency] = useState(null);
  const [currencyForm, setCurrencyForm] = useState({
    currencyCode: "",
    currencyName: "",
    symbol: "",
    decimalPlaces: 2,
    status: "ACTIVE",
  });
  const [currencyErrors, setCurrencyErrors] = useState({});

  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [currentRate, setCurrentRate] = useState(null);
  const [rateForm, setRateForm] = useState({
    fromCurrency: "",
    toCurrency: "",
    rate: "",
    effectiveDate: new Date().toISOString().split("T")[0],
    source: "Manual",
    status: "ACTIVE",
  });
  const [rateErrors, setRateErrors] = useState({});

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'currency'|'rate', data: object }
  const [submitting, setSubmitting] = useState(false);
  const [refreshingRates, setRefreshingRates] = useState(false);
  const [dropdownCurrencies, setDropdownCurrencies] = useState([]);

  // Fetch Currencies list
  const fetchCurrencies = useCallback(async () => {
    try {
      setCurrenciesLoading(true);
      const params = {
        page: currencyCurrentPage,
        limit: ITEMS_PER_PAGE,
        search: currencySearch,
        status: currencyStatusFilter || undefined,
      };

      const res = await currencyService.getAll(params);

      if (res.data && typeof res.data === "object" && !Array.isArray(res.data)) {
        const items = res.data.currencies || res.data.content || res.data.data || [];
        const total = res.data.total !== undefined ? res.data.total : (res.data.totalElements || items.length || 0);
        setCurrencies(items);
        setTotalCurrenciesCount(total);
        setIsCurrenciesServerPaginated(true);
      } else if (Array.isArray(res.data)) {
        setAllCurrencies(res.data);
        setIsCurrenciesServerPaginated(false);
      } else {
        setCurrencies([]);
        setTotalCurrenciesCount(0);
      }
    } catch (err) {
      console.error("Failed to fetch currencies:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to fetch currencies.";
      showStatusToast(errMsg, "error");
      setCurrencies([]);
      setTotalCurrenciesCount(0);
    } finally {
      setCurrenciesLoading(false);
    }
  }, [currencyCurrentPage, currencySearch, currencyStatusFilter]);

  // Fetch Exchange Rates list
  const fetchExchangeRates = useCallback(async () => {
    try {
      setRatesLoading(true);
      const params = {
        page: rateCurrentPage,
        limit: ITEMS_PER_PAGE,
        fromCurrency: rateFromCurrencyFilter || undefined,
        toCurrency: rateToCurrencyFilter || undefined,
        effectiveDate: rateEffectiveDateFilter || undefined,
      };

      const res = await exchangeRateService.getAll(params);

      if (res.data && typeof res.data === "object" && !Array.isArray(res.data)) {
        const items = res.data.exchangeRates || res.data.content || res.data.data || [];
        const total = res.data.total !== undefined ? res.data.total : (res.data.totalElements || items.length || 0);
        setExchangeRates(items);
        setTotalRatesCount(total);
        setIsRatesServerPaginated(true);
      } else if (Array.isArray(res.data)) {
        setAllExchangeRates(res.data);
        setIsRatesServerPaginated(false);
      } else {
        setExchangeRates([]);
        setTotalRatesCount(0);
      }
    } catch (err) {
      console.error("Failed to fetch exchange rates:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to fetch exchange rates.";
      showStatusToast(errMsg, "error");
      setExchangeRates([]);
      setTotalRatesCount(0);
    } finally {
      setRatesLoading(false);
    }
  }, [rateCurrentPage, rateFromCurrencyFilter, rateToCurrencyFilter, rateEffectiveDateFilter]);

  const fetchAllCurrenciesForLookup = useCallback(async () => {
    try {
      const res = await currencyService.getAll({ page: 1, limit: 1000 });
      let list = [];
      if (res.data && typeof res.data === "object" && !Array.isArray(res.data)) {
        list = res.data.currencies || res.data.content || res.data.data || [];
      } else if (Array.isArray(res.data)) {
        list = res.data;
      }
      setAllCurrencies(list);
      const activeList = list.filter((c) => c && (c.status === "ACTIVE" || c.status === "active"));
      setDropdownCurrencies(activeList);
    } catch (e) {
      console.error("Failed to load currencies lookup", e);
    }
  }, []);

  // Load Initial Data & Lookup list on mount
  useEffect(() => {
    fetchAllCurrenciesForLookup();
  }, [fetchAllCurrenciesForLookup]);

  useEffect(() => {
    if (activeTab === "currencies") {
      fetchCurrencies();
    } else {
      fetchExchangeRates();
    }
  }, [activeTab, fetchCurrencies, fetchExchangeRates]);

  // Helper selectors for dynamic options
  const currencyOptionsForDropdown = dropdownCurrencies.map((c) => ({
    value: c.currencyCode,
    label: `${c.currencyCode} - ${c.currencyName || "N/A"}`,
  }));

  // Currencies Pagination/Search/Filter Computing
  const displayedCurrencies = isCurrenciesServerPaginated
    ? currencies
    : (() => {
        const filtered = allCurrencies.filter((c) => {
          const code = (c.currencyCode || "").toLowerCase();
          const name = (c.currencyName || "").toLowerCase();
          const symbol = (c.symbol || "").toLowerCase();
          const q = currencySearch.toLowerCase();
          const matchesSearch = code.includes(q) || name.includes(q) || symbol.includes(q);
          const matchesStatus = !currencyStatusFilter || c.status === currencyStatusFilter;
          return matchesSearch && matchesStatus;
        });
        const start = (currencyCurrentPage - 1) * ITEMS_PER_PAGE;
        return filtered.slice(start, start + ITEMS_PER_PAGE);
      })();

  const totalCurrenciesFilteredCount = isCurrenciesServerPaginated
    ? totalCurrenciesCount
    : allCurrencies.filter((c) => {
        const code = (c.currencyCode || "").toLowerCase();
        const name = (c.currencyName || "").toLowerCase();
        const symbol = (c.symbol || "").toLowerCase();
        const q = currencySearch.toLowerCase();
        const matchesSearch = code.includes(q) || name.includes(q) || symbol.includes(q);
        const matchesStatus = !currencyStatusFilter || c.status === currencyStatusFilter;
        return matchesSearch && matchesStatus;
      }).length;

  const currencyTotalPages = Math.ceil(totalCurrenciesFilteredCount / ITEMS_PER_PAGE);

  // Exchange Rates Pagination/Filters Computing
  const displayedRates = isRatesServerPaginated
    ? exchangeRates
    : (() => {
        const filtered = allExchangeRates.filter((r) => {
          const matchesFrom = !rateFromCurrencyFilter || r.fromCurrency === rateFromCurrencyFilter;
          const matchesTo = !rateToCurrencyFilter || r.toCurrency === rateToCurrencyFilter;
          const matchesDate = !rateEffectiveDateFilter || r.effectiveDate === rateEffectiveDateFilter;
          return matchesFrom && matchesTo && matchesDate;
        });
        const start = (rateCurrentPage - 1) * ITEMS_PER_PAGE;
        return filtered.slice(start, start + ITEMS_PER_PAGE);
      })();

  const totalRatesFilteredCount = isRatesServerPaginated
    ? totalRatesCount
    : allExchangeRates.filter((r) => {
        const matchesFrom = !rateFromCurrencyFilter || r.fromCurrency === rateFromCurrencyFilter;
        const matchesTo = !rateToCurrencyFilter || r.toCurrency === rateToCurrencyFilter;
        const matchesDate = !rateEffectiveDateFilter || r.effectiveDate === rateEffectiveDateFilter;
        return matchesFrom && matchesTo && matchesDate;
      }).length;

  const ratesTotalPages = Math.ceil(totalRatesFilteredCount / ITEMS_PER_PAGE);

  // Currency Handlers
  const handleCurrencyInputChange = (e) => {
    const { name, value } = e.target;
    setCurrencyForm((prev) => ({ ...prev, [name]: value }));
    if (currencyErrors[name]) {
      setCurrencyErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleCurrencySelectChange = (name, value) => {
    setCurrencyForm((prev) => ({ ...prev, [name]: value }));
    if (currencyErrors[name]) {
      setCurrencyErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateCurrencyForm = () => {
    const errors = {};
    const code = currencyForm.currencyCode.trim().toUpperCase();
    const name = currencyForm.currencyName.trim();
    const symbol = currencyForm.symbol.trim();

    if (!code) {
      errors.currencyCode = "Currency code is required.";
    } else if (code.length !== 3) {
      errors.currencyCode = "Currency code must be exactly 3 characters (ISO 4217).";
    } else if (!/^[A-Z]{3}$/.test(code)) {
      errors.currencyCode = "Currency code must contain only alphabetical characters.";
    }

    if (!name) {
      errors.currencyName = "Currency name is required.";
    } else if (name.length < 2 || name.length > 100) {
      errors.currencyName = "Currency name must be between 2 and 100 characters.";
    }

    if (!symbol) {
      errors.symbol = "Symbol is required.";
    }

    if (currencyForm.decimalPlaces === undefined || currencyForm.decimalPlaces === "" || Number(currencyForm.decimalPlaces) < 0 || Number(currencyForm.decimalPlaces) > 4) {
      errors.decimalPlaces = "Decimal places must be between 0 and 4.";
    }

    setCurrencyErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openCreateCurrencyModal = () => {
    if (!isAdmin) return;
    setCurrentCurrency(null);
    setCurrencyForm({
      currencyCode: "",
      currencyName: "",
      symbol: "",
      decimalPlaces: 2,
      status: "ACTIVE",
    });
    setCurrencyErrors({});
    setIsCurrencyModalOpen(true);
  };

  const handleEditCurrencyClick = (c) => {
    if (!isAdmin) return;
    setCurrentCurrency(c);
    setCurrencyForm({
      currencyCode: c.currencyCode || "",
      currencyName: c.currencyName || "",
      symbol: c.symbol || "",
      decimalPlaces: c.decimalPlaces !== undefined ? c.decimalPlaces : 2,
      status: c.status || "ACTIVE",
    });
    setCurrencyErrors({});
    setIsCurrencyModalOpen(true);
  };

  const handleSaveCurrency = async (e) => {
    e.preventDefault();
    if (!validateCurrencyForm()) return;

    const payload = {
      currencyCode: currencyForm.currencyCode.trim().toUpperCase(),
      currencyName: currencyForm.currencyName.trim(),
      symbol: currencyForm.symbol.trim(),
      decimalPlaces: Number(currencyForm.decimalPlaces),
      status: currencyForm.status,
    };

    try {
      setSubmitting(true);
      if (currentCurrency) {
        await currencyService.update(currentCurrency.currencyId, payload);
        showStatusToast("Currency updated successfully!", "success");
      } else {
        await currencyService.create(payload);
        showStatusToast("Currency registered successfully!", "success");
        setCurrencyCurrentPage(1);
      }
      setIsCurrencyModalOpen(false);
      fetchCurrencies();
    } catch (err) {
      console.error("Error saving Currency:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to save Currency.";
      showStatusToast(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Exchange Rate Handlers
  const handleRateInputChange = (e) => {
    const { name, value } = e.target;
    setRateForm((prev) => ({ ...prev, [name]: value }));
    if (rateErrors[name]) {
      setRateErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleRateSelectChange = (name, value) => {
    setRateForm((prev) => ({ ...prev, [name]: value }));
    if (rateErrors[name]) {
      setRateErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateRateForm = () => {
    const errors = {};
    if (!rateForm.fromCurrency) {
      errors.fromCurrency = "From currency is required.";
    }
    if (!rateForm.toCurrency) {
      errors.toCurrency = "To currency is required.";
    }
    if (rateForm.fromCurrency && rateForm.toCurrency && rateForm.fromCurrency === rateForm.toCurrency) {
      errors.toCurrency = "Source and target currencies must be different.";
    }
    if (!rateForm.rate || Number(rateForm.rate) <= 0) {
      errors.rate = "Rate must be a positive number greater than 0.";
    }
    if (!rateForm.effectiveDate) {
      errors.effectiveDate = "Effective date is required.";
    }

    setRateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openCreateRateModal = () => {
    if (!isAdmin) return;
    setCurrentRate(null);
    setRateForm({
      fromCurrency: "",
      toCurrency: "",
      rate: "",
      effectiveDate: new Date().toISOString().split("T")[0],
      source: "Manual",
      status: "ACTIVE",
    });
    setRateErrors({});
    setIsRateModalOpen(true);
  };

  const handleEditRateClick = (r) => {
    if (!isAdmin) return;
    setCurrentRate(r);
    setRateForm({
      fromCurrency: r.fromCurrency || "",
      toCurrency: r.toCurrency || "",
      rate: r.rate || "",
      effectiveDate: r.effectiveDate || "",
      source: r.source || "Manual",
      status: r.status || "ACTIVE",
    });
    setRateErrors({});
    setIsRateModalOpen(true);
  };

  const handleSaveRate = async (e) => {
    e.preventDefault();
    if (!validateRateForm()) return;

    const payload = {
      fromCurrency: rateForm.fromCurrency,
      toCurrency: rateForm.toCurrency,
      rate: Number(rateForm.rate),
      effectiveDate: rateForm.effectiveDate,
      source: rateForm.source,
      status: rateForm.status,
    };

    try {
      setSubmitting(true);
      if (currentRate) {
        await exchangeRateService.update(currentRate.exchangeRateId, payload);
        showStatusToast("Exchange rate updated successfully!", "success");
      } else {
        await exchangeRateService.create(payload);
        showStatusToast("Exchange rate created successfully!", "success");
        setRateCurrentPage(1);
      }
      setIsRateModalOpen(false);
      fetchExchangeRates();
    } catch (err) {
      console.error("Error saving Exchange Rate:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to save Exchange Rate.";
      showStatusToast(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Deletion Handlers
  const handleDeleteClick = (type, data) => {
    if (!isAdmin) return;
    setDeleteTarget({ type, data });
    setIsConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      setSubmitting(true);
      if (deleteTarget.type === "currency") {
        await currencyService.delete(deleteTarget.data.currencyId);
        showStatusToast("Currency deleted successfully!", "success");
        if (displayedCurrencies.length === 1 && currencyCurrentPage > 1) {
          setCurrencyCurrentPage((prev) => prev - 1);
        } else {
          fetchCurrencies();
        }
      } else {
        await exchangeRateService.delete(deleteTarget.data.exchangeRateId);
        showStatusToast("Exchange rate deleted successfully!", "success");
        if (displayedRates.length === 1 && rateCurrentPage > 1) {
          setRateCurrentPage((prev) => prev - 1);
        } else {
          fetchExchangeRates();
        }
      }
      setIsConfirmOpen(false);
      setDeleteTarget(null);
    } catch (err) {
      console.error("Error during deletion:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Action failed.";
      showStatusToast(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Manual Exchange Rate Refresh
  const handleRefreshExchangeRates = async () => {
    try {
      setRefreshingRates(true);
      await exchangeRateService.refresh();
      showStatusToast("Exchange rates refreshed successfully!", "success");
      fetchExchangeRates();
    } catch (err) {
      console.error("Failed to refresh exchange rates:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to refresh exchange rates.";
      showStatusToast(errMsg, "error");
    } finally {
      setRefreshingRates(false);
    }
  };

  const breadcrumbs = [
    { label: "Expense Management", to: "/expense-management/dashboard" },
    { label: "Masters", to: "/expense-management/masters/expense-categories" },
    { label: "Currency & Exchange Rate" },
  ];

  // Render Skeleton rows for tables
  const renderTableSkeleton = (columnsCount) => {
    return [...Array(5)].map((_, index) => (
      <tr key={index} className="animate-pulse border-b border-gray-100">
        {[...Array(columnsCount)].map((_, cellIndex) => (
          <td key={cellIndex} className="px-6 py-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </td>
        ))}
      </tr>
    ));
  };

  // Currency Table Rows
  const currencyHeaders = isAdmin
    ? ["S.No", "Code", "Name", "Symbol", "Decimal Places", "Status", "Actions"]
    : ["S.No", "Code", "Name", "Symbol", "Decimal Places", "Status"];

  const currencyColumns = isAdmin
    ? ["serial_no", "currencyCode", "currencyName", "symbol", "decimalPlaces", "status", "actions"]
    : ["serial_no", "currencyCode", "currencyName", "symbol", "decimalPlaces", "status"];

  const currencyRows = displayedCurrencies.map((c, index) => {
    const statusVal = c.status || "INACTIVE";
    const rowObj = {
      serial_no: ((currencyCurrentPage - 1) * ITEMS_PER_PAGE + index + 1).toString(),
      currencyCode: (
        <span className="font-semibold text-gray-900">{c.currencyCode || "N/A"}</span>
      ),
      currencyName: c.currencyName || "N/A",
      symbol: (
        <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-800 font-semibold">{c.symbol || "—"}</span>
      ),
      decimalPlaces: c.decimalPlaces !== undefined ? `${c.decimalPlaces}` : "2",
      status: (
        <StatusBadge label={statusVal === "ACTIVE" || statusVal === "active" ? "Active" : "Inactive"} size="sm" />
      ),
    };

    if (isAdmin) {
      rowObj.actions = (
        <div className="flex items-center gap-2 justify-center">
          <Button
            type="button"
            variant="link"
            size="icon"
            title="Edit Currency"
            className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition rounded-md"
            onClick={() => handleEditCurrencyClick(c)}
          >
            <Pencil size={16} />
          </Button>
          <Button
            type="button"
            variant="link"
            size="icon"
            title="Delete Currency"
            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-800 transition rounded-md"
            onClick={() => handleDeleteClick("currency", c)}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      );
    }
    return rowObj;
  });

  // Rates Table Rows
  const ratesHeaders = isAdmin
    ? ["S.No", "From Currency", "To Currency", "Exchange Rate", "Effective Date", "Source", "Status", "Actions"]
    : ["S.No", "From Currency", "To Currency", "Exchange Rate", "Effective Date", "Source", "Status"];

  const ratesColumns = isAdmin
    ? ["serial_no", "fromCurrency", "toCurrency", "rate", "effectiveDate", "source", "status", "actions"]
    : ["serial_no", "fromCurrency", "toCurrency", "rate", "effectiveDate", "source", "status"];

  const ratesRows = displayedRates.map((r, index) => {
    const statusVal = r.status || "ACTIVE";
    
    // Resolve from/to currency objects to show codes and names
    const fromCurrencyObj = allCurrencies.find(
      (c) => c.currencyCode === r.fromCurrencyCode || c.currencyId === r.fromCurrencyId
    );
    const toCurrencyObj = allCurrencies.find(
      (c) => c.currencyCode === r.toCurrencyCode || c.currencyId === r.toCurrencyId
    );

    const fromCurrencyDisplay = fromCurrencyObj
      ? `${fromCurrencyObj.currencyCode} - ${fromCurrencyObj.currencyName}`
      : r.fromCurrencyCode || "N/A";

    const toCurrencyDisplay = toCurrencyObj
      ? `${toCurrencyObj.currencyCode} - ${toCurrencyObj.currencyName}`
      : r.toCurrencyCode || "N/A";

    const rowObj = {
      serial_no: ((rateCurrentPage - 1) * ITEMS_PER_PAGE + index + 1).toString(),
      fromCurrency: (
        <span className="font-semibold text-gray-900">{fromCurrencyDisplay}</span>
      ),
      toCurrency: (
        <span className="font-semibold text-gray-900">{toCurrencyDisplay}</span>
      ),
      rate: (
        <span className="font-mono text-blue-600 font-semibold">{r.rate !== undefined ? r.rate.toFixed(4) : "—"}</span>
      ),
      effectiveDate: r.effectiveDate || "—",
      source: (
        <span className="text-xs text-gray-500 font-medium bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{r.source || "Manual"}</span>
      ),
      status: (
        <StatusBadge label={statusVal === "ACTIVE" || statusVal === "active" ? "Active" : "Inactive"} size="sm" />
      ),
    };

    if (isAdmin) {
      rowObj.actions = (
        <div className="flex items-center gap-2 justify-center">
          <Button
            type="button"
            variant="link"
            size="icon"
            title="Edit Exchange Rate"
            className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition rounded-md"
            onClick={() => handleEditRateClick(r)}
          >
            <Pencil size={16} />
          </Button>
          <Button
            type="button"
            variant="link"
            size="icon"
            title="Delete Exchange Rate"
            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-800 transition rounded-md"
            onClick={() => handleDeleteClick("rate", r)}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      );
    }
    return rowObj;
  });

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumbs} />

      {/* Top Header Card */}
      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-[#0a174e]">Currency & Exchange Rate Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure enterprise currency options and monitor real-time or manual exchange conversions.
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-col gap-2 sm:flex-row sm:w-auto w-full">
            {activeTab === "currencies" ? (
              <Button
                onClick={openCreateCurrencyModal}
                variant="primary"
                size="medium"
                className="w-full sm:w-auto shadow-sm whitespace-nowrap"
              >
                <Plus size={16} />
                Register Currency
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleRefreshExchangeRates}
                  variant="outline"
                  size="medium"
                  disabled={refreshingRates}
                  loading={refreshingRates}
                  loadingText="Refreshing..."
                  className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-50 whitespace-nowrap"
                >
                  <RefreshCw size={14} className={refreshingRates ? "animate-spin" : ""} />
                  Refresh Exchange Rates
                </Button>
                <Button
                  onClick={openCreateRateModal}
                  variant="primary"
                  size="medium"
                  className="w-full sm:w-auto shadow-sm whitespace-nowrap"
                >
                  <Plus size={16} />
                  Add Exchange Rate
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modern Tabs Selector */}
      <div className="border-b border-gray-200 bg-white rounded-xl p-2 shadow-sm flex items-center justify-between">
        <div className="flex space-x-1 p-1 bg-gray-50 rounded-lg">
          <button
            onClick={() => setActiveTab("currencies")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition ${
              activeTab === "currencies"
                ? "bg-white text-blue-600 shadow-sm border-gray-200"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Coins size={16} />
            Supported Currencies
          </button>
          <button
            onClick={() => setActiveTab("exchangeRates")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition ${
              activeTab === "exchangeRates"
                ? "bg-white text-blue-600 shadow-sm border-gray-200"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <TrendingUp size={16} />
            Exchange Rates
          </button>
        </div>

        <button
          onClick={activeTab === "currencies" ? fetchCurrencies : fetchExchangeRates}
          title="Reload current tab data"
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-md transition mr-1"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* KPI Cards Panel */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {activeTab === "currencies" ? (
          <>
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <Coins size={24} />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Currencies</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {isCurrenciesServerPaginated ? totalCurrenciesCount : allCurrencies.length}
                </p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                <StatusBadge label="Active" size="sm" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Currencies</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {allCurrencies.filter((c) => c.status === "ACTIVE" || c.status === "active").length || (isCurrenciesServerPaginated ? "—" : "0")}
                </p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-gray-50 text-gray-600 rounded-lg">
                <StatusBadge label="Inactive" size="sm" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Inactive Currencies</p>
                <p className="text-2xl font-bold text-gray-500 mt-1">
                  {allCurrencies.filter((c) => c.status === "INACTIVE" || c.status === "inactive").length || (isCurrenciesServerPaginated ? "—" : "0")}
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Conversion Records</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {isRatesServerPaginated ? totalRatesCount : allExchangeRates.length}
                </p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <DollarSign size={24} />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Manual Convertors</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {allExchangeRates.filter((r) => r.source === "Manual").length || (isRatesServerPaginated ? "—" : "0")}
                </p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Last Rate Record</p>
                <p className="text-sm font-bold text-purple-700 mt-2 truncate">
                  {allExchangeRates[0]?.effectiveDate || "N/A"}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Search & Filtering Panel */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {activeTab === "currencies" ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
            <div className="w-full sm:max-w-md">
              <SearchInput
                onSearch={(val) => {
                  setCurrencySearch(val || "");
                  setCurrencyCurrentPage(1);
                }}
                placeholder="Search currencies by code, name, symbol..."
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Filter Status:</span>
              <select
                value={currencyStatusFilter}
                onChange={(e) => {
                  setCurrencyStatusFilter(e.target.value);
                  setCurrencyCurrentPage(1);
                }}
                className="rounded-lg border border-gray-300 text-sm py-2 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">From Currency</label>
              <select
                value={rateFromCurrencyFilter}
                onChange={(e) => {
                  setRateFromCurrencyFilter(e.target.value);
                  setRateCurrentPage(1);
                }}
                className="w-full rounded-lg border border-gray-300 text-sm py-2 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Any Currency</option>
                {dropdownCurrencies.map((c) => (
                  <option key={c.currencyId} value={c.currencyCode}>{c.currencyCode} - {c.currencyName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">To Currency</label>
              <select
                value={rateToCurrencyFilter}
                onChange={(e) => {
                  setRateToCurrencyFilter(e.target.value);
                  setRateCurrentPage(1);
                }}
                className="w-full rounded-lg border border-gray-300 text-sm py-2 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Any Currency</option>
                {dropdownCurrencies.map((c) => (
                  <option key={c.currencyId} value={c.currencyCode}>{c.currencyCode} - {c.currencyName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Effective Date</label>
              <input
                type="date"
                value={rateEffectiveDateFilter}
                onChange={(e) => {
                  setRateEffectiveDateFilter(e.target.value);
                  setRateCurrentPage(1);
                }}
                className="w-full rounded-lg border border-gray-300 text-sm py-2 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setRateFromCurrencyFilter("");
                  setRateToCurrencyFilter("");
                  setRateEffectiveDateFilter("");
                  setRateCurrentPage(1);
                }}
                variant="outline"
                className="w-full py-2 px-3"
              >
                Reset Filters
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Table / Data Grid Section */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {activeTab === "currencies" ? (
          currenciesLoading ? (
            <div className="w-full overflow-x-auto rounded-lg">
              <table className="w-full text-left text-sm text-gray-500">
                <thead className="bg-gray-50 text-xs uppercase text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    {currencyHeaders.map((h, i) => <th key={i} className="px-6 py-3">{h}</th>)}
                  </tr>
                </thead>
                <tbody>{renderTableSkeleton(currencyHeaders.length)}</tbody>
              </table>
            </div>
          ) : displayedCurrencies.length === 0 ? (
            <PageCard>
              <PageCardContent className="flex flex-col items-center justify-center text-center py-16">
                <Layers className="h-10 w-10 text-gray-300 mb-3" />
                <h2 className="text-sm font-semibold text-gray-700">No Currencies Found</h2>
                <p className="text-xs text-gray-400 mt-1 max-w-sm">
                  {currencySearch || currencyStatusFilter
                    ? "Adjust filters to find the currencies you are looking for."
                    : "Start by registering a supported corporate currency."}
                </p>
              </PageCardContent>
            </PageCard>
          ) : (
            <>
              <div className="w-full overflow-x-auto rounded-lg">
                <GenericTable
                  headers={currencyHeaders}
                  rows={currencyRows}
                  columns={currencyColumns}
                />
              </div>

              {currencyTotalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <Pagination
                    currentPage={currencyCurrentPage}
                    totalPages={currencyTotalPages}
                    onPrevious={() => setCurrencyCurrentPage((p) => Math.max(p - 1, 1))}
                    onNext={() => setCurrencyCurrentPage((p) => Math.min(p + 1, currencyTotalPages))}
                  />
                </div>
              )}
            </>
          )
        ) : (
          ratesLoading ? (
            <div className="w-full overflow-x-auto rounded-lg">
              <table className="w-full text-left text-sm text-gray-500">
                <thead className="bg-gray-50 text-xs uppercase text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    {ratesHeaders.map((h, i) => <th key={i} className="px-6 py-3">{h}</th>)}
                  </tr>
                </thead>
                <tbody>{renderTableSkeleton(ratesHeaders.length)}</tbody>
              </table>
            </div>
          ) : displayedRates.length === 0 ? (
            <PageCard>
              <PageCardContent className="flex flex-col items-center justify-center text-center py-16">
                <Layers className="h-10 w-10 text-gray-300 mb-3" />
                <h2 className="text-sm font-semibold text-gray-700">No Exchange Rates Found</h2>
                <p className="text-xs text-gray-400 mt-1 max-w-sm">
                  {rateFromCurrencyFilter || rateToCurrencyFilter || rateEffectiveDateFilter
                    ? "Adjust filters to find the exchange rates you are looking for."
                    : "No exchange rates defined. Click Add Exchange Rate or Refresh."}
                </p>
              </PageCardContent>
            </PageCard>
          ) : (
            <>
              <div className="w-full overflow-x-auto rounded-lg">
                <GenericTable
                  headers={ratesHeaders}
                  rows={ratesRows}
                  columns={ratesColumns}
                />
              </div>

              {ratesTotalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <Pagination
                    currentPage={rateCurrentPage}
                    totalPages={ratesTotalPages}
                    onPrevious={() => setRateCurrentPage((p) => Math.max(p - 1, 1))}
                    onNext={() => setRateCurrentPage((p) => Math.min(p + 1, ratesTotalPages))}
                  />
                </div>
              )}
            </>
          )
        )}
      </div>

      {/* Add / Edit Currency Modal */}
      <Modal
        isOpen={isCurrencyModalOpen}
        onClose={() => setIsCurrencyModalOpen(false)}
        title={currentCurrency ? "Edit Currency" : "Register Currency"}
        subtitle={
          currentCurrency
            ? "Modify parameters for this corporate currency."
            : "Define a new currency code, display name, symbol, and formatting."
        }
        size="md"
        closeOnBackdrop={false}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCurrencyModalOpen(false)}
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="currency-form"
              variant="primary"
              loading={submitting}
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              Save Currency
            </Button>
          </div>
        }
      >
        <form id="currency-form" onSubmit={handleSaveCurrency} className="space-y-4 py-2">
          <FormInput
            label="Currency Code"
            name="currencyCode"
            placeholder="e.g. EUR"
            value={currencyForm.currencyCode}
            onChange={handleCurrencyInputChange}
            requiredMark
            disabled={submitting || !!currentCurrency}
            error={currencyErrors.currencyCode}
          />

          <FormInput
            label="Currency Name"
            name="currencyName"
            placeholder="e.g. Euro"
            value={currencyForm.currencyName}
            onChange={handleCurrencyInputChange}
            requiredMark
            disabled={submitting}
            error={currencyErrors.currencyName}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Symbol"
              name="symbol"
              placeholder="e.g. €"
              value={currencyForm.symbol}
              onChange={handleCurrencyInputChange}
              requiredMark
              disabled={submitting}
              error={currencyErrors.symbol}
            />

            <FormInput
              label="Decimal Places"
              name="decimalPlaces"
              type="number"
              min="0"
              max="4"
              value={currencyForm.decimalPlaces}
              onChange={handleCurrencyInputChange}
              requiredMark
              disabled={submitting}
              error={currencyErrors.decimalPlaces}
            />
          </div>

          <FormSelect
            label="Status"
            name="status"
            value={currencyForm.status}
            onChange={(e) => handleCurrencySelectChange("status", e.target.value)}
            options={[
              { label: "Active", value: "ACTIVE" },
              { label: "Inactive", value: "INACTIVE" },
            ]}
            disabled={submitting}
          />
        </form>
      </Modal>

      {/* Add / Edit Exchange Rate Modal */}
      <Modal
        isOpen={isRateModalOpen}
        onClose={() => setIsRateModalOpen(false)}
        title={currentRate ? "Edit Exchange Rate" : "Add Exchange Rate"}
        subtitle="Set up converted currency pair rates with effective limits."
        size="md"
        closeOnBackdrop={false}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRateModalOpen(false)}
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="rate-form"
              variant="primary"
              loading={submitting}
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              Save Rate
            </Button>
          </div>
        }
      >
        <form id="rate-form" onSubmit={handleSaveRate} className="space-y-4 py-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Currency <span className="text-red-500">*</span>
            </label>
            <Select
              options={currencyOptionsForDropdown}
              value={currencyOptionsForDropdown.find((o) => o.value === rateForm.fromCurrency) || null}
              onChange={(opt) => handleRateSelectChange("fromCurrency", opt ? opt.value : "")}
              placeholder="Select conversion source..."
              isSearchable
              styles={selectStyles}
              isDisabled={submitting || !!currentRate}
            />
            {rateErrors.fromCurrency && (
              <span className="text-xs text-red-600 block mt-1">{rateErrors.fromCurrency}</span>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Currency <span className="text-red-500">*</span>
            </label>
            <Select
              options={currencyOptionsForDropdown}
              value={currencyOptionsForDropdown.find((o) => o.value === rateForm.toCurrency) || null}
              onChange={(opt) => handleRateSelectChange("toCurrency", opt ? opt.value : "")}
              placeholder="Select conversion target..."
              isSearchable
              styles={selectStyles}
              isDisabled={submitting || !!currentRate}
            />
            {rateErrors.toCurrency && (
              <span className="text-xs text-red-600 block mt-1">{rateErrors.toCurrency}</span>
            )}
          </div>

          <FormInput
            label="Exchange Rate"
            name="rate"
            type="number"
            step="0.000001"
            placeholder="e.g. 1.0854"
            value={rateForm.rate}
            onChange={handleRateInputChange}
            requiredMark
            disabled={submitting}
            error={rateErrors.rate}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Effective Date"
              name="effectiveDate"
              type="date"
              value={rateForm.effectiveDate}
              onChange={handleRateInputChange}
              requiredMark
              disabled={submitting}
              error={rateErrors.effectiveDate}
            />

            <FormSelect
              label="Source"
              name="source"
              value={rateForm.source}
              onChange={(e) => handleRateSelectChange("source", e.target.value)}
              options={[
                { label: "Manual Input", value: "Manual" },
                { label: "System Generated", value: "System" },
              ]}
              disabled={submitting}
            />
          </div>

          <FormSelect
            label="Status"
            name="status"
            value={rateForm.status}
            onChange={(e) => handleRateSelectChange("status", e.target.value)}
            options={[
              { label: "Active", value: "ACTIVE" },
              { label: "Inactive", value: "INACTIVE" },
            ]}
            disabled={submitting}
          />
        </form>
      </Modal>

      {/* Delete / Deactivate Confirmation Dialog */}
      <ConfirmationModal
        isOpen={isConfirmOpen}
        title={deleteTarget?.type === "currency" ? "Delete Currency" : "Delete Exchange Rate"}
        message={
          deleteTarget?.type === "currency"
            ? `Are you sure you want to delete the currency "${deleteTarget.data?.currencyCode} - ${deleteTarget.data?.currencyName}"? This action cannot be undone.`
            : `Are you sure you want to delete the exchange rate from ${deleteTarget?.data?.fromCurrency} to ${deleteTarget?.data?.toCurrency}? This action cannot be undone.`
        }
        confirmText="Confirm Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setIsConfirmOpen(false);
          setDeleteTarget(null);
        }}
        isLoading={submitting}
        variant="danger"
      />
    </div>
  );
}
