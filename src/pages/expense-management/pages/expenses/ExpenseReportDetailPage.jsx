import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  Plus,
  Pencil,
  Trash2,
  Layers,
  AlertCircle,
  Briefcase,
  Landmark,
  Calendar,
  FileText,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  Image as ImageIcon,
  Eye,
  Download,
  Loader2,
  Sparkles,
  Keyboard,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import { PageCard, PageCardContent } from "@/components/Cards/PageCard";
import GenericTable from "@/components/Table/table";
import Button from "@/components/Button/Button";
import SearchInput from "@/components/filter/Searchbar";
import Modal from "@/components/Modal/modal";
import ConfirmationModal from "@/components/confirmation_modal/ConfirmationModal";
import LoadingSpinner from "@/components/LoadingSpinner";
import FormSelect from "@/components/forms/FormSelect";
import { useAuth } from "@/contexts/AuthContext";
import { showStatusToast } from "@/components/toastfy/toast";
import {
  expenseReportService,
  lineItemService,
  lookupService,
  receiptService,
  splitService,
  REPORT_EDITABLE_STATUSES,
} from "@/pages/expense-management/api/expenseReportsApi";
import TaxBreakdownPanel, {
  emptyTaxValue,
  taxValueFromLine,
  taxValueFromOcr,
  taxRequestFields,
  taxRequestFieldsForConfirm,
  validateTaxValue,
} from "@/pages/expense-management/components/expense-reports/TaxBreakdownPanel";
import TaxStatusBadge from "@/pages/expense-management/components/expense-reports/TaxStatusBadge";
import {
  receiptAmountMismatch,
  scanFoundNothing,
  scanNeedsReview,
} from "@/pages/expense-management/components/expense-reports/receiptScanChecks";
import ReportFormFields, { validateBusinessPurpose } from "@/pages/expense-management/components/expense-reports/ReportFormFields";
import {
  formatDeadlineDate,
  getOverdueSubmitBlockMessage,
  getSubmissionDeadlineInfo,
  validateTripDates,
} from "@/pages/expense-management/components/expense-reports/submissionDeadline";
import SummaryPanel from "@/pages/expense-management/components/expense-reports/SummaryPanel";
import {
  LineItemAllocationDetails,
  LineItemTaxDetails,
} from "@/pages/expense-management/components/expense-reports/LineItemDetailSections";
import {
  SplitAllocationSection,
  crossDepartmentCostCenterLabels,
  useSplitAllocation,
} from "@/pages/expense-management/components/expense-reports/SplitAllocation";
import {
  BillableClientFields,
  projectIdForClient,
  projectOptionsForClient,
  useActiveClients,
} from "@/pages/expense-management/components/expense-reports/BillableClientFields";
import { expenseDateError, expenseDateHint, useExpenseDateRange } from "@/pages/expense-management/components/expense-reports/expenseDateRange";
import { toIsoDate } from "@/pages/expense-management/pages/reports/reportUtils";
import LineItemEntryFlow from "@/pages/expense-management/components/expense-reports/LineItemEntryFlow";
import ReportHistoryTimeline from "@/pages/expense-management/components/expense-reports/ReportHistoryTimeline";
import api from "@/api/axiosInstance";
import Select from "react-select";
import FormInput from "@/components/forms/FormInput";
import FormTextArea from "@/components/forms/FormTextArea";
import FormDatePicker from "@/components/forms/FormDatePicker";
import CurrencyConversionCard from "@/pages/expense-management/components/expense-reports/CurrencyConversionCard";
import ReceiptDropzone from "@/pages/expense-management/components/expense-reports/ReceiptDropzone";
import PolicyStatusBadge, {
  PolicyResultBanner,
  derivePolicyStatus,
  isJustified,
} from "@/pages/expense-management/components/expense-reports/PolicyStatusBadge";
import PolicyJustificationModal from "@/pages/expense-management/components/expense-reports/PolicyJustificationModal";
import ApprovalStatusPill from "@/pages/expense-management/approval-engine/components/ApprovalStatusPill";
import { useApprovalLiveSync } from "@/pages/expense-management/approval-engine/hooks/useApprovalLiveSync";
import {
  useApprovalStatus,
  useLineItemReviews,
  useSubmitReport,
  useRecallReport,
  useCancelReport,
} from "@/pages/expense-management/approval-engine/hooks/useApprovalWorkflow";
import { useFinanceReviews } from "@/pages/expense-management/pages/finance/hooks/useFinanceVerification";
import { useClientPagination } from "@/pages/expense-management/components/common/pagination";
import Pagination from "@/components/Pagination/pagination";
import { XMS_BASE_URL } from "@/pages/expense-management/api/xmsBaseUrl";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
};

const formatAmount = (value) =>
  (Number(value) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const DetailField = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-3">
    <div className="mt-0.5 shrink-0 text-blue-700">{icon}</div>
    <div className="min-w-0 flex-1">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-800 break-words">{value ?? "—"}</p>
    </div>
  </div>
);

const SORT_OPTIONS = [
  { label: "Date (Newest first)", value: "date_desc" },
  { label: "Date (Oldest first)", value: "date_asc" },
  { label: "Amount (High to Low)", value: "amount_desc" },
  { label: "Amount (Low to High)", value: "amount_asc" },
  { label: "Merchant (A-Z)", value: "merchant_asc" },
];

/**
 * The server's already-claimed check on a receipt (upload, receipt list or OCR result):
 * BLOCKING = submission will be refused, WARNING = must be explained before submitting.
 * Returns null when the receipt hasn't been claimed anywhere else.
 */
const duplicateNotice = (payload) => {
  const status = payload?.duplicateStatus;
  if (status !== "BLOCKING" && status !== "WARNING") return null;
  return {
    status,
    message: payload.duplicateMessage || "This receipt matches one that has already been claimed.",
  };
};

const notifyDuplicateReceipt = (payload) => {
  const notice = duplicateNotice(payload);
  if (!notice) return;
  if (notice.status === "BLOCKING") {
    showStatusToast(`Duplicate receipt — ${notice.message}`, "error");
  } else {
    showStatusToast(notice.message, "warning");
  }
};

const DuplicateReceiptBanner = ({ notice, className = "" }) => {
  if (!notice) return null;
  const blocking = notice.status === "BLOCKING";
  return (
    <div
      role="alert"
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
        blocking ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-800"
      } ${className}`}
    >
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      <div>
        <p className="font-semibold">{blocking ? "Duplicate receipt" : "Possible duplicate receipt"}</p>
        <p>{notice.message}</p>
        {blocking && <p className="mt-0.5">This report can't be submitted while it contains this receipt.</p>}
      </div>
    </div>
  );
};

export default function ExpenseReportDetailPage() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  // Manager is read-only on the backend for report/line-item writes
  // (ExpenseReportController/ExpenseLineItemController allow only ADMIN/GENERAL)
  // — don't show write actions (Edit/Delete/Add Line Item/Submit) to Manager.
  const canManage = hasRole(["General"]);
  // Finance and Admin may extend or reopen a draft's submission deadline. The server enforces this as well.

  useApprovalLiveSync();
  const { data: approvalStatus } = useApprovalStatus(reportId);
  const { data: lineItemReviews } = useLineItemReviews(reportId);
  const { data: financeReviews } = useFinanceReviews(reportId);
  const submitReport = useSubmitReport();
  const recallReport = useRecallReport();
  const cancelReport = useCancelReport();
  const [pendingLifecycleAction, setPendingLifecycleAction] = useState(null); // "recall" | "cancel" | null
  const isLifecycleBusy = submitReport.isPending || recallReport.isPending || cancelReport.isPending;
  const [report, setReport] = useState(null);
  // The cash advance this report is linked to, shown at the top so the balance is visible while the report is reviewed.
  const [linkedAdvance, setLinkedAdvance] = useState(null);

  useEffect(() => {
    if (!report?.cashAdvanceId) {
      setLinkedAdvance(null);
      return;
    }
    let cancelled = false;
    cashAdvanceApi
      .getById(report.cashAdvanceId)
      .then((res) => {
        if (!cancelled) setLinkedAdvance(res?.data?.data ?? null);
      })
      .catch(() => {
        if (!cancelled) setLinkedAdvance(null);
      });
    return () => {
      cancelled = true;
    };
  }, [report?.cashAdvanceId]);
  const [lineItems, setLineItems] = useState([]);
  // { [lineItemId]: ExpenseSplitResponse[] } — populated so the compact table can show a "Split"
  // badge; a line item's own list response never embeds split info, so this is fetched separately.
  const [lineItemSplitsMap, setLineItemSplitsMap] = useState({});

  const needsCorrectionLines = (lineItemReviews || []).filter((r) => r.status === "NEEDS_CORRECTION");
  const queriedLines = (financeReviews || []).filter((r) => r.status === "QUERIED" || r.status === "QUERY_RAISED" || r.reason);
  // Who sent the report back and why. An approver's Needs Correction and a Finance query both
  // leave it AWAITING_CORRECTION, and the employee can't read Finance's own review list, so the
  // approval status carries both (correctionRequestedBy / correctionRequests). The review lists
  // above are only a fallback for a backend that doesn't send them yet.
  const correctionFromFinance =
    approvalStatus?.correctionRequestedBy === "FINANCE" ||
    (!approvalStatus?.correctionRequestedBy && (report?.reportStatus === "QUERY_RAISED" || queriedLines.length > 0));
  const correctionRequests = approvalStatus?.correctionRequests?.length
    ? approvalStatus.correctionRequests
    : (correctionFromFinance ? queriedLines : needsCorrectionLines).map((r) => ({
        lineItemId: r.lineItemId,
        comment: r.reason || r.comment,
      }));
  // Mirrors the backend's ReportStatus.isEditable() set exactly (EMS/enums/ReportStatus.java) -
  // report-level Edit/Delete must stay available during AWAITING_CORRECTION (that's the whole
  // point of the correction loop), not just DRAFT. Also gates Add/Edit/Delete Line Item and
  // Submit, since the backend rejects all of those once the report leaves this status set.
  const isReportEditable = REPORT_EDITABLE_STATUSES.includes(report?.reportStatus);
  const deadlineInfo = getSubmissionDeadlineInfo(report);

  // Every policy violation the employee hasn't explained yet. The backend's submission gate needs
  // an explanation for each (WARN or BLOCK); once explained, the approver and Finance decide.
  // Submit/Resubmit opens the justification dialog for these instead of being disabled.
  const unexplainedViolations = useMemo(
    () =>
      lineItems.flatMap((li) =>
        (li.policyWarnings || [])
          .filter((w) => w.violationId && !isJustified(w))
          .map((violation) => ({ lineItem: li, violation }))
      ),
    [lineItems]
  );
  const [justifyDialog, setJustifyDialog] = useState(null); // { mode: "submit" | "save", items } | null
  const [justifySaving, setJustifySaving] = useState(false);
  const [justifyError, setJustifyError] = useState("");

    const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [costCenters, setCostCenters] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [lookupsLoading, setLookupsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");

  const [isLineItemDrawerOpen, setIsLineItemDrawerOpen] = useState(false);
  const [selectedLineItem, setSelectedLineItem] = useState(null);
  const [lineItemToDelete, setLineItemToDelete] = useState(null);
  const [deletingLineItem, setDeletingLineItem] = useState(false);

  // Add Line Item chooser (Manual Entry or AI scan), see LineItemEntryFlow.
  const [isSelectionDialogOpen, setIsSelectionDialogOpen] = useState(false);
  const [projects, setProjects] = useState([]);

  const [lineItemToView, setLineItemToView] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewReceipts, setViewReceipts] = useState([]);
  const [loadingViewReceipts, setLoadingViewReceipts] = useState(false);

  const [viewReceiptPreviewUrl, setViewReceiptPreviewUrl] = useState("");
  const [viewReceiptFile, setViewReceiptFile] = useState(null);
  const [viewZoom, setViewZoom] = useState(1);
  const [viewRotation, setViewRotation] = useState(0);

  useEffect(() => {
    if (!isViewModalOpen) {
      setViewZoom(1);
      setViewRotation(0);
      setViewReceiptPreviewUrl("");
      setViewReceiptFile(null);
    }
  }, [isViewModalOpen]);

  const [isEditReportOpen, setIsEditReportOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ title: "", businessPurpose: "", costCenterId: "", currencyId: "", tripStartDate: "", tripEndDate: "" });
  const [editFormErrors, setEditFormErrors] = useState({});
  const [savingReport, setSavingReport] = useState(false);
  const [isDeleteReportOpen, setIsDeleteReportOpen] = useState(false);
  const [deletingReport, setDeletingReport] = useState(false);

  const fetchReport = useCallback(async () => {
    try {
      const res = await expenseReportService.getById(reportId);
      setReport(res.data?.data);
    } catch (err) {
      console.error("Failed to fetch expense report:", err);
      setLoadError(true);
    }
  }, [reportId]);

  const fetchLineItems = useCallback(async () => {
    try {
      const res = await lineItemService.getAll(reportId);
      const payload = res.data?.data;
      const list = Array.isArray(payload) ? payload : payload?.lineItems || payload?.content || payload?.data || [];
      setLineItems(list);
    } catch (err) {
      console.error("Failed to fetch line items:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to fetch line items.";
      showStatusToast(errMsg, "error");
    }
  }, [reportId]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    await Promise.all([fetchReport(), fetchLineItems()]);
    setLoading(false);
  }, [fetchReport, fetchLineItems]);

  // Refreshed alongside the line-item list itself (add/delete/edit, including a split-only edit)
  // so the table's "Split" badge never goes stale. One GET per line item — same per-row pattern
  // already used elsewhere in this module (e.g. Finance's queue table).
  useEffect(() => {
    const ids = lineItems.map((li) => li.lineItemId).filter(Boolean);
    if (ids.length === 0) {
      setLineItemSplitsMap({});
      return;
    }
    let cancelled = false;
    (async () => {
      const results = await Promise.allSettled(ids.map((id) => splitService.getAll(id)));
      if (cancelled) return;
      const map = {};
      results.forEach((res, i) => {
        if (res.status === "fulfilled") {
          const payload = res.value.data?.data;
          map[ids[i]] = Array.isArray(payload) ? payload : Array.isArray(res.value.data) ? res.value.data : [];
        }
      });
      setLineItemSplitsMap(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [lineItems]);

  const fetchLookups = useCallback(async () => {
    try {
      setLookupsLoading(true);
      // Epic 8: the caller's own PMS-assigned ACTIVE projects — not the admin-wide project
      // master list (an employee can only select a project they're actually assigned to).
      const [costCenterList, currencyList, categoryList, projectList] = await Promise.all([
        lookupService.getActiveCostCenters(),
        lookupService.getActiveCurrencies(),
        lookupService.getActiveCategories(),
        // Errors are surfaced (not silently swallowed to []) — an empty project list should
        // only ever mean "PMS genuinely has no assigned work," never "the request failed."
        lookupService.getAssignedProjects().catch((err) => {
          console.error("Failed to load assigned projects:", err);
          showStatusToast(
            err.response?.data?.message || "Could not load your assigned projects.",
            "error"
          );
          return [];
        }),
      ]);
      setCostCenters(costCenterList);
      setCurrencies(currencyList);
      setCategories(categoryList);
      setProjects(Array.isArray(projectList) ? projectList : []);
    } catch (err) {
      console.error("Failed to load lookups:", err);
    } finally {
      setLookupsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    fetchLookups();
  }, [fetchAll, fetchLookups]);

  const costCenterOptions = useMemo(
    () => costCenters.map((c) => ({ value: c.costCenterId, label: `${c.costCenterCode} - ${c.costCenterName}`, departmentUuid: c.departmentUuid })),
    [costCenters]
  );
  const currencyOptions = useMemo(
    () => currencies.map((c) => ({ value: c.currencyId, label: `${c.currencyCode} - ${c.currencyName}`, code: c.currencyCode })),
    [currencies]
  );
  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.categoryId, label: `${c.categoryCode} - ${c.categoryName}` })),
    [categories]
  );

  const filteredLineItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    let list = !q
      ? lineItems
      : lineItems.filter((li) => {
        const merchant = (li.merchantName || "").toLowerCase();
        const category = (li.categoryName || "").toLowerCase();
        const desc = (li.description || "").toLowerCase();
        return merchant.includes(q) || category.includes(q) || desc.includes(q);
      });

    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case "date_asc":
          return new Date(a.expenseDate || 0) - new Date(b.expenseDate || 0);
        case "amount_desc":
          return (Number(b.amount) || 0) - (Number(a.amount) || 0);
        case "amount_asc":
          return (Number(a.amount) || 0) - (Number(b.amount) || 0);
        case "merchant_asc":
          return (a.merchantName || "").localeCompare(b.merchantName || "");
        case "date_desc":
        default:
          return new Date(b.expenseDate || 0) - new Date(a.expenseDate || 0);
      }
    });

    return list;
  }, [lineItems, searchTerm, sortBy]);

  const openAddLineItem = () => {
    setIsSelectionDialogOpen(true);
  };

  const openManualLineItem = () => {
    setSelectedLineItem(null);
    setIsLineItemDrawerOpen(true);
  };
  const openEditLineItem = (li) => {
    setSelectedLineItem(li);
    setIsLineItemDrawerOpen(true);
  };

  const openViewLineItem = async (li) => {
    setLineItemToView(li);
    setIsViewModalOpen(true);
    setViewReceipts([]);
    setViewReceiptPreviewUrl("");
    setViewReceiptFile(null);
    setViewZoom(1);
    setViewRotation(0);

    if (li.lineItemId) {
      try {
        setLoadingViewReceipts(true);
        const res = await receiptService.getAll(li.lineItemId);
        const list = Array.isArray(res.data) ? res.data : res.data?.receipts || res.data?.content || res.data?.data || [];
        setViewReceipts(list);

        if (list.length > 0) {
          const firstReceipt = list[0];
          setViewReceiptFile(firstReceipt);
          const urlRes = await receiptService.getViewUrl(firstReceipt.receiptId);
          const url = extractUrl(urlRes.data?.data || urlRes.data);
          if (url) {
            setViewReceiptPreviewUrl(url);
          }
        }
      } catch (err) {
        console.error("Failed to fetch receipts for view:", err);
      } finally {
        setLoadingViewReceipts(false);
      }
    }
  };

  const handleSelectActiveViewReceipt = async (receipt) => {
    try {
      setViewReceiptFile(receipt);
      setViewReceiptPreviewUrl("");
      const urlRes = await receiptService.getViewUrl(receipt.receiptId);
      const url = extractUrl(urlRes.data?.data || urlRes.data);
      if (url) {
        setViewReceiptPreviewUrl(url);
      }
    } catch (err) {
      console.error("Failed to change active receipt view:", err);
    }
  };

  const handleViewReceiptForReadonly = async (receipt) => {
    try {
      if (receipt.receiptId) {
        const res = await receiptService.getViewUrl(receipt.receiptId);
        const url = extractUrl(res.data?.data || res.data);
        if (url) window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      showStatusToast("Failed to open receipt preview.", "error");
    }
  };

  const handleDownloadReceiptForReadonly = async (receipt) => {
    try {
      if (receipt.receiptId) {
        const res = await receiptService.getDownloadUrl(receipt.receiptId);
        const url = extractUrl(res.data?.data || res.data);
        if (url) {
          const link = document.createElement("a");
          link.href = url;
          link.download = receipt.fileName || "receipt";
          link.rel = "noopener noreferrer";
          document.body.appendChild(link);
          link.click();
          link.remove();
        }
      }
    } catch (err) {
      showStatusToast("Failed to download receipt.", "error");
    }
  };

  const handleLineItemSaved = () => {
    fetchLineItems();
    fetchReport();
  };

  const handleDeleteLineItemConfirm = async () => {
    if (!lineItemToDelete) return;
    try {
      setDeletingLineItem(true);
      await lineItemService.delete(reportId, lineItemToDelete.lineItemId);
      showStatusToast("Line item deleted successfully!", "success");
      setLineItemToDelete(null);
      fetchLineItems();
      fetchReport();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to delete line item.";
      showStatusToast(errMsg, "error");
    } finally {
      setDeletingLineItem(false);
    }
  };

  const openEditReport = () => {
    if (!report) return;
    setEditFormData({
      title: report.title || "",
      businessPurpose: report.businessPurpose || "",
      costCenterId: report.costCenterId || "",
      currencyId: report.currencyId || "",
      tripStartDate: (report.tripStartDate || "").slice(0, 10),
      tripEndDate: (report.tripEndDate || "").slice(0, 10),
    });
    setEditFormErrors({});
    setIsEditReportOpen(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
    if (editFormErrors[name]) setEditFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleEditSelectChange = (name, value) => {
    setEditFormData((prev) => ({ ...prev, [name]: value }));
    if (editFormErrors[name]) setEditFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateEditForm = () => {
    const errors = {};
    if (!editFormData.title.trim()) errors.title = "Report title is required.";
    if (!editFormData.costCenterId) errors.costCenterId = "Cost center is required.";
    if (!editFormData.currencyId) errors.currencyId = "Report currency is required.";
    const businessPurposeError = validateBusinessPurpose(editFormData.businessPurpose);
    if (businessPurposeError) errors.businessPurpose = businessPurposeError;
    const tripDateError = validateTripDates(editFormData.tripStartDate, editFormData.tripEndDate);
    if (tripDateError) errors[editFormData.tripStartDate ? "tripEndDate" : "tripStartDate"] = tripDateError;
    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditReportSubmit = async (e) => {
    e.preventDefault();
    if (!validateEditForm()) return;

    const payload = {
      title: editFormData.title.trim(),
      businessPurpose: editFormData.businessPurpose ? editFormData.businessPurpose.trim() : "",
      costCenterId: editFormData.costCenterId,
      currencyId: editFormData.currencyId,
      tripStartDate: editFormData.tripStartDate,
      tripEndDate: editFormData.tripEndDate,
    };

    try {
      setSavingReport(true);
      await expenseReportService.update(reportId, payload);
      showStatusToast("Expense report updated successfully!", "success");
      setIsEditReportOpen(false);
      fetchReport();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to update expense report.";
      showStatusToast(errMsg, "error");
    } finally {
      setSavingReport(false);
    }
  };

  const handleDeleteReportConfirm = async () => {
    try {
      setDeletingReport(true);
      await expenseReportService.delete(reportId);
      showStatusToast("Expense report deleted successfully!", "success");
      navigate("/expense-management/expenses/my");
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to delete expense report.";
      showStatusToast(errMsg, "error");
      setIsDeleteReportOpen(false);
    } finally {
      setDeletingReport(false);
    }
  };

  const submitNow = () => {
    // UI guard only: the backend enforces the same deadline on the submit call.
    const blockMessage = getOverdueSubmitBlockMessage(deadlineInfo);
    if (blockMessage) {
      showStatusToast(blockMessage, "error", 4000);
      return;
    }
    submitReport.mutate(reportId, {
      onSuccess: () => {
        showStatusToast(["AWAITING_CORRECTION", "QUERY_RAISED"].includes(report.reportStatus) ? "Report resubmitted" : "Report submitted for approval", "success");
        fetchReport();
        fetchLineItems();
      },
      onError: (err) => showStatusToast(err.response?.data?.message || "Failed to submit report", "error"),
    });
  };

  const openJustifyDialog = (mode) => {
    setJustifyError("");
    setJustifyDialog({ mode, items: unexplainedViolations });
  };

  // Unexplained policy violations are explained first, then the report is submitted.
  const handleSubmitOrResubmit = () => {
    if (unexplainedViolations.length > 0) {
      openJustifyDialog("submit");
      return;
    }
    submitNow();
  };

  const handleJustifyConfirm = async (entries) => {
    setJustifySaving(true);
    setJustifyError("");
    try {
      for (const entry of entries) {
        await lineItemService.justifyPolicyWarning(reportId, entry.lineItemId, entry.violationId, entry.justification);
      }
    } catch (err) {
      setJustifyError(err.response?.data?.message || err.response?.data?.detail || "Couldn't save your explanation. Try again.");
      setJustifySaving(false);
      fetchLineItems();
      return;
    }
    await fetchLineItems();
    setJustifySaving(false);
    const mode = justifyDialog?.mode;
    setJustifyDialog(null);
    if (mode === "submit") {
      submitNow();
    } else {
      showStatusToast("Explanations saved", "success");
    }
  };

  const handleLifecycleConfirm = () => {
    const mutation = pendingLifecycleAction === "recall" ? recallReport : cancelReport;
    mutation.mutate(reportId, {
      onSuccess: () => {
        showStatusToast(pendingLifecycleAction === "recall" ? "Report recalled to Draft" : "Report cancelled", "success");
        setPendingLifecycleAction(null);
        fetchReport();
      },
      onError: (err) => {
        showStatusToast(err.response?.data?.message || "Action failed", "error");
        setPendingLifecycleAction(null);
      },
    });
  };

  const breadcrumbs = [
    { label: "Expense Management", to: "/expense-management/dashboard" },
    { label: "Expenses", to: "/expense-management/expenses/my" },
    { label: "My Expenses", to: "/expense-management/expenses/my" },
    { label: report?.title || "Report Details" },
  ];

  // The Actions column always renders (it holds "View", which every role that can reach
  // this page is allowed to use) — only the Edit/Delete buttons inside it are role/status-gated.
  const headers = ["Category", "Merchant", "Date", "Amount", "Policy", "GST", "Net Amount", "Base Amount", "Cost Center", "Billable", "Actions"];
  const columns = ["category", "merchant", "date", "amount", "policy", "gst", "net", "base", "costCenter", "billable", "actions"];

  const { pageItems: pagedLineItems, paginationProps: lineItemPager } = useClientPagination(filteredLineItems);
  const tableRows = pagedLineItems.map((li) => {
    const showCurrency = li.currencyCode && (li.currencyCode === "EUR" || li.currencyCode !== li.baseCurrencyCode);
    const rowObj = {
      category: <span className="font-medium text-gray-800">{li.categoryName || "—"}</span>,
      merchant: (
        <div className="text-left">
          <p className="font-medium text-gray-900">{li.merchantName || "—"}</p>
          {li.description && <p className="text-xs text-gray-400 truncate max-w-[180px]">{li.description}</p>}
        </div>
      ),
      date: formatDate(li.expenseDate),
      amount: (
        <span className="font-mono font-semibold text-gray-900">
          {formatAmount(li.amount)} <span className="text-xs text-gray-400">{li.currencyCode}</span>
        </span>
      ),
      policy: <PolicyStatusBadge lineStatus={li.lineStatus} policyWarnings={li.policyWarnings} />,
      gst: (
        <span className="inline-flex flex-col items-start gap-0.5">
          <span className="font-mono text-amber-600">
            {formatAmount(li.taxAmount)} {showCurrency && <span className="text-xs text-gray-400">{li.currencyCode}</span>}
          </span>
          {li.tax?.taxCode && <span className="text-[11px] text-gray-400">{li.tax.taxCode}</span>}
          <TaxStatusBadge tax={li.tax} />
        </span>
      ),
      net: (
        <span className="font-mono font-semibold text-emerald-700">
          {formatAmount(li.netAmount)} {showCurrency && <span className="text-xs text-gray-400">{li.currencyCode}</span>}
        </span>
      ),
      base: (
        <span className="font-mono text-[#0A0082] font-semibold">
          {formatAmount(li.baseAmount)} <span className="text-xs text-gray-400">{li.baseCurrencyCode}</span>
        </span>
      ),
      costCenter: (() => {
        const splits = lineItemSplitsMap[li.lineItemId] || [];
        if (splits.length === 0) {
          return <span className="text-xs text-gray-700">{li.costCenterName || "—"}</span>;
        }
        const breakdown = splits
          .map((s) =>
            s.splitType === "PERCENTAGE"
              ? `${s.costCenterName}: ${Number(s.percentage).toFixed(0)}%`
              : `${s.costCenterName}: ${formatAmount(s.allocatedAmount)}`
          )
          .join(", ");
        return (
          <span
            title={breakdown}
            className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 cursor-help"
          >
            <Layers size={10} /> Split ({splits.length})
          </span>
        );
      })(),
      billable: li.clientBillable ? (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Yes</span>
      ) : (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-50 text-gray-500 border border-gray-200">No</span>
      ),
    };

    rowObj.actions = (
      <div className="flex items-center gap-1 justify-center">
        <Button
          type="button"
          variant="link"
          size="icon"
          title="View Line Item"
          className="h-8 w-8 p-0 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 transition rounded-md"
          onClick={() => openViewLineItem(li)}
        >
          <Eye size={16} />
        </Button>
        {canManage && isReportEditable && (
          <Button
            type="button"
            variant="link"
            size="icon"
            title="Edit Line Item"
            className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition rounded-md"
            onClick={() => openEditLineItem(li)}
          >
            <Pencil size={16} />
          </Button>
        )}
        {canManage && isReportEditable && (
          <Button
            type="button"
            variant="link"
            size="icon"
            title="Delete Line Item"
            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-800 transition rounded-md"
            onClick={() => setLineItemToDelete(li)}
          >
            <Trash2 size={16} />
          </Button>
        )}
      </div>
    );

    return rowObj;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Breadcrumb items={breadcrumbs} />
        <div className="py-24">
          <LoadingSpinner text="Loading expense report..." />
        </div>
      </div>
    );
  }

  if (loadError || !report) {
    return (
      <div className="space-y-4">
        <Breadcrumb items={breadcrumbs} />
        <PageCard>
          <PageCardContent className="flex flex-col items-center justify-center text-center py-16">
            <AlertCircle className="h-10 w-10 text-red-300 mb-3" />
            <h2 className="text-sm font-semibold text-gray-700">Failed to load this expense report</h2>
            <Button variant="outline" size="small" className="mt-4" onClick={fetchAll}>
              Retry
            </Button>
          </PageCardContent>
        </PageCard>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/expense-management/expenses/my"))}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
        >
          &larr; Back
        </button>
        <Breadcrumb items={breadcrumbs} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Report Information */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            {linkedAdvance && (
              <div className="mb-3 flex justify-end">
                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    Cash advance · {linkedAdvance.title || "Cash advance"}
                  </p>
                  <p className="text-2xl font-bold text-[#0a174e]">
                    {linkedAdvance.currencyCode || ""} {formatAmount(linkedAdvance.amount)}
                  </p>
                  <p className="text-xs text-gray-600">
                    Balance {linkedAdvance.currencyCode || ""} {formatAmount(linkedAdvance.outstandingBalance)} ·{" "}
                    {report.reportStatus !== "APPROVED"
                      ? "reconciles automatically on approval"
                      : Number(report.reimbursableAmount) > 0
                        ? `payable to employee after the advance: ${report.currencyCode || ""} ${formatAmount(report.reimbursableAmount)}`
                        : "fully covered by the advance"}
                  </p>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-[#0a174e]">{report.title}</h1>
                  <ApprovalStatusPill
                    status={report.reportStatus || "DRAFT"}
                    label={
                      report.reportStatus === "PENDING_APPROVAL" && approvalStatus?.currentLevelDisplayName
                        ? `Pending ${approvalStatus.currentLevelDisplayName}`
                        : undefined
                    }
                    correctionRequestedBy={approvalStatus?.correctionRequestedBy}
                  />
                </div>
                <p className="text-xs text-gray-400 font-mono mt-1">{report.reportNumber}</p>
                {deadlineInfo && (
                  <p className={`mt-1.5 text-xs font-medium ${deadlineInfo.isOverdue ? "text-red-700" : "text-gray-600"}`}>
                    {deadlineInfo.isOverdue
                      ? `Overdue: submission was due ${formatDeadlineDate(deadlineInfo.deadline)}`
                      : `Submit by ${formatDeadlineDate(deadlineInfo.deadline)} (${deadlineInfo.daysRemaining} day${deadlineInfo.daysRemaining === 1 ? "" : "s"} left)`}
                  </p>
                )}
              </div>

              {canManage && (
                <div className="flex gap-2 shrink-0 flex-wrap">
                  {report.reportStatus === "DRAFT" && (
                    <Button
                      variant="primary"
                      size="small"
                      loading={submitReport.isPending}
                      loadingText="Submitting..."
                      onClick={handleSubmitOrResubmit}
                      disabled={report.reportStatus !== "DRAFT" || lineItems.length === 0 || isLifecycleBusy}
                      className={lineItems.length === 0 ? "!pointer-events-auto cursor-not-allowed" : ""}
                    >
                      Submit for Approval
                    </Button>
                  )}
                  {report.reportStatus === "AWAITING_CORRECTION" && (
                    <Button
                      variant="primary"
                      size="small"
                      loading={submitReport.isPending}
                      loadingText="Resubmitting..."
                      onClick={handleSubmitOrResubmit}
                      disabled={isLifecycleBusy}
                    >
                      Resubmit
                    </Button>
                  )}
                  {report.reportStatus === "QUERY_RAISED" && (
                    <Button
                      variant="primary"
                      size="small"
                      loading={submitReport.isPending}
                      loadingText="Resubmitting..."
                      onClick={handleSubmitOrResubmit}
                      disabled={isLifecycleBusy}
                    >
                      Resubmit
                    </Button>
                  )}
                  {approvalStatus?.canRecall && (
                    <Button variant="outline" size="small" disabled={isLifecycleBusy} onClick={() => setPendingLifecycleAction("recall")}>
                      Recall to Draft
                    </Button>
                  )}
                  {report.reportStatus !== "DRAFT" && approvalStatus?.canCancel && (
                    <Button variant="outline" size="small" disabled={isLifecycleBusy} onClick={() => setPendingLifecycleAction("cancel")}>
                      Cancel
                    </Button>
                  )}
                  {isReportEditable && (
                    <Button variant="outline" size="small" onClick={openEditReport}>
                      <Pencil size={14} />
                      Edit
                    </Button>
                  )}
                  {report.reportStatus === "DRAFT" && (
                    <Button variant="danger" size="small" onClick={() => setIsDeleteReportOpen(true)}>
                      <Trash2 size={14} />
                      Delete
                    </Button>
                  )}
                </div>
              )}
            </div>

            {["AWAITING_CORRECTION", "QUERY_RAISED"].includes(report.reportStatus) && correctionRequests.length > 0 && (
              <div className="mt-4 rounded-lg bg-orange-50 border border-orange-200 px-4 py-3">
                <p className="text-sm font-semibold text-orange-800">
                  {correctionFromFinance ? "Finance requested a correction on " : "Your approver requested a correction on "}
                  {correctionRequests.length} line item{correctionRequests.length > 1 ? "s" : ""}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {correctionRequests.map((r) => (
                    <li key={r.lineItemId} className="text-sm text-orange-700">
                      <span className="font-medium">{lineItems.find((li) => li.lineItemId === r.lineItemId)?.merchantName || "Line item"}:</span>{" "}
                      {r.category && r.category !== "OTHER" && (
                        <span className="mr-1 inline-flex rounded border border-orange-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-800">
                          {{ TAX_MISMATCH: "Tax mismatch", RECEIPT: "Receipt", AMOUNT: "Amount" }[r.category] || r.category}
                        </span>
                      )}
                      {r.comment || "Correction requested"}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-orange-600">
                  Fix the flagged line{correctionRequests.length > 1 ? "s" : ""} below, then click Resubmit above
                  {correctionFromFinance ? "; it goes straight back to Finance unless the change needs re-approval." : "."}
                </p>
              </div>
            )}

            {canManage && isReportEditable && unexplainedViolations.length > 0 && (
              <div className="mt-4 flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    {unexplainedViolations.length} policy violation{unexplainedViolations.length > 1 ? "s need" : " needs"} your explanation
                  </p>
                  <p className="mt-0.5 text-xs text-amber-700">
                    Some expenses go over policy. Explain why before you submit; your approver and Finance will see your explanation and
                    decide whether to accept them.
                  </p>
                </div>
                <Button variant="outline" size="small" className="shrink-0" onClick={() => openJustifyDialog("save")}>
                  Explain now
                </Button>
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailField icon={<FileText size={16} />} label="Business Purpose" value={report.businessPurpose || "—"} />
              <DetailField icon={<Briefcase size={16} />} label="Cost Center" value={report.costCenterName || "—"} />
              <DetailField icon={<Landmark size={16} />} label="Report Currency" value={report.currencyCode || "—"} />
              <DetailField icon={<Calendar size={16} />} label="Created" value={formatDate(report.createdAt)} />
            </div>
          </div>

          {/* Line Items */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-50 text-[#0A0082]">
                  <Receipt size={16} />
                </div>
                <h2 className="text-base font-bold text-gray-900">Line Items</h2>
              </div>
              {canManage && isReportEditable && (
                <Button variant="primary" size="small" onClick={openAddLineItem} className="shadow-sm">
                  <Plus size={14} />
                  Add Line Item
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-4">
              <div className="sm:col-span-2">
                <SearchInput value={searchTerm} onSearch={setSearchTerm} placeholder="Search by merchant, category, description..." />
              </div>
              <FormSelect name="sortBy" value={sortBy} onChange={(e) => setSortBy(e.target.value)} options={SORT_OPTIONS} />
            </div>

            {filteredLineItems.length === 0 ? (
              <PageCard>
                <PageCardContent className="flex flex-col items-center justify-center text-center py-16">
                  <Layers className="h-10 w-10 text-gray-300 mb-3" />
                  <h2 className="text-sm font-semibold text-gray-700">No Line Items Yet</h2>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm">
                    {searchTerm
                      ? "No line items match your search."
                      : "Add your first expense line item — currency conversion and GST are calculated automatically."}
                  </p>
                </PageCardContent>
              </PageCard>
            ) : (
              <div className="w-full overflow-x-auto rounded-lg">
                <GenericTable headers={headers} rows={tableRows} columns={columns} />
                <div className="mt-4 flex justify-center">
                  <Pagination {...lineItemPager} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-1">
          <SummaryPanel report={{ ...report, status: report?.reportStatus }} lineItems={lineItems} />
          <ReportHistoryTimeline reportId={reportId} />
        </div>
      </div>

      <LineItemDrawer
        isOpen={isLineItemDrawerOpen}
        onClose={() => setIsLineItemDrawerOpen(false)}
        reportId={reportId}
        lineItem={selectedLineItem}
        defaultCostCenterId={report.costCenterId}
        categoryOptions={categoryOptions}
        costCenterOptions={costCenterOptions}
        currencyOptions={currencyOptions}
        onSaved={handleLineItemSaved}
      />

      <LineItemEntryFlow
        isOpen={isSelectionDialogOpen}
        onClose={() => setIsSelectionDialogOpen(false)}
        onManual={openManualLineItem}
        onSaved={handleLineItemSaved}
        reportId={reportId}
        report={report}
        categories={categories}
        currencies={currencies}
        categoryOptions={categoryOptions}
        costCenterOptions={costCenterOptions}
        currencyOptions={currencyOptions}
        projects={projects}
      />

      <ConfirmationModal
        isOpen={!!lineItemToDelete}
        title="Delete Line Item"
        message={`Are you sure you want to delete the line item "${lineItemToDelete?.merchantName}"? This action cannot be undone.`}
        confirmText="Delete Line Item"
        cancelText="Cancel"
        onConfirm={handleDeleteLineItemConfirm}
        onCancel={() => setLineItemToDelete(null)}
        isLoading={deletingLineItem}
        variant="danger"
      />

      <ConfirmationModal
        isOpen={!!pendingLifecycleAction}
        title={pendingLifecycleAction === "recall" ? "Recall to Draft" : "Cancel Expense Report"}
        message={
          pendingLifecycleAction === "recall"
            ? "This will withdraw the report from approval and return it to Draft so you can edit it. You'll need to resubmit it afterwards."
            : "This will permanently cancel this expense report. This action cannot be undone."
        }
        confirmText={pendingLifecycleAction === "recall" ? "Recall to Draft" : "Cancel Report"}
        cancelText="Back"
        onConfirm={handleLifecycleConfirm}
        onCancel={() => setPendingLifecycleAction(null)}
        isLoading={isLifecycleBusy}
        variant={pendingLifecycleAction === "recall" ? "primary" : "danger"}
      />

      <PolicyJustificationModal
        isOpen={!!justifyDialog}
        items={justifyDialog?.items || []}
        mode={justifyDialog?.mode}
        isSaving={justifySaving || submitReport.isPending}
        error={justifyError}
        onConfirm={handleJustifyConfirm}
        onCancel={() => setJustifyDialog(null)}
      />

      {isEditReportOpen && createPortal(
        <>
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] animate-in fade-in duration-200"
            onClick={() => setIsEditReportOpen(false)}
          />
          {/* Drawer Panel */}
          <div 
            className="fixed inset-y-0 right-0 z-[10000] w-full max-w-lg bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-900">Edit Expense Report</h2>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Modify this expense report's properties.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditReportOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Form Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <form id="detail-report-edit-form" onSubmit={handleEditReportSubmit} className="py-2">
                <ReportFormFields
                  formData={editFormData}
                  formErrors={editFormErrors}
                  onInputChange={handleEditInputChange}
                  onSelectChange={handleEditSelectChange}
                  costCenterOptions={costCenterOptions}
                  currencyOptions={currencyOptions}
                  disabled={savingReport}
                  lookupsLoading={lookupsLoading}
                />
              </form>
            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
              <Button type="button" variant="outline" onClick={() => setIsEditReportOpen(false)} disabled={savingReport} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" form="detail-report-edit-form" variant="primary" loading={savingReport} loadingText="Saving..." className="w-full sm:w-auto">
                Save Changes
              </Button>
            </div>
          </div>
        </>,
        document.body
      )}

      <ConfirmationModal
        isOpen={isDeleteReportOpen}
        title="Delete Expense Report"
        message={`Are you sure you want to delete "${report.title}"? This will remove all its line items and receipts. This action cannot be undone.`}
        confirmText="Delete Report"
        cancelText="Cancel"
        onConfirm={handleDeleteReportConfirm}
        onCancel={() => setIsDeleteReportOpen(false)}
        isLoading={deletingReport}
        variant="danger"
      />

      {isViewModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-[#f8fafc] flex flex-col h-screen w-screen overflow-hidden animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 shadow-sm shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700 shadow-sm">
                <Eye size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">View Line Item</h2>
                <p className="text-xs text-gray-500 font-medium">Detailed read-only information for this expense line item.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsViewModalOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body - 50% / 50% split */}
          <div className="flex-1 flex min-h-0">
            {/* Left Column (50%): Receipt Preview */}
            <div className="w-1/2 bg-[#0b0f19] flex items-center justify-center border-r border-gray-100 min-w-0 h-full overflow-hidden relative group">
              {loadingViewReceipts ? (
                <div className="flex flex-col items-center gap-2 text-sm text-gray-400">
                  <Loader2 size={24} className="animate-spin text-indigo-500" />
                  <span>Loading receipt preview...</span>
                </div>
              ) : viewReceiptPreviewUrl ? (
                viewReceiptFile?.fileName?.toLowerCase().endsWith(".pdf") ? (
                  <iframe
                    src={viewReceiptPreviewUrl}
                    className="w-full h-full border-0"
                    title="Receipt PDF Preview"
                  />
                ) : (
                  <>
                    <img
                      src={viewReceiptPreviewUrl}
                      style={{
                        transform: `scale(${viewZoom}) rotate(${viewRotation}deg)`,
                        transition: "transform 0.2s ease-in-out",
                      }}
                      className="w-full h-full object-contain"
                      alt="Receipt Image Preview"
                    />
                    <div className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-slate-700/50 shadow-lg text-white z-10 select-none">
                      <button
                        type="button"
                        onClick={() => setViewZoom((prev) => Math.max(prev - 0.2, 0.5))}
                        className="p-1 hover:bg-slate-800 rounded-full transition text-slate-300 hover:text-white"
                        title="Zoom Out (-)"
                      >
                        <ZoomOut size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewZoom((prev) => Math.min(prev + 0.2, 3))}
                        className="p-1 hover:bg-slate-800 rounded-full transition text-slate-300 hover:text-white"
                        title="Zoom In (+)"
                      >
                        <ZoomIn size={15} />
                      </button>
                      <div className="w-[1px] h-3 bg-slate-700/50 mx-0.5" />
                      <button
                        type="button"
                        onClick={() => setViewRotation((prev) => prev - 90)}
                        className="p-1 hover:bg-slate-800 rounded-full transition text-slate-300 hover:text-white"
                        title="Rotate Left (↺)"
                      >
                        <RotateCcw size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewRotation((prev) => prev + 90)}
                        className="p-1 hover:bg-slate-800 rounded-full transition text-slate-300 hover:text-white"
                        title="Rotate Right (↻)"
                      >
                        <RotateCw size={15} />
                      </button>
                      <div className="w-[1px] h-3 bg-slate-700/50 mx-0.5" />
                      <button
                        type="button"
                        onClick={() => {
                          setViewZoom(1);
                          setViewRotation(0);
                        }}
                        className="px-2 py-0.5 text-[10px] font-bold hover:bg-slate-800 rounded-md transition text-slate-300 hover:text-white"
                        title="Reset"
                      >
                        Reset
                      </button>
                    </div>
                  </>
                )
              ) : (
                <div className="text-sm text-gray-400">No receipt preview available</div>
              )}
            </div>

            {/* Right Column (50%): Form/Details */}
            <div className="w-1/2 bg-white flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {lineItemToView && (
                  <>
                    <PolicyResultBanner lineStatus={lineItemToView.lineStatus} policyWarnings={lineItemToView.policyWarnings} />
                    <div className="grid grid-cols-2 gap-3">
                      <DetailField icon={<Layers size={15} />} label="Category" value={lineItemToView.categoryName || "—"} />
                      <DetailField icon={<Calendar size={15} />} label="Expense Date" value={formatDate(lineItemToView.expenseDate)} />
                      <DetailField icon={<Briefcase size={15} />} label="Merchant" value={lineItemToView.merchantName || "—"} />
                      <DetailField icon={<Briefcase size={15} />} label="Cost Center" value={lineItemToView.costCenterName || "—"} />

                      <div className="col-span-2 grid grid-cols-3 gap-3 bg-gray-50/50 p-3.5 rounded-xl border border-gray-100">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Amount</span>
                          <span className="text-sm font-semibold font-mono text-gray-800">
                            {formatAmount(lineItemToView.amount)} {lineItemToView.currencyCode}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">GST (Tax)</span>
                          <span className="text-sm font-semibold font-mono text-amber-600">
                            {formatAmount(lineItemToView.taxAmount)} {lineItemToView.currencyCode}
                          </span>
                          {/* The saved breakdown (CGST / SGST / IGST / cess), as calculated or as Finance adjusted it. */}
                          {lineItemToView.tax?.components?.length > 0 && (
                            <span className="mt-0.5 block text-[11px] text-gray-500">
                              {lineItemToView.tax.taxCode ? `${lineItemToView.tax.taxCode}: ` : ""}
                              {lineItemToView.tax.components
                                .map((c) => `${c.label || c.componentCode} ${formatAmount(c.taxAmount)}`)
                                .join(" + ")}
                              {lineItemToView.tax.taxSource === "FINANCE_ADJUSTED" && (
                                <span className="ml-1 font-medium text-indigo-600">(adjusted by Finance)</span>
                              )}
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Net Amount</span>
                          <span className="text-sm font-semibold font-mono text-emerald-700">
                            {formatAmount(lineItemToView.netAmount)} {lineItemToView.currencyCode}
                          </span>
                        </div>
                      </div>

                      <DetailField
                        icon={<Landmark size={15} />}
                        label="Base Amount"
                        value={
                          <>
                            {`${formatAmount(lineItemToView.baseAmount)} ${lineItemToView.baseCurrencyCode}`}
                            {lineItemToView.currencyCode && lineItemToView.currencyCode !== lineItemToView.baseCurrencyCode && lineItemToView.exchangeRate != null && (
                              <span className="mt-0.5 block text-[11px] font-normal text-gray-500">
                                1 {lineItemToView.currencyCode} = {Number(lineItemToView.exchangeRate)} {lineItemToView.baseCurrencyCode}
                              </span>
                            )}
                          </>
                        }
                      />
                      <DetailField icon={<Briefcase size={15} />} label="Client Billable?" value={lineItemToView.clientBillable ? "Yes" : "No"} />
                      {lineItemToView.clientBillable && (
                        <div className="col-span-2">
                          <DetailField icon={<Briefcase size={15} />} label="Client" value={lineItemToView.resolvedClientName || "—"} />
                        </div>
                      )}
                      {lineItemToView.clientBillable && (
                        <div className="col-span-2">
                          <DetailField icon={<Briefcase size={15} />} label="Project" value={lineItemToView.projectName || "—"} />
                        </div>
                      )}
                      <div className="col-span-2">
                        <DetailField icon={<FileText size={15} />} label="Description" value={lineItemToView.description || "—"} />
                      </div>
                    </div>

                    <LineItemTaxDetails lineItem={lineItemToView} formatAmount={formatAmount} />
                    <LineItemAllocationDetails
                      lineItem={lineItemToView}
                      splits={lineItemSplitsMap[lineItemToView.lineItemId] || []}
                      formatAmount={formatAmount}
                    />

                    {/* Attached Receipts list */}
                    <div className="border-t border-gray-100 pt-4 space-y-2">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Attached Receipts</h3>
                      {loadingViewReceipts ? (
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Loader2 size={14} className="animate-spin text-indigo-500" />
                          <span>Loading receipts list...</span>
                        </div>
                      ) : viewReceipts.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">No receipts attached to this line item.</p>
                      ) : (
                        <div className="space-y-2">
                          {viewReceipts.map((r) => {
                            const isActive = viewReceiptFile?.receiptId === r.receiptId;
                            return (
                              <div
                                key={r.receiptId}
                                className={`flex items-center justify-between p-2.5 rounded-lg border transition ${
                                  isActive
                                    ? "border-indigo-500 bg-indigo-50/20"
                                    : "border-gray-200/80 bg-white hover:border-indigo-300"
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText size={16} className="text-indigo-500 shrink-0" />
                                  <div className="min-w-0">
                                    <span className="block text-xs font-medium text-gray-700 truncate" title={r.originalFileName || r.fileName}>
                                      {r.originalFileName || r.fileName}
                                    </span>
                                    {duplicateNotice(r) && (
                                      <span
                                        className={`block text-[10px] font-medium truncate ${
                                          duplicateNotice(r).status === "BLOCKING" ? "text-red-700" : "text-amber-700"
                                        }`}
                                        title={duplicateNotice(r).message}
                                      >
                                        {duplicateNotice(r).status === "BLOCKING" ? "Duplicate receipt" : "Possible duplicate receipt"}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleSelectActiveViewReceipt(r)}
                                    className={`p-1 rounded transition ${
                                      isActive
                                        ? "bg-indigo-100 text-indigo-700"
                                        : "hover:bg-gray-100 text-gray-500 hover:text-indigo-600"
                                    }`}
                                    title="View receipt in panel"
                                  >
                                    <Eye size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadReceiptForReadonly(r)}
                                    className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-indigo-600 transition"
                                    title="Download Receipt"
                                  >
                                    <Download size={14} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Footer Actions */}
              <div className="shrink-0 border-t border-gray-100 bg-gray-50 px-6 py-3 flex items-center justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsViewModalOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}

const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: "0.5rem",
    borderColor: state.isFocused ? "#3b82f6" : "#d1d5db",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(59, 130, 246, 0.5)" : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    padding: "0.125rem 0.25rem",
    minHeight: "42px",
    backgroundColor: "#ffffff",
    "&:hover": { borderColor: state.isFocused ? "#3b82f6" : "#d1d5db" },
  }),
  menu: (base) => ({ ...base, zIndex: 9999 }),
};

const compactSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: "0.375rem",
    borderColor: state.isFocused ? "#3b82f6" : "#d1d5db",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(59, 130, 246, 0.5)" : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    padding: "0px 4px",
    minHeight: "32px",
    height: "32px",
    backgroundColor: "#ffffff",
    "&:hover": { borderColor: state.isFocused ? "#3b82f6" : "#d1d5db" },
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "0px 6px",
    height: "30px",
  }),
  input: (base) => ({
    ...base,
    margin: "0px",
  }),
  indicatorsContainer: (base) => ({
    ...base,
    height: "30px",
  }),
  dropdownIndicator: (base) => ({
    ...base,
    padding: "4px",
  }),
  clearIndicator: (base) => ({
    ...base,
    padding: "4px",
  }),
  singleValue: (base) => ({
    ...base,
    fontSize: "0.75rem",
  }),
  placeholder: (base) => ({
    ...base,
    fontSize: "0.75rem",
  }),
  menu: (base) => ({ ...base, zIndex: 9999 }),
};

const emptyForm = (defaultCostCenterId) => ({
  categoryId: "",
  expenseDate: "",
  merchantName: "",
  description: "",
  amount: "",
  currencyId: "",
  tax: emptyTaxValue,
  costCenterId: defaultCostCenterId || "",
  clientBillable: false,
  clientId: "",
  allocationReason: "",
  projectId: "",
});

export function LineItemDrawer({
  isOpen,
  onClose,
  reportId,
  lineItem,
  defaultCostCenterId,
  categoryOptions = [],
  costCenterOptions = [],
  currencyOptions = [],
  onSaved,
}) {
  const [formData, setFormData] = useState(emptyForm(defaultCostCenterId));
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [savedLineItem, setSavedLineItem] = useState(null);
  const dateRange = useExpenseDateRange(reportId, isOpen);
  const [ocrReceiptId, setOcrReceiptId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const { clients, loading: loadingClients, error: clientsError, reload: loadClients } = useActiveClients();
  // The caller's home department, to tell when a chosen cost center needs a cross-department reason.
  const [homeDepartmentUuid, setHomeDepartmentUuid] = useState(null);
  // Latest server tax preview for the form (drives validation and the request's tax fields).
  const [taxPreview, setTaxPreview] = useState(null);

  // Before the line item is first created its baseAmount isn't known (computed server-side from the
  // exchange rate), so the entered amount is the split's reference until a save returns baseAmount.
  const split = useSplitAllocation(Number(savedLineItem?.baseAmount ?? formData.amount) || 0, formatAmount);

  const [editActiveReceiptUrl, setEditActiveReceiptUrl] = useState("");
  const [editActiveReceiptFile, setEditActiveReceiptFile] = useState(null);
  const [editZoom, setEditZoom] = useState(1);
  const [editRotation, setEditRotation] = useState(0);

  const [receipts, setReceipts] = useState([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]); // [{ id, file, name, size }]
  const [receiptToDelete, setReceiptToDelete] = useState(null);
  const [deletingReceipt, setDeletingReceipt] = useState(false);
  const inputRef = useRef(null);

  const isEditingExisting = !!lineItem;

  const fetchReceipts = useCallback(async () => {
    const idToFetch = lineItem?.lineItemId || savedLineItem?.lineItemId;
    if (!idToFetch) return;
    try {
      setLoadingReceipts(true);
      const res = await receiptService.getAll(idToFetch);
      const list = Array.isArray(res.data) ? res.data : res.data?.receipts || res.data?.content || res.data?.data || [];
      setReceipts(list);
    } catch (err) {
      console.error("Failed to fetch receipts:", err);
    } finally {
      setLoadingReceipts(false);
    }
  }, [lineItem?.lineItemId, savedLineItem?.lineItemId]);

  useEffect(() => {
    if (isOpen && (lineItem?.lineItemId || savedLineItem?.lineItemId)) {
      fetchReceipts();
    }
  }, [isOpen, lineItem?.lineItemId, savedLineItem?.lineItemId, fetchReceipts]);

  useEffect(() => {
    if (!isOpen) {
      setSavedLineItem(null);
      setPendingFiles([]);
      setReceipts([]);
      setOcrReceiptId(null);
      split.reset();
      return;
    }

    // Epic 8: the employee's own PMS-assigned ACTIVE projects — not the admin-wide project
    // master list. An employee can only select a project they're actually assigned to.
    const loadProjects = async () => {
      try {
        setLoadingProjects(true);
        const list = await lookupService.getAssignedProjects();
        setProjects(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error("Failed to load assigned projects:", err);
        showStatusToast("Could not load your assigned projects. Project is optional for billable expenses.", "error");
      } finally {
        setLoadingProjects(false);
      }
    };
    loadProjects();
    loadClients();
    lookupService.getAllocationContext()
      .then((ctx) => setHomeDepartmentUuid(ctx?.homeDepartmentUuid || null))
      .catch(() => setHomeDepartmentUuid(null)); // unknown department: the server decides at submit

    if (lineItem) {
      if (!savedLineItem ||
        lineItem.lineItemId !== savedLineItem.lineItemId ||
        lineItem.ocrReceiptId !== savedLineItem.ocrReceiptId) {
        const isOcr = !!lineItem.ocrReceiptId && !lineItem.lineItemId;
        setFormData({
          categoryId: lineItem.categoryId || "",
          expenseDate: lineItem.expenseDate || toIsoDate(new Date()),
          merchantName: lineItem.merchantName || "",
          description: lineItem.description || "",
          amount: lineItem.amount ?? "",
          currencyId: lineItem.currencyId || "",
          // Saved line: its snapshot. OCR draft: the receipt's GST as the entered side.
          tax: lineItem.lineItemId ? taxValueFromLine(lineItem) : taxValueFromOcr(lineItem.taxAmount),
          costCenterId: isOcr ? "" : (lineItem.costCenterId || defaultCostCenterId || ""),
          clientBillable: !!lineItem.clientBillable,
          // Saved line items carry the client as resolvedClientId (the frozen snapshot).
          clientId: lineItem.resolvedClientId || lineItem.clientId || "",
          allocationReason: lineItem.allocationReason || "",
          projectId: lineItem.projectId || "",
        });
        setTaxPreview(null);
        setSavedLineItem(lineItem);
        setOcrReceiptId(lineItem.ocrReceiptId || null);
        if (lineItem.scannedFile) {
          setPendingFiles([
            {
              id: Math.random().toString(36).substring(2, 9),
              file: lineItem.scannedFile,
              name: lineItem.scannedFile.name,
              size: lineItem.scannedFile.size,
            },
          ]);
        }
      }
    } else {
      setFormData(emptyForm(defaultCostCenterId));
      setTaxPreview(null);
      setSavedLineItem(null);
      setOcrReceiptId(null);
      split.reset();
    }
    setFormErrors({});
  }, [isOpen, lineItem, defaultCostCenterId, loadClients]);

  // Load existing splits only for a line item that actually exists yet (never call the splits
  // endpoint for a brand-new, not-yet-created line item — there is no lineItemId to call it with).
  useEffect(() => {
    const idToLoad = lineItem?.lineItemId;
    if (!isOpen || !idToLoad) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        split.setLoading(true);
        const res = await splitService.getAll(idToLoad);
        if (cancelled) return;
        const payload = res.data?.data;
        split.loadFrom(Array.isArray(payload) ? payload : Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to load existing split allocation:", err);
        showStatusToast("Failed to load this line item's existing split allocation.", "error");
      } finally {
        if (!cancelled) split.setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, lineItem?.lineItemId]);

  // Set the first receipt as active when receipts load or pending files change
  useEffect(() => {
    const loadFirstReceiptUrl = async () => {
      // If we have uploaded receipts and haven't selected one yet, select the first
      if (receipts.length > 0) {
        if (!editActiveReceiptFile || !receipts.some(r => r.receiptId === editActiveReceiptFile.receiptId)) {
          const first = receipts[0];
          setEditActiveReceiptFile(first);
          try {
            const res = await receiptService.getViewUrl(first.receiptId);
            const url = extractUrl(res.data?.data || res.data);
            if (url) setEditActiveReceiptUrl(url);
          } catch (err) {
            console.error("Failed to load edit active receipt url:", err);
          }
        }
      } 
      // If no uploaded receipts, check pending files
      else if (pendingFiles.length > 0) {
        if (!editActiveReceiptFile || !pendingFiles.some(pf => pf.id === editActiveReceiptFile.id)) {
          const first = pendingFiles[0];
          setEditActiveReceiptFile(first);
          if (first.file) {
            const url = URL.createObjectURL(first.file);
            setEditActiveReceiptUrl(url);
          }
        }
      }
      // If nothing is present, clear active
      else {
        setEditActiveReceiptFile(null);
        setEditActiveReceiptUrl("");
      }
    };
    loadFirstReceiptUrl();
  }, [receipts, pendingFiles]);

  // Clean up object URLs to prevent leaks
  useEffect(() => {
    return () => {
      if (editActiveReceiptUrl && editActiveReceiptUrl.startsWith("blob:")) {
        URL.revokeObjectURL(editActiveReceiptUrl);
      }
    };
  }, [editActiveReceiptUrl]);

  // Reset viewer when modal closes/opens
  useEffect(() => {
    if (!isOpen) {
      setEditActiveReceiptUrl("");
      setEditActiveReceiptFile(null);
      setEditZoom(1);
      setEditRotation(0);
    }
  }, [isOpen]);

  const handleSelectEditReceipt = async (receipt) => {
    try {
      setEditActiveReceiptFile(receipt);
      setEditActiveReceiptUrl("");
      if (receipt.receiptId) {
        const res = await receiptService.getViewUrl(receipt.receiptId);
        const url = extractUrl(res.data?.data || res.data);
        if (url) setEditActiveReceiptUrl(url);
      } else if (receipt.file) {
        const url = URL.createObjectURL(receipt.file);
        setEditActiveReceiptUrl(url);
      }
    } catch (err) {
      console.error("Failed to select edit receipt:", err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSelectChange = (name, value) => {
    // A new category brings its own default tax code, so an explicit pick is dropped.
    setFormData((prev) =>
      name === "categoryId" ? { ...prev, categoryId: value, tax: { ...prev.tax, taxCodeId: null } } : { ...prev, [name]: value }
    );
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const splitTotalCurrencyLabel =
    savedLineItem?.baseCurrencyCode ||
    currencyOptions.find((o) => o.value === formData.currencyId)?.label?.split(" - ")[0] ||
    "";

  const handleFileChange = (files) => {
    if (!files?.length) return;
    const newFiles = [];
    let hasDuplicate = false;

    const allowedExtensions = ["pdf", "png", "jpg", "jpeg"];

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop().toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        showStatusToast("Only PDF, PNG, JPG, and JPEG files are allowed.", "error");
        continue;
      }

      const isPendingDuplicate = pendingFiles.some(
        (pf) => pf.name === file.name && pf.size === file.size
      );
      // Uploads are sent under a sanitized name, which is what the server stores as originalFileName.
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const isUploadedDuplicate = receipts.some(
        (r) => (r.originalFileName || r.fileName) === safeName && r.fileSize === file.size
      );

      if (isPendingDuplicate || isUploadedDuplicate) {
        hasDuplicate = true;
      } else {
        newFiles.push({
          id: Math.random().toString(36).substring(2, 9),
          file,
          name: file.name,
          size: file.size,
        });
      }
    }

    if (hasDuplicate) {
      showStatusToast("This receipt has already been uploaded.", "error");
    }

    if (newFiles.length > 0) {
      setPendingFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleViewReceipt = async (receipt) => {
    try {
      if (receipt.receiptId) {
        const res = await receiptService.getViewUrl(receipt.receiptId);
        const url = extractUrl(res.data?.data || res.data);
        if (url) window.open(url, "_blank", "noopener,noreferrer");
      } else if (receipt.file) {
        const url = URL.createObjectURL(receipt.file);
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      showStatusToast("Failed to open receipt preview.", "error");
    }
  };

  const handleDownloadReceipt = async (receipt) => {
    try {
      const res = await receiptService.getDownloadUrl(receipt.receiptId);
      const url = extractUrl(res.data?.data || res.data);
      if (url) {
        const link = document.createElement("a");
        link.href = url;
        link.download = receipt.fileName || "receipt";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (err) {
      showStatusToast("Failed to download receipt.", "error");
    }
  };

  const handleDeleteReceiptConfirm = async () => {
    if (!receiptToDelete) return;
    try {
      setDeletingReceipt(true);
      await receiptService.delete(receiptToDelete.receiptId);
      showStatusToast("Receipt deleted successfully!", "success");
      setReceiptToDelete(null);
      fetchReceipts();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to delete receipt.";
      showStatusToast(errMsg, "error");
    } finally {
      setDeletingReceipt(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    const amountNum = Number(formData.amount);

    if (!formData.amount || amountNum <= 0) {
      errors.amount = "Amount is required and must be greater than 0.";
    }
    const taxError = validateTaxValue(formData.tax, taxPreview, formData.amount);
    if (taxError) errors.tax = taxError;
    if (!formData.merchantName.trim()) errors.merchantName = "Merchant is required.";
    if (!formData.currencyId) errors.currencyId = "Currency is required.";
    if (!formData.categoryId) errors.categoryId = "Category is required.";
    if (!formData.costCenterId) errors.costCenterId = "Cost center is required.";
    const expenseDateProblem = expenseDateError(formData.expenseDate, dateRange);
    if (expenseDateProblem) errors.expenseDate = expenseDateProblem;
    if (formData.clientBillable && !formData.clientId) {
      errors.clientId = "Client is required when billable.";
    }
    if (crossDepartmentCostCenters.length > 0 && !(formData.allocationReason || "").trim()) {
      errors.allocationReason = "Explain why this expense is charged to another department.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Enforcement (not severity) decides the outcome — see PolicyStatusBadge.
  // BLOCKED (an unexplained BLOCK rule) keeps the drawer open with the violation
  // banner visible, since the employee will have to explain it when submitting;
  // WARNING follows the normal save-and-close flow and surfaces the warning via toast.
  const finalizeLineItemSave = (savedItem, successMessage, { closeOnSuccess = false } = {}) => {
    const { status, warnings } = derivePolicyStatus(savedItem?.lineStatus, savedItem?.policyWarnings);
    setSavedLineItem(savedItem);

    if (status === "BLOCKED") {
      const firstMsg = warnings[0]?.message;
      showStatusToast(
        firstMsg
          ? `Saved. Over policy: ${firstMsg} You'll be asked to explain it when you submit.`
          : "Saved. This is over policy; you'll be asked to explain it when you submit.",
        "warning"
      );
      onSaved?.();
      return;
    }

    if (status === "WARNING") {
      const firstMsg = warnings[0]?.message;
      showStatusToast(
        firstMsg ? `${successMessage} Policy warning: ${firstMsg}` : `${successMessage} (Policy warning)`,
        "warning"
      );
    } else {
      showStatusToast(successMessage, "success");
    }

    onSaved?.();
    if (closeOnSuccess) onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!split.validate()) return;

    const payload = {
      categoryId: formData.categoryId,
      expenseDate: formData.expenseDate,
      merchantName: formData.merchantName.trim(),
      description: formData.description ? formData.description.trim() : "",
      amount: Number(formData.amount),
      currencyId: formData.currencyId,
      // An OCR draft is saved through /receipts/{id}/confirm, where a null tax would fall back to raw OCR.
      ...(ocrReceiptId && !(savedLineItem && savedLineItem.lineItemId)
        ? taxRequestFieldsForConfirm(formData.tax, taxPreview)
        : taxRequestFields(formData.tax, taxPreview)),
      costCenterId: formData.costCenterId,
      // Project is optional for a billable expense; if one is picked, the server checks it
      // belongs to the selected client.
      clientId: formData.clientBillable ? (formData.clientId || null) : null,
      allocationReason: crossDepartmentCostCenters.length > 0 ? (formData.allocationReason || "").trim() || null : null,
      projectId: formData.clientBillable ? (formData.projectId || null) : null,
      clientBillable: !!formData.clientBillable,
    };

    try {
      setSubmitting(true);
      let res;
      if (savedLineItem && savedLineItem.lineItemId) {
        res = await lineItemService.update(reportId, savedLineItem.lineItemId, payload);
        const lineItemId = savedLineItem.lineItemId;

        if (lineItemId && pendingFiles.length > 0) {
          for (const pf of pendingFiles) {
            const formDataUpload = new FormData();
            const safeName = pf.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            formDataUpload.append("file", pf.file, safeName);
            try {
              const uploadRes = await receiptService.upload(lineItemId, formDataUpload);
              notifyDuplicateReceipt(uploadRes?.data?.data);
            } catch (uploadErr) {
              console.error(`Failed to upload ${pf.name}:`, uploadErr);
              showStatusToast(`Failed to upload ${pf.name}`, "error");
            }
          }
          setPendingFiles([]);
        }

        const updatedItem = res.data?.data || res.data || { ...payload, lineItemId };
        fetchReceipts();

        const splitResult = await split.save(lineItemId);
        if (!splitResult.ok) {
          setSavedLineItem(updatedItem);
          showStatusToast(`Line item updated, but the split allocation could not be saved: ${splitResult.message}`, "error");
          onSaved?.();
          return;
        }
        finalizeLineItemSave(updatedItem, "Line item updated successfully!");
      } else if (ocrReceiptId) {
        // OCR Confirm flow
        res = await api.post(`/xms/employee/receipts/${ocrReceiptId}/confirm`, {
          ...payload,
          lineItemId: null
        }, {
          baseURL: XMS_BASE_URL,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          }
        });
        const createdItem = res.data?.data || res.data;
        const lineItemId = createdItem?.lineItemId;

        const splitResult = lineItemId ? await split.save(lineItemId) : { ok: true };
        if (!splitResult.ok) {
          setSavedLineItem(createdItem);
          showStatusToast(`Line item created, but the split allocation could not be saved: ${splitResult.message}`, "error");
          onSaved?.();
          return;
        }
        finalizeLineItemSave(createdItem, "Line item created and receipt confirmed successfully!", { closeOnSuccess: true });
      } else {
        res = await lineItemService.create(reportId, payload);
        const createdItem = res.data?.data || res.data;
        const lineItemId = createdItem?.lineItemId;

        if (lineItemId && pendingFiles.length > 0) {
          for (const pf of pendingFiles) {
            const formDataUpload = new FormData();
            const safeName = pf.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            formDataUpload.append("file", pf.file, safeName);
            try {
              const uploadRes = await receiptService.upload(lineItemId, formDataUpload);
              notifyDuplicateReceipt(uploadRes?.data?.data);
            } catch (uploadErr) {
              console.error(`Failed to upload ${pf.name}:`, uploadErr);
              showStatusToast(`Failed to upload ${pf.name}`, "error");
            }
          }
        }

        const splitResult = lineItemId ? await split.save(lineItemId) : { ok: true };
        if (!splitResult.ok) {
          setSavedLineItem(createdItem);
          showStatusToast(`Line item added, but the split allocation could not be saved: ${splitResult.message}`, "error");
          onSaved?.();
          return;
        }
        finalizeLineItemSave(createdItem, "Line item added successfully!", { closeOnSuccess: true });
      }
    } catch (err) {
      console.error("Error saving line item:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to save line item.";
      showStatusToast(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const mergedCategoryOptions = useMemo(() => {
    if (!lineItem?.categoryId) return categoryOptions;
    const alreadyPresent = categoryOptions.some((o) => o.value === lineItem.categoryId);
    if (alreadyPresent) return categoryOptions;
    return [{ value: lineItem.categoryId, label: lineItem.categoryName || lineItem.categoryId }, ...categoryOptions];
  }, [categoryOptions, lineItem]);

  const projectOptions = useMemo(() => projectOptionsForClient(projects, formData.clientId), [projects, formData.clientId]);

  // Switching client drops a picked project that doesn't belong to the new client.
  const handleClientChange = (clientId) => {
    setFormData((prev) => ({ ...prev, clientId, projectId: projectIdForClient(projects, prev.projectId, clientId) }));
    if (formErrors.clientId) setFormErrors((prev) => ({ ...prev, clientId: "" }));
  };

  const crossDepartmentCostCenters = crossDepartmentCostCenterLabels({
    split,
    costCenterId: formData.costCenterId,
    costCenterOptions,
    homeDepartmentUuid,
  });

  const clientOptions = useMemo(() => {
    const options = clients
      .filter((c) => c.clientId)
      .map((c) => ({ value: c.clientId, label: c.clientName || c.clientId }));
    // Keep an edited line item's saved client visible even if RMS no longer lists it as active;
    // the server rejects it on save with an explanatory message.
    const savedId = lineItem?.resolvedClientId;
    if (savedId && !loadingClients && !options.some((o) => o.value === savedId)) {
      return [{ value: savedId, label: lineItem.resolvedClientName || "Previously selected client" }, ...options];
    }
    return options;
  }, [clients, lineItem, loadingClients]);

  const selectedCurrency = currencyOptions.find((o) => o.value === formData.currencyId) || null;
  const selectedCostCenter = costCenterOptions.find((o) => o.value === formData.costCenterId) || null;
  const selectedCategory = mergedCategoryOptions.find((o) => o.value === formData.categoryId) || null;

  const renderFormFields = () => {
    return (
      <div className="space-y-3 py-1">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-0.5">
            <label className="block text-xs font-semibold text-gray-600">
              Category <span className="text-red-500">*</span>
            </label>
            <Select
              options={mergedCategoryOptions}
              value={selectedCategory}
              onChange={(opt) => handleSelectChange("categoryId", opt ? opt.value : "")}
              placeholder="Select expense category..."
              isSearchable
              styles={compactSelectStyles}
              isDisabled={submitting}
            />
            {formErrors.categoryId && <span className="text-[11px] text-red-600 block mt-0.5">{formErrors.categoryId}</span>}
          </div>

          <FormInput
            label="Expense Date *"
            name="expenseDate"
            type="date"
            value={formData.expenseDate}
            onChange={handleInputChange}
            min={dateRange.minDate || undefined}
            max={dateRange.maxDate || undefined}
            disabled={submitting}
            error={formErrors.expenseDate}
            className="space-y-0.5"
            labelClassName="block text-xs font-semibold text-gray-600"
            inputClassName="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm h-8"
            required
          />
          {!formErrors.expenseDate && <p className="text-[11px] text-gray-500">{expenseDateHint(dateRange)}</p>}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormInput
            label="Merchant"
            name="merchantName"
            placeholder="e.g. REDBUS"
            value={formData.merchantName}
            onChange={handleInputChange}
            requiredMark
            disabled={submitting}
            error={formErrors.merchantName}
            className="space-y-0.5"
            labelClassName="block text-xs font-semibold text-gray-600"
            inputClassName="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm h-8"
          />

          <div className="space-y-0.5">
            <label className="block text-xs font-semibold text-gray-600">
              Cost Center <span className="text-red-500">*</span>
            </label>
            <Select
              options={costCenterOptions}
              value={selectedCostCenter}
              onChange={(opt) => handleSelectChange("costCenterId", opt ? opt.value : "")}
              placeholder="Select cost center..."
              isSearchable
              styles={compactSelectStyles}
              isDisabled={submitting}
            />
            {formErrors.costCenterId && <span className="text-[11px] text-red-600 block mt-0.5">{formErrors.costCenterId}</span>}
          </div>
        </div>

        <SplitAllocationSection
          split={split}
          costCenterOptions={costCenterOptions}
          selectStyles={compactSelectStyles}
          disabled={submitting}
          formatAmount={formatAmount}
          currencyLabel={splitTotalCurrencyLabel}
        />

        {crossDepartmentCostCenters.length > 0 && (
          <div className="space-y-0.5 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
            <label htmlFor="allocationReason" className="block text-xs font-semibold text-amber-900">
              Reason for charging another department <span className="text-red-500">*</span>
            </label>
            <p className="text-[11px] text-amber-800">
              {homeDepartmentUuid
                ? `${crossDepartmentCostCenters.join(", ")} ${crossDepartmentCostCenters.length === 1 ? "is" : "are"} outside your department.`
                : `${crossDepartmentCostCenters.join(", ")} belong to different departments.`}{" "}
              Charge the cost center of the event or purpose this expense was for, and say why.
            </p>
            <textarea
              id="allocationReason"
              name="allocationReason"
              value={formData.allocationReason}
              onChange={handleInputChange}
              placeholder="e.g. Joint Engineering–HR campus hiring event"
              rows={2}
              maxLength={500}
              disabled={submitting}
              className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs shadow-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
            />
            {formErrors.allocationReason && (
              <span className="text-[11px] text-red-600 block mt-0.5">{formErrors.allocationReason}</span>
            )}
          </div>
        )}

        <div className="space-y-0.5">
          <label htmlFor="description" className="block text-xs font-semibold text-gray-600">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Optional notes about this expense..."
            rows={2}
            disabled={submitting}
            className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs shadow-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormInput
            label="Amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={formData.amount}
            onChange={handleInputChange}
            requiredMark
            disabled={submitting}
            error={formErrors.amount}
            className="space-y-0.5"
            labelClassName="block text-xs font-semibold text-gray-600"
            inputClassName="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm h-8"
          />

          <div className="space-y-0.5">
            <label className="block text-xs font-semibold text-gray-600">
              Currency <span className="text-red-500">*</span>
            </label>
            <Select
              options={currencyOptions}
              value={selectedCurrency}
              onChange={(opt) => handleSelectChange("currencyId", opt ? opt.value : "")}
              placeholder="Select currency..."
              isSearchable
              styles={compactSelectStyles}
              isDisabled={submitting}
            />
            {formErrors.currencyId && <span className="text-[11px] text-red-600 block mt-0.5">{formErrors.currencyId}</span>}
          </div>

        </div>

        <TaxBreakdownPanel
          amount={formData.amount}
          currencyId={formData.currencyId}
          currencyCode={selectedCurrency?.code || ""}
          expenseDate={formData.expenseDate}
          categoryId={formData.categoryId}
          value={formData.tax}
          onChange={(tax) => {
            setFormData((prev) => ({ ...prev, tax }));
            if (formErrors.tax) setFormErrors((prev) => ({ ...prev, tax: "" }));
          }}
          onPreview={setTaxPreview}
          error={formErrors.tax}
          disabled={submitting}
          ocrTaxAmount={
            savedLineItem?.lineItemId
              ? savedLineItem?.tax?.ocrTaxAmount ?? null
              : Number(lineItem?.taxAmount) > 0 ? Number(lineItem.taxAmount) : null
          }
          savedTaxSource={savedLineItem?.tax?.taxSource}
          savedTaxAmount={savedLineItem?.taxAmount}
        />

        <BillableClientFields
          clientBillable={formData.clientBillable}
          clientId={formData.clientId}
          projectId={formData.projectId}
          onBillableChange={(value) => handleSelectChange("clientBillable", value)}
          onClientChange={handleClientChange}
          onProjectChange={(value) => handleSelectChange("projectId", value)}
          clientOptions={clientOptions}
          projectOptions={projectOptions}
          clientsLoading={loadingClients}
          clientsError={clientsError}
          onRetryClients={loadClients}
          projectsLoading={loadingProjects}
          errors={formErrors}
          selectStyles={compactSelectStyles}
          disabled={submitting}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CurrencyConversionCard
            amount={formData.amount}
            currencyCode={selectedCurrency?.code}
            exchangeRate={savedLineItem?.exchangeRate}
            baseAmount={savedLineItem?.baseAmount}
            baseCurrencyCode={savedLineItem?.baseCurrencyCode}
            pending={!savedLineItem}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-600">Receipts</label>
          {isEditingExisting ? (
            <div className="space-y-2">
              {loadingReceipts ? (
                <div className="flex items-center justify-center py-4 text-gray-400">
                  <Loader2 className="animate-spin" size={16} />
                </div>
              ) : receipts.length === 0 ? (
                <p className="text-center text-[11px] text-gray-400 py-1">No receipts uploaded yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {receipts.map((r) => {
                    const isActive = editActiveReceiptFile?.receiptId === r.receiptId;
                    return (
                      <div
                        key={r.receiptId}
                        className={`flex items-center gap-2 rounded-lg border p-2 transition ${
                          isActive
                            ? "border-indigo-500 bg-indigo-50/20"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <div className="shrink-0 p-1.5 rounded-lg bg-blue-50 text-blue-600">
                          {isImageFile(r.originalFileName || r.fileName) ? <ImageIcon size={14} /> : <FileText size={14} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-800 truncate">{r.originalFileName || r.fileName || "Receipt"}</p>
                          <p className="text-[10px] text-gray-400">
                            {formatFileSize(r.fileSize)} &bull; {formatDate(r.uploadedAt)}
                          </p>
                          {duplicateNotice(r) && (
                            <p
                              className={`mt-0.5 text-[10px] font-medium ${
                                duplicateNotice(r).status === "BLOCKING" ? "text-red-700" : "text-amber-700"
                              }`}
                              title={duplicateNotice(r).message}
                            >
                              {duplicateNotice(r).status === "BLOCKING" ? "Duplicate: " : "Possible duplicate: "}
                              {duplicateNotice(r).message}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button
                            type="button"
                            variant="link"
                            size="icon"
                            title="View Receipt"
                            className={`h-6 w-6 p-0 rounded-md transition ${
                              isActive ? "bg-indigo-100 text-indigo-700" : "text-gray-600 hover:bg-gray-100"
                            }`}
                            onClick={() => handleSelectEditReceipt(r)}
                          >
                            <Eye size={12} />
                          </Button>
                          <Button
                            type="button"
                            variant="link"
                            size="icon"
                            title="Download Receipt"
                            className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-50 rounded-md"
                            onClick={() => handleDownloadReceipt(r)}
                          >
                            <Download size={12} />
                          </Button>
                          <Button
                            type="button"
                            variant="link"
                            size="icon"
                            title="Delete Receipt"
                            className="h-6 w-6 p-0 text-red-600 hover:bg-red-50 rounded-md"
                            onClick={() => setReceiptToDelete(r)}
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add More Receipts Section */}
              <div className="mt-2 space-y-1.5">
                <p className="text-xs font-semibold text-gray-700">Add More Receipts</p>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    handleFileChange(e.dataTransfer.files);
                  }}
                  onClick={() => inputRef.current?.click()}
                  className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-3 text-center cursor-pointer transition ${isDragging ? "border-[#0A0082] bg-indigo-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100"
                    }`}
                >
                  <UploadCloud className={isDragging ? "text-[#0A0082]" : "text-gray-400"} size={18} />
                  <p className="text-[11px] font-medium text-gray-600">
                    Drag &amp; drop a receipt, or <span className="text-[#0A0082] font-semibold">browse</span>
                  </p>
                  <p className="text-[9px] text-gray-400">PDF, PNG, JPG up to 10MB</p>
                  <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => {
                      handleFileChange(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </div>

                {pendingFiles.length > 0 && (
                  <div className="space-y-1.5">
                    {pendingFiles.map((pf) => {
                      const isActive = editActiveReceiptFile?.id === pf.id;
                      return (
                        <div
                          key={pf.id}
                          className={`flex items-center gap-2 rounded-lg border p-2 transition ${
                            isActive
                              ? "border-indigo-500 bg-indigo-50/20"
                              : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          <div className="shrink-0 p-1.5 rounded-lg bg-blue-50 text-blue-600">
                            {isImageFile(pf.name) ? <ImageIcon size={14} /> : <FileText size={14} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-gray-800 truncate">{pf.name}</p>
                            <p className="text-[10px] text-gray-400">
                              {formatFileSize(pf.size)}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button
                              type="button"
                              variant="link"
                              size="icon"
                              title="View Receipt"
                              className={`h-6 w-6 p-0 rounded-md transition ${
                                isActive ? "bg-indigo-100 text-indigo-700" : "text-gray-600 hover:bg-gray-100"
                              }`}
                              onClick={() => handleSelectEditReceipt(pf)}
                            >
                              <Eye size={12} />
                            </Button>
                            <Button
                              type="button"
                              variant="link"
                              size="icon"
                              title="Remove File"
                              className="h-6 w-6 p-0 text-red-600 hover:bg-red-50 rounded-md"
                              onClick={() => {
                                setPendingFiles((prev) => prev.filter((item) => item.id !== pf.id));
                                if (editActiveReceiptFile?.id === pf.id) {
                                  setEditActiveReceiptFile(null);
                                  setEditActiveReceiptUrl("");
                                }
                              }}
                            >
                              <Trash2 size={12} />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFileChange(e.dataTransfer.files);
                }}
                onClick={() => inputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition ${isDragging ? "border-[#0A0082] bg-indigo-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100"
                  }`}
              >
                <UploadCloud className={isDragging ? "text-[#0A0082]" : "text-gray-400"} size={20} />
                <p className="text-[11px] font-medium text-gray-600">
                  Drag &amp; drop a receipt, or <span className="text-[#0A0082] font-semibold">browse</span>
                </p>
                <p className="text-[9px] text-gray-400">PDF, PNG, JPG up to 10MB</p>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
                  className="hidden"
                  onChange={(e) => {
                    handleFileChange(e.target.files);
                    e.target.value = "";
                  }}
                />
              </div>

              {pendingFiles.length > 0 && (
                <div className="space-y-1.5">
                  {pendingFiles.map((pf) => (
                    <div
                      key={pf.id}
                      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 hover:border-gray-300 transition"
                    >
                      <div className="shrink-0 p-1.5 rounded-lg bg-blue-50 text-blue-600">
                        {isImageFile(pf.name) ? <ImageIcon size={14} /> : <FileText size={14} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-800 truncate">{pf.name}</p>
                        <p className="text-[10px] text-gray-400">
                          {formatFileSize(pf.size)}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button
                          type="button"
                          variant="link"
                          size="icon"
                          title="View Receipt"
                          className="h-6 w-6 p-0 text-gray-600 hover:bg-gray-100 rounded-md"
                          onClick={() => handleViewReceipt(pf)}
                        >
                          <Eye size={12} />
                        </Button>
                        <Button
                          type="button"
                          variant="link"
                          size="icon"
                          title="Remove File"
                          className="h-6 w-6 p-0 text-red-600 hover:bg-red-50 rounded-md"
                          onClick={() => setPendingFiles((prev) => prev.filter((item) => item.id !== pf.id))}
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-[#f8fafc] flex flex-col h-screen w-screen overflow-hidden animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700 shadow-sm">
            {savedLineItem ? <Pencil size={20} /> : <Plus size={20} />}
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {savedLineItem ? "Edit Line Item" : "Add Line Item"}
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              {savedLineItem
                ? "Modify this expense line item, or attach supporting receipts below."
                : "Capture a single expense with real-time currency and GST calculation."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition"
        >
          <X size={20} />
        </button>
      </div>

      {/* Body - 50% / 50% split */}
      <div className="flex-1 flex min-h-0">
        {/* Left Column (50%): Receipt Preview */}
        <div className="w-1/2 bg-[#0b0f19] flex items-center justify-center border-r border-gray-100 min-w-0 h-full overflow-hidden relative group">
          {loadingReceipts ? (
            <div className="flex flex-col items-center gap-2 text-sm text-gray-400">
              <Loader2 size={24} className="animate-spin text-indigo-500" />
              <span>Loading receipt...</span>
            </div>
          ) : editActiveReceiptUrl ? (
            editActiveReceiptFile?.fileName?.toLowerCase().endsWith(".pdf") || 
            editActiveReceiptFile?.name?.toLowerCase().endsWith(".pdf") ? (
              <iframe
                src={editActiveReceiptUrl}
                className="w-full h-full border-0"
                title="Receipt PDF Preview"
              />
            ) : (
              <>
                <img
                  src={editActiveReceiptUrl}
                  style={{
                    transform: `scale(${editZoom}) rotate(${editRotation}deg)`,
                    transition: "transform 0.2s ease-in-out",
                  }}
                  className="w-full h-full object-contain"
                  alt="Receipt Image Preview"
                />
                <div className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-slate-700/50 shadow-lg text-white z-10 select-none">
                  <button
                    type="button"
                    onClick={() => setEditZoom((prev) => Math.max(prev - 0.2, 0.5))}
                    className="p-1 hover:bg-slate-800 rounded-full transition text-slate-300 hover:text-white"
                    title="Zoom Out (-)"
                  >
                    <ZoomOut size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditZoom((prev) => Math.min(prev + 0.2, 3))}
                    className="p-1 hover:bg-slate-800 rounded-full transition text-slate-300 hover:text-white"
                    title="Zoom In (+)"
                  >
                    <ZoomIn size={15} />
                  </button>
                  <div className="w-[1px] h-3 bg-slate-700/50 mx-0.5" />
                  <button
                    type="button"
                    onClick={() => setEditRotation((prev) => prev - 90)}
                    className="p-1 hover:bg-slate-800 rounded-full transition text-slate-300 hover:text-white"
                    title="Rotate Left (↺)"
                  >
                    <RotateCcw size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditRotation((prev) => prev + 90)}
                    className="p-1 hover:bg-slate-800 rounded-full transition text-slate-300 hover:text-white"
                    title="Rotate Right (↻)"
                  >
                    <RotateCw size={15} />
                  </button>
                  <div className="w-[1px] h-3 bg-slate-700/50 mx-0.5" />
                  <button
                    type="button"
                    onClick={() => {
                      setEditZoom(1);
                      setEditRotation(0);
                    }}
                    className="px-2 py-0.5 text-[10px] font-bold hover:bg-slate-800 rounded-md transition text-slate-300 hover:text-white"
                    title="Reset"
                  >
                    Reset
                  </button>
                </div>
              </>
            )
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-400 select-none">
              <UploadCloud size={32} className="text-slate-500 animate-pulse" />
              <span className="text-xs font-semibold text-slate-400">No receipt preview available</span>
              <span className="text-[10px] text-slate-500 max-w-[220px] text-center leading-relaxed">Please upload a receipt on the right side to preview it here.</span>
            </div>
          )}
        </div>

        {/* Right Column (50%): Form Fields */}
        <div className="w-1/2 flex flex-col min-h-0 bg-white">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {ocrReceiptId && (
              <div className="mb-4 flex items-center justify-between rounded-lg bg-indigo-50 border border-indigo-200 px-3.5 py-2.5 text-xs font-medium text-indigo-700 shadow-sm">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-indigo-500 animate-pulse shrink-0" />
                  <span>AI Scanned: We've pre-filled fields using OCR with {lineItem?.confidenceScore ? `${Math.round(lineItem.confidenceScore <= 1 ? lineItem.confidenceScore * 100 : lineItem.confidenceScore)}%` : "100%"} confidence.</span>
                </div>
              </div>
            )}

            {categoryOptions.length === 0 && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-medium text-amber-700">
                <AlertTriangle size={14} />
                Expense categories couldn't be loaded for your account.
              </div>
            )}

            <form id="line-item-form" onSubmit={handleSubmit} noValidate className="space-y-4">
              {renderFormFields()}
            </form>
          </div>

          {/* Footer Action Bar */}
          <div className="shrink-0 border-t border-gray-100 bg-gray-50 px-6 py-3 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              type="submit"
              form="line-item-form"
              variant="primary"
              loading={submitting}
              loadingText="Saving..."
              disabled={submitting}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 border-none"
            >
              {savedLineItem ? "Save Changes" : "Save Line Item"}
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!receiptToDelete}
        title="Delete Receipt"
        message={`Are you sure you want to delete the receipt "${receiptToDelete?.originalFileName || receiptToDelete?.fileName || "receipt"}"? This action cannot be undone.`}
        confirmText="Delete Receipt"
        cancelText="Cancel"
        onConfirm={handleDeleteReceiptConfirm}
        onCancel={() => setReceiptToDelete(null)}
        isLoading={deletingReceipt}
        variant="danger"
      />
    </div>,
    document.body
  );
}

const formatFileSize = (bytes) => {
  if (!bytes && bytes !== 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isImageFile = (fileName = "") => /\.(png|jpe?g|gif|webp|heic)$/i.test(fileName);

const extractUrl = (data) => {
  if (!data) return null;
  if (typeof data === "string") return data;
  return data.url || data.viewUrl || data.downloadUrl || data.presignedUrl || null;
};
