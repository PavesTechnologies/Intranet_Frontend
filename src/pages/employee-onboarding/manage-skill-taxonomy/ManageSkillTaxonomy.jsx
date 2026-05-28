import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CloseIcon,
  DeleteIcon,
  EditIcon,
  FolderOpenIcon,
  JobIcon,
  SearchIcon,
} from "../../../components/icons";
import { useLocation } from "react-router-dom";
import Button from "../../../components/Button/Button";
import LoadingSpinner from "../../../components/LoadingSpinner";
import Modal from "../../../components/Modal/modal";
import Pagination from "../../../components/Pagination/pagination";
import GlobalStatusBadge from "../../../components/status/statusbadge";
import Tooltip from "../../../components/status/Tooltip";
import FormTextArea from "../../../components/forms/FormTextArea";
import SkillManagementModal from "../../resource_management/models/skill_management/SkillManagementModal";
import { skillService } from "../../../services/skillService";
import { notify } from "../../resource_management/utils/notify";
import { useAuth } from "../../../contexts/AuthContext";
import ConfirmationModal from "../../../components/confirmation_modal/ConfirmationModal";

const normalize = (value) => `${value || ""}`.trim().toLowerCase();

const tabDescriptions = {
  taxonomy:
    "Maintain the master skill taxonomy used across employee profiles, roles, and resource planning.",
  requests:
    "Review requested additions or changes before they become part of the approved skill taxonomy.",
};

const mapCategoryDto = (category) => ({
  id: category.id,
  name: category.name,
  description: category.description || "",
  active: category.active ?? true,
  skills: [],
  skillsLoaded: false,
  skillsLoading: false,
});

const mapSkillDto = (skill) => ({
  id: skill.id,
  name: skill.name,
  description: skill.description || "",
  active: skill.active ?? true,
  subSkills: [],
  subSkillsLoaded: false,
  subSkillsLoading: false,
});

const mapSubSkillDto = (subSkill) => ({
  id: subSkill.id,
  name: subSkill.name,
  description: subSkill.description || "",
  active: subSkill.active ?? true,
});

const REQUESTS_PAGE_SIZE = 5;

const formatRequestDate = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getRequestStatus = (request) => `${request?.requestStatus || ""}`.toUpperCase();

const isRequestActionDisabled = (request) =>
  ["APPROVED", "REJECTED"].includes(getRequestStatus(request));

const getApprovedByDisplay = (request) =>
  request?.approvedBy || (getRequestStatus(request) === "APPROVED" ? "ADMIN" : "--");

/* ─── Small reusable UI atoms ─────────────────────────────────────── */

const RequestStatusBadge = ({ status }) => {
  const normalizedStatus = `${status || "PENDING"}`.toUpperCase();
  return <GlobalStatusBadge label={normalizedStatus} size="sm" />;
};

const ActionButton = ({
  onClick,
  icon: Icon,
  variant = "edit",
  label,
  disabled = false,
}) => (
  <Button
    type="button"
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    aria-label={label}
    title={disabled ? "Inactive items cannot be edited or deleted" : label}
    variant="ghost"
    size="icon"
    className={`h-8 w-8 shadow-none ${
      disabled
        ? "cursor-not-allowed text-gray-300"
        : variant === "edit"
          ? "text-indigo-600 hover:bg-indigo-50"
          : "text-rose-600 hover:bg-rose-50"
    }`}
  >
    <Icon className="h-3.5 w-3.5" />
  </Button>
);

const InlineSpinner = ({ message }) => (
  <LoadingSpinner text={message} size="sm" />
);

const EmptyPane = ({ message }) => (
  <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-gray-200 bg-white px-4 py-8 text-center">
    <FolderOpenIcon className="h-6 w-6 text-gray-300" />
    <p className="text-sm text-gray-400">{message}</p>
  </div>
);

const SearchInput = ({ value, onChange, placeholder, onClear }) => (
  <div className="relative">
    <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-8 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
    />
    {value ? (
      <Button
        type="button"
        onClick={onClear}
        aria-label="Clear search"
        variant="ghost"
        size="icon"
        className="absolute right-2.5 top-1/2 h-6 w-6 -translate-y-1/2 p-0 text-gray-400 shadow-none hover:text-gray-600"
      >
        <CloseIcon className="h-3.5 w-3.5" />
      </Button>
    ) : null}
  </div>
);

/* Updated: uses Set-based processingRequestIds + bulkProcessing flag */
const RequestActions = ({ request, onApprove, onReject, processingRequestIds, bulkProcessing, canApprove }) => {
  const isProcessing = processingRequestIds.has(request.id) || bulkProcessing;
  const disabled = isRequestActionDisabled(request) || isProcessing;
  const adminOnlyTooltip = "Only ADMIN can approve and reject the request";
  const wrapAdminTooltip = (children) =>
    canApprove ? children : <Tooltip content={adminOnlyTooltip}>{children}</Tooltip>;

  return (
    <div className="flex items-center gap-2">
      {wrapAdminTooltip(
        <span className="inline-flex">
          <Button
            type="button"
            onClick={() => onApprove(request)}
            disabled={disabled || !canApprove}
            variant="success"
            size="small"
            className="border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          >
            Approve
          </Button>
        </span>,
      )}
      {wrapAdminTooltip(
        <span className="inline-flex">
          <Button
            type="button"
            onClick={() => onReject(request)}
            disabled={disabled || !canApprove}
            variant="danger"
            size="small"
            className="border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
          >
            Reject
          </Button>
        </span>,
      )}
    </div>
  );
};

/* ─── Employee Group Card (accordion) ────────────────────────────── */

const EmployeeGroupCard = ({
  group,
  isExpanded,
  onToggle,
  selectedRequestIds,
  onSelectRequest,
  onSelectAll,
  onApprove,
  onReject,
  onApproveEmployee,
  onRejectEmployee,
  onBulkApproveSelected,
  onBulkRejectSelected,
  processingRequestIds,
  bulkProcessing,
  canApprove,
}) => {
  const pending = group.requests.filter((r) => getRequestStatus(r) === "PENDING");
  const approvedCount = group.requests.filter((r) => getRequestStatus(r) === "APPROVED").length;
  const rejectedCount = group.requests.filter((r) => getRequestStatus(r) === "REJECTED").length;

  const groupRequestIds = group.requests.map((r) => r.id);
  const groupSelectedCount = groupRequestIds.filter((id) => selectedRequestIds.has(id)).length;
  const allSelected = group.requests.length > 0 && groupSelectedCount === group.requests.length;
  const someSelected = groupSelectedCount > 0 && !allSelected;

  const pendingSelected = group.requests.filter(
    (r) => selectedRequestIds.has(r.id) && getRequestStatus(r) === "PENDING",
  );

  const initials =
    group.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join("") || "?";

  return (
    <div
      className={`overflow-hidden rounded-xl border shadow-sm transition-all duration-200 ${
        isExpanded ? "border-indigo-200" : "border-gray-200"
      }`}
    >
      {/* ── Card Header ── */}
      <div className={`transition-colors duration-200 ${isExpanded ? "bg-indigo-50/60" : "bg-white"}`}>
        <div className="flex items-center gap-3 px-4 py-3.5">

          {/* Avatar + name toggle */}
          <button
            type="button"
            onClick={onToggle}
            className="flex flex-1 min-w-0 items-center gap-3 text-left"
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-colors ${
                isExpanded ? "bg-indigo-600 text-white" : "bg-indigo-100 text-indigo-700"
              }`}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900">{group.name}</p>
              <p className="text-xs text-gray-400">
                {group.requests.length} request{group.requests.length !== 1 ? "s" : ""}
              </p>
            </div>
          </button>

          {/* Status counts — desktop */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            {pending.length > 0 && (
              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                {pending.length} pending
              </span>
            )}
            {approvedCount > 0 && (
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                {approvedCount} approved
              </span>
            )}
            {rejectedCount > 0 && (
              <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                {rejectedCount} rejected
              </span>
            )}
          </div>

          {/* Card-level quick actions (desktop) */}
          {pending.length > 0 && canApprove && !bulkProcessing && (
            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                variant="success"
                size="small"
                onClick={(e) => { e.stopPropagation(); onApproveEmployee(pending); }}
                className="border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs"
              >
                Approve All
              </Button>
              <Button
                type="button"
                variant="danger"
                size="small"
                onClick={(e) => { e.stopPropagation(); onRejectEmployee(group.name, pending); }}
                className="border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs"
              >
                Reject All
              </Button>
            </div>
          )}

          {/* Expand/collapse icon */}
          <button
            type="button"
            onClick={onToggle}
            className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            <ChevronDownIcon
              className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-0" : "-rotate-90"}`}
            />
          </button>
        </div>

        {/* Status counts + mobile quick actions */}
        <div className="flex lg:hidden items-center gap-2 px-4 pb-3 flex-wrap">
          {pending.length > 0 && (
            <span className="rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
              {pending.length} pending
            </span>
          )}
          {approvedCount > 0 && (
            <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              {approvedCount} approved
            </span>
          )}
          {rejectedCount > 0 && (
            <span className="rounded-full border border-rose-100 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
              {rejectedCount} rejected
            </span>
          )}
          {pending.length > 0 && canApprove && !bulkProcessing && (
            <div className="flex sm:hidden items-center gap-1.5 ml-auto">
              <Button
                type="button"
                variant="success"
                size="small"
                onClick={(e) => { e.stopPropagation(); onApproveEmployee(pending); }}
                className="border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs"
              >
                Approve All
              </Button>
              <Button
                type="button"
                variant="danger"
                size="small"
                onClick={(e) => { e.stopPropagation(); onRejectEmployee(group.name, pending); }}
                className="border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs"
              >
                Reject All
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Expanded content ── */}
      {isExpanded && (
        <div className="border-t border-indigo-100">

          {/* Bulk action bar — shown when pending items are selected */}
          {pendingSelected.length > 0 && canApprove && (
            <div className="flex flex-wrap items-center gap-2.5 border-b border-indigo-100 bg-indigo-50 px-4 py-2.5">
              <span className="text-xs font-semibold text-indigo-700">
                {pendingSelected.length} pending selected
              </span>
              <Button
                type="button"
                variant="success"
                size="small"
                onClick={() => onBulkApproveSelected(pendingSelected)}
                disabled={bulkProcessing}
                className="border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              >
                Bulk Approve
              </Button>
              <Button
                type="button"
                variant="danger"
                size="small"
                onClick={() => onBulkRejectSelected(pendingSelected)}
                disabled={bulkProcessing}
                className="border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
              >
                Bulk Reject
              </Button>
            </div>
          )}

          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="px-3 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected; }}
                      onChange={(e) => onSelectAll(groupRequestIds, e.target.checked)}
                      className="h-4 w-4 cursor-pointer rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  {["Category", "Skill", "Subskill", "Proficiency", "Status", "Requested", "Approved By", "Remarks", "Actions"].map((col) => (
                    <th
                      key={col}
                      scope="col"
                      className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {group.requests.map((request) => {
                  const isSelected = selectedRequestIds.has(request.id);
                  return (
                    <tr
                      key={request.id}
                      className={`transition-colors ${isSelected ? "bg-indigo-50/40" : "hover:bg-gray-50"}`}
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => onSelectRequest(request.id, e.target.checked)}
                          className="h-4 w-4 cursor-pointer rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-700">{request.categoryName || "--"}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-700">{request.skillName || "--"}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-700">{request.subskillName || "--"}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-700">{request.proficiency || "--"}</td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <RequestStatusBadge status={request.requestStatus} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-600">
                        {formatRequestDate(request.requestedAt)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-700">
                        {getApprovedByDisplay(request)}
                      </td>
                      <td className="min-w-[140px] px-3 py-3 text-sm text-gray-600">
                        {request.remarks || "--"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <RequestActions
                          request={request}
                          onApprove={onApprove}
                          onReject={onReject}
                          processingRequestIds={processingRequestIds}
                          bulkProcessing={bulkProcessing}
                          canApprove={canApprove}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 p-4 md:hidden">
            {group.requests.map((request) => {
              const isSelected = selectedRequestIds.has(request.id);
              return (
                <div
                  key={request.id}
                  className={`rounded-xl border p-4 shadow-sm transition-colors ${
                    isSelected ? "border-indigo-200 bg-indigo-50/30" : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => onSelectRequest(request.id, e.target.checked)}
                      className="mt-0.5 h-4 w-4 cursor-pointer rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex flex-1 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400">{request.categoryName || "--"}</p>
                        <p className="mt-0.5 text-sm font-semibold text-gray-900">{request.skillName || "--"}</p>
                        <p className="text-xs text-gray-500">Subskill: {request.subskillName || "--"}</p>
                      </div>
                      <RequestStatusBadge status={request.requestStatus} />
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="font-semibold uppercase tracking-wide text-gray-400">Proficiency</p>
                      <p className="mt-0.5 text-gray-800">{request.proficiency || "--"}</p>
                    </div>
                    <div>
                      <p className="font-semibold uppercase tracking-wide text-gray-400">Requested</p>
                      <p className="mt-0.5 text-gray-800">{formatRequestDate(request.requestedAt)}</p>
                    </div>
                    <div>
                      <p className="font-semibold uppercase tracking-wide text-gray-400">Approved By</p>
                      <p className="mt-0.5 text-gray-800">{getApprovedByDisplay(request)}</p>
                    </div>
                    <div>
                      <p className="font-semibold uppercase tracking-wide text-gray-400">Remarks</p>
                      <p className="mt-0.5 text-gray-800">{request.remarks || "--"}</p>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <RequestActions
                      request={request}
                      onApprove={onApprove}
                      onReject={onReject}
                      processingRequestIds={processingRequestIds}
                      bulkProcessing={bulkProcessing}
                      canApprove={canApprove}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Main component ──────────────────────────────────────────────── */

const ManageSkillTaxonomy = () => {
  const location = useLocation();
  const { hasRole } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [openSkillManagement, setOpenSkillManagement] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [expandedSkills, setExpandedSkills] = useState({});
  const [skillFilters, setSkillFilters] = useState({});
  const [subSkillFilters, setSubSkillFilters] = useState({});
  const [searchHydrating, setSearchHydrating] = useState(false);
  const [skillManagementDraft, setSkillManagementDraft] = useState(null);
  const [skillManagementDraftKey, setSkillManagementDraftKey] = useState("");
  const [downloadingTaxonomy, setDownloadingTaxonomy] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    type: null,
    category: null,
    skill: null,
    subSkill: null,
  });

  const [deleteLoading, setDeleteLoading] = useState(false);

  /* ── Requests state ── */
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsSearchTerm, setRequestsSearchTerm] = useState("");
  const [requestsPage, setRequestsPage] = useState(1);
  const [processingRequestIds, setProcessingRequestIds] = useState(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [rejectContext, setRejectContext] = useState(null); // { title, subtitle, queue[] }
  const [rejectRemarks, setRejectRemarks] = useState("");
  const [expandedEmployees, setExpandedEmployees] = useState(new Set());
  const [selectedRequestIds, setSelectedRequestIds] = useState(new Set());

  const activeTab = useMemo(
    () =>
      location.pathname.startsWith(
        "/employee-onboarding/manage-skill-taxonomy/requests",
      )
        ? "requests"
        : "taxonomy",
    [location.pathname],
  );

  const canApproveRequests = hasRole(["ADMIN"]);
  const approvedBy = "ADMIN";

  /* ── Taxonomy fetching (unchanged) ── */
  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const response = await skillService.getCategoryDtos();
      if (!response?.success) {
        throw new Error(response?.error || "Unable to load categories.");
      }

      setCategories(
        Array.isArray(response.data) ? response.data.map(mapCategoryDto) : [],
      );
      setExpandedCategories({});
      setExpandedSkills({});
      setSkillFilters({});
      setSubSkillFilters({});
    } catch (error) {
      notify.error(error, "Unable to load skill categories.");
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchRequests = async () => {
    setRequestsLoading(true);
    try {
      const response = await skillService.getSkillTaxonomyRequests();
      if (!response?.success) {
        throw new Error(response?.error || "Unable to load skill taxonomy requests.");
      }
      setRequests(Array.isArray(response.data) ? response.data : []);
      setRequestsPage(1);
    } catch (error) {
      notify.error(error, "Unable to load skill taxonomy requests.");
      setRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  };

  /* ── Single request approve ── */
  const handleApproveRequest = async (request) => {
    if (!request?.id || isRequestActionDisabled(request)) return;
    if (!canApproveRequests) {
      notify.error("Only admin can approve skill taxonomy requests.");
      return;
    }
    setProcessingRequestIds((prev) => new Set([...prev, request.id]));
    try {
      const response = await skillService.approveSkillRequest(request.id, approvedBy);
      notify.success(response?.message || "Skill taxonomy request approved successfully.");
      await fetchRequests();
    } catch (error) {
      notify.error(error, "Unable to approve skill taxonomy request.");
    } finally {
      setProcessingRequestIds((prev) => {
        const next = new Set(prev);
        next.delete(request.id);
        return next;
      });
    }
  };

  /* ── Single request reject (opens modal) ── */
  const openRejectRequest = (request) => {
    if (!request?.id || isRequestActionDisabled(request)) return;
    if (!canApproveRequests) {
      notify.error("Only admin can approve and reject skill taxonomy requests.");
      return;
    }
    setRejectContext({
      title: `Reject: ${request.skillName || "this request"}`,
      subtitle: `Add remarks for ${request.skillName || "this request"}.`,
      queue: [request],
    });
    setRejectRemarks("");
  };

  const closeRejectRequest = () => {
    setRejectContext(null);
    setRejectRemarks("");
  };

  /* ── Shared reject handler (single / bulk / employee-level) ── */
  const handleRejectRequest = async () => {
    const remarks = rejectRemarks.trim();
    if (!rejectContext?.queue?.length || !remarks) {
      notify.error("Please enter remarks before rejecting.");
      return;
    }
    setBulkProcessing(true);
    try {
      await Promise.all(
        rejectContext.queue.map((req) => skillService.rejectSkillRequest(req.id, remarks)),
      );
      notify.success(
        rejectContext.queue.length === 1
          ? "Skill taxonomy request rejected successfully."
          : `${rejectContext.queue.length} requests rejected successfully.`,
      );
      closeRejectRequest();
      setSelectedRequestIds(new Set());
      await fetchRequests();
    } catch (error) {
      notify.error(error, "Unable to reject skill taxonomy request.");
    } finally {
      setBulkProcessing(false);
    }
  };

  /* ── Employee-level approve all ── */
  const handleApproveEmployee = async (pendingRequests) => {
    if (!canApproveRequests) {
      notify.error("Only admin can approve skill taxonomy requests.");
      return;
    }
    if (!pendingRequests.length) return;
    setBulkProcessing(true);
    try {
      await Promise.all(
        pendingRequests.map((req) => skillService.approveSkillRequest(req.id, approvedBy)),
      );
      notify.success(
        `${pendingRequests.length} request${pendingRequests.length !== 1 ? "s" : ""} approved successfully.`,
      );
      await fetchRequests();
    } catch (error) {
      notify.error(error, "Unable to approve requests.");
    } finally {
      setBulkProcessing(false);
    }
  };

  /* ── Employee-level reject all (opens modal) ── */
  const handleRejectEmployee = (employeeName, pendingRequests) => {
    if (!canApproveRequests) {
      notify.error("Only admin can reject skill taxonomy requests.");
      return;
    }
    if (!pendingRequests.length) return;
    setRejectContext({
      title: `Reject All — ${employeeName}`,
      subtitle: `${pendingRequests.length} pending request${pendingRequests.length !== 1 ? "s" : ""} will be rejected with these remarks.`,
      queue: pendingRequests,
    });
    setRejectRemarks("");
  };

  /* ── Bulk approve selected ── */
  const handleBulkApproveSelected = async (pendingSelected) => {
    if (!canApproveRequests) {
      notify.error("Only admin can approve skill taxonomy requests.");
      return;
    }
    if (!pendingSelected.length) return;
    setBulkProcessing(true);
    try {
      await Promise.all(
        pendingSelected.map((req) => skillService.approveSkillRequest(req.id, approvedBy)),
      );
      notify.success(
        `${pendingSelected.length} request${pendingSelected.length !== 1 ? "s" : ""} approved successfully.`,
      );
      setSelectedRequestIds(new Set());
      await fetchRequests();
    } catch (error) {
      notify.error(error, "Unable to approve selected requests.");
    } finally {
      setBulkProcessing(false);
    }
  };

  /* ── Bulk reject selected (opens modal) ── */
  const handleBulkRejectSelected = (pendingSelected) => {
    if (!canApproveRequests) {
      notify.error("Only admin can reject skill taxonomy requests.");
      return;
    }
    if (!pendingSelected.length) return;
    setRejectContext({
      title: "Bulk Reject",
      subtitle: `${pendingSelected.length} pending request${pendingSelected.length !== 1 ? "s" : ""} will be rejected with these remarks.`,
      queue: pendingSelected,
    });
    setRejectRemarks("");
  };

  /* ── Checkbox handlers ── */
  const handleSelectRequest = (id, checked) => {
    setSelectedRequestIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const handleSelectAll = (ids, checked) => {
    setSelectedRequestIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });
  };

  const toggleEmployee = (key) => {
    setExpandedEmployees((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  useEffect(() => {
    if (activeTab === "taxonomy") {
      fetchCategories();
    } else {
      fetchRequests();
    }
  }, [activeTab]);

  useEffect(() => {
    if (
      activeTab !== "taxonomy" ||
      !searchTerm.trim() ||
      categories.length === 0
    )
      return;

    let cancelled = false;

    const hydrateTaxonomyForSearch = async () => {
      const categoriesNeedingSkills = categories.filter(
        (category) => !category.skillsLoaded && !category.skillsLoading,
      );

      if (categoriesNeedingSkills.length === 0) {
        const skillsNeedingSubSkills = categories.flatMap((category) =>
          (category.skills || [])
            .filter(
              (skill) => !skill.subSkillsLoaded && !skill.subSkillsLoading,
            )
            .map((skill) => ({ categoryId: category.id, skill })),
        );
        if (skillsNeedingSubSkills.length === 0) return;
      }

      setSearchHydrating(true);

      try {
        const categoriesWithSkills = await Promise.all(
          categories.map(async (category) => {
            if (category.skillsLoaded) return category;
            try {
              const response = await skillService.getSkillsByCategoryDto(
                category.id,
              );
              if (!response?.success) {
                throw new Error(response?.error || "Unable to load skills.");
              }

              return {
                ...category,
                skills: Array.isArray(response.data)
                  ? response.data.map(mapSkillDto)
                  : [],
                skillsLoaded: true,
                skillsLoading: false,
              };
            } catch (error) {
              notify.error(
                error,
                `Unable to load skills for ${category.name}.`,
              );
              return {
                ...category,
                skillsLoading: false,
              };
            }
          }),
        );

        const fullyHydratedCategories = await Promise.all(
          categoriesWithSkills.map(async (category) => {
            const nextSkills = await Promise.all(
              (category.skills || []).map(async (skill) => {
                if (skill.subSkillsLoaded) return skill;
                try {
                  const response = await skillService.getSubSkillsBySkillDto(
                    skill.id,
                  );
                  if (!response?.success) {
                    throw new Error(
                      response?.error || "Unable to load subskills.",
                    );
                  }

                  return {
                    ...skill,
                    subSkills: Array.isArray(response.data)
                      ? response.data.map(mapSubSkillDto)
                      : [],
                    subSkillsLoaded: true,
                    subSkillsLoading: false,
                  };
                } catch (error) {
                  notify.error(
                    error,
                    `Unable to load subskills for ${skill.name}.`,
                  );
                  return {
                    ...skill,
                    subSkillsLoading: false,
                  };
                }
              }),
            );
            return { ...category, skills: nextSkills };
          }),
        );

        if (!cancelled) setCategories(fullyHydratedCategories);
      } finally {
        if (!cancelled) setSearchHydrating(false);
      }
    };

    hydrateTaxonomyForSearch();
    return () => { cancelled = true; };
  }, [activeTab, categories, searchTerm]);

  const updateCategory = (categoryId, updater) => {
    setCategories((current) =>
      current.map((category) =>
        String(category.id) === String(categoryId)
          ? updater(category)
          : category,
      ),
    );
  };

  const updateSkill = (categoryId, skillId, updater) => {
    updateCategory(categoryId, (category) => ({
      ...category,
      skills: category.skills.map((skill) =>
        String(skill.id) === String(skillId) ? updater(skill) : skill,
      ),
    }));
  };

  const handleCategoryToggle = async (category) => {
    const willExpand = !expandedCategories[category.id];
    setExpandedCategories(willExpand ? { [category.id]: true } : {});
    setExpandedSkills({});
    if (!willExpand || category.skillsLoaded || category.skillsLoading) return;

    updateCategory(category.id, (c) => ({ ...c, skillsLoading: true }));
    try {
      const response = await skillService.getSkillsByCategoryDto(category.id);
      if (!response?.success) {
        throw new Error(response?.error || "Unable to load skills.");
      }

      updateCategory(category.id, (currentCategory) => ({
        ...currentCategory,
        skills: Array.isArray(response.data)
          ? response.data.map(mapSkillDto)
          : [],
        skillsLoaded: true,
        skillsLoading: false,
      }));
    } catch (error) {
      notify.error(error, `Unable to load skills for ${category.name}.`);
      updateCategory(category.id, (c) => ({ ...c, skillsLoading: false }));
    }
  };

  const handleSkillToggle = async (categoryId, skill) => {
    const skillKey = `${categoryId}-${skill.id}`;
    const willExpand = !expandedSkills[skillKey];
    setExpandedSkills(willExpand ? { [skillKey]: true } : {});
    if (!willExpand || skill.subSkillsLoaded || skill.subSkillsLoading) return;

    updateSkill(categoryId, skill.id, (s) => ({ ...s, subSkillsLoading: true }));
    try {
      const response = await skillService.getSubSkillsBySkillDto(skill.id);
      if (!response?.success) {
        throw new Error(response?.error || "Unable to load subskills.");
      }

      updateSkill(categoryId, skill.id, (currentSkill) => ({
        ...currentSkill,
        subSkills: Array.isArray(response.data)
          ? response.data.map(mapSubSkillDto)
          : [],
        subSkillsLoaded: true,
        subSkillsLoading: false,
      }));
    } catch (error) {
      notify.error(error, `Unable to load subskills for ${skill.name}.`);
      updateSkill(categoryId, skill.id, (s) => ({ ...s, subSkillsLoading: false }));
    }
  };

  const fetchSkillDtos = async (categoryId) => {
    const response = await skillService.getSkillsByCategoryDto(categoryId);
    if (!response?.success) throw new Error(response?.error || "Unable to load skills.");
    return Array.isArray(response.data) ? response.data.map(mapSkillDto) : [];
  };

  const fetchSubSkillDtos = async (skillId) => {
    const response = await skillService.getSubSkillsBySkillDto(skillId);
    if (!response?.success) {
      throw new Error(response?.error || "Unable to load subskills.");
    }
    return Array.isArray(response.data)
      ? response.data.map(mapSubSkillDto)
      : [];
  };

  const ensureCategoryHydrated = async (category) => {
    let nextCategory = category;
    if (!nextCategory.skillsLoaded) {
      const nextSkills = await fetchSkillDtos(nextCategory.id);
      nextCategory = { ...nextCategory, skills: nextSkills, skillsLoaded: true, skillsLoading: false };
    }
    const nextSkills = await Promise.all(
      (nextCategory.skills || []).map(async (skill) => {
        if (skill.subSkillsLoaded) return skill;
        const subSkills = await fetchSubSkillDtos(skill.id);
        return { ...skill, subSkills, subSkillsLoaded: true, subSkillsLoading: false };
      }),
    );
    const hydratedCategory = { ...nextCategory, skills: nextSkills };
    setCategories((current) =>
      current.map((item) =>
        String(item.id) === String(category.id) ? hydratedCategory : item,
      ),
    );
    return hydratedCategory;
  };

  const openDraftEditor = (draft) => {
    setSkillManagementDraft(draft);
    setSkillManagementDraftKey(
      `${draft.scope}-${draft.categoryId || "new"}-${Date.now()}`,
    );
    setOpenSkillManagement(true);
  };

  const handleEditCategory = async (category) => {
    if (!category.active) return;

    try {
      const hydratedCategory = await ensureCategoryHydrated(category);
      openDraftEditor({
        scope: "category",
        categoryId: hydratedCategory.id,
        categoryName: hydratedCategory.name,
        isCategoryActive: hydratedCategory.active,
        skills: hydratedCategory.skills.map((skill) => ({
          ...skill,
          isActive: skill.active,
          subSkills: (skill.subSkills || []).map((subSkill) => ({
            ...subSkill,
            isActive: subSkill.active,
          })),
        })),
      });
    } catch (error) {
      notify.error(error, `Unable to prepare ${category.name} for editing.`);
    }
  };

  const handleEditSkill = async (category, skill) => {
    if (!skill.active) return;

    try {
      const hydratedCategory = await ensureCategoryHydrated(category);
      const matchedSkill = hydratedCategory.skills.find(
        (item) => String(item.id) === String(skill.id),
      );
      if (!matchedSkill) throw new Error("Unable to locate the selected skill.");
      openDraftEditor({
        scope: "skill",
        categoryId: hydratedCategory.id,
        categoryName: hydratedCategory.name,
        isCategoryActive: hydratedCategory.active,
        skills: [
          {
            ...matchedSkill,
            isActive: matchedSkill.active,
            subSkills: (matchedSkill.subSkills || []).map((subSkill) => ({
              ...subSkill,
              isActive: subSkill.active,
            })),
          },
        ],
      });
    } catch (error) {
      notify.error(error, `Unable to prepare ${skill.name} for editing.`);
    }
  };

  const handleDownloadTaxonomy = async () => {
    try {
      setDownloadingTaxonomy(true);

      const blob = await skillService.downloadSkillTaxonomyExcel();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "skill-taxonomy.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      notify.success("Skill taxonomy downloaded successfully.");
    } catch (error) {
      notify.error(error, "Failed to download taxonomy.");
    } finally {
      setDownloadingTaxonomy(false);
    }
  };

  const handleDeleteCategory = (category) => {
    if (!category.active) return;

    setDeleteModal({
      open: true,
      type: "category",
      category,
      skill: null,
      subSkill: null,
    });
  };

  const handleDeleteSkill = (category, skill) => {
    if (!skill.active) return;

    setDeleteModal({
      open: true,
      type: "skill",
      category,
      skill,
      subSkill: null,
    });
  };

  const handleDeleteSubSkill = (category, skill, subSkill) => {
    if (!subSkill.active) return;

    setDeleteModal({
      open: true,
      type: "subskill",
      category,
      skill,
      subSkill,
    });
  };

  const throwIfDeleteFailed = (response, fallbackMessage) => {
    if (response?.success === false) {
      throw response;
    }

    if (!response?.success) {
      throw new Error(fallbackMessage);
    }
  };

  const deleteCategoryWithChildren = async (category) => {
    const hydratedCategory = await ensureCategoryHydrated(category);

    for (const skill of hydratedCategory.skills || []) {
      for (const subSkill of skill.subSkills || []) {
        if (!subSkill.active) continue;

        const subSkillResponse = await skillService.deleteSubSkill(subSkill.id);
        throwIfDeleteFailed(
          subSkillResponse,
          `Subskill "${subSkill.name}" deletion failed.`,
        );
      }

      if (!skill.active) continue;

      const skillResponse = await skillService.deleteTaxonomySkill(skill.id);
      throwIfDeleteFailed(
        skillResponse,
        `Skill "${skill.name}" deletion failed.`,
      );
    }

    const categoryResponse = await skillService.deleteCategory(category.id);
    throwIfDeleteFailed(categoryResponse, "Category deletion failed.");

    return categoryResponse;
  };

  const confirmDelete = async () => {
    try {
      setDeleteLoading(true);

      // ==========================================
      // DELETE CATEGORY
      // ==========================================

      if (deleteModal.type === "category") {
        const response = await deleteCategoryWithChildren(deleteModal.category);

        setCategories((current) =>
          current.filter(
            (category) => String(category.id) !== String(deleteModal.category.id),
          ),
        );
        setExpandedCategories((current) => {
          const next = { ...current };
          delete next[deleteModal.category.id];
          return next;
        });
        setSkillFilters((current) => {
          const next = { ...current };
          delete next[deleteModal.category.id];
          return next;
        });

        notify.success(response?.message || "Category deleted successfully.");
      }

      // ==========================================
      // DELETE SKILL
      // ==========================================

      if (deleteModal.type === "skill") {
        const response = await skillService.deleteTaxonomySkill(
          deleteModal.skill.id,
        );

        throwIfDeleteFailed(response, "Skill deletion failed.");

        setCategories((current) =>
          current.map((c) =>
            String(c.id) === String(deleteModal.category.id)
              ? {
                  ...c,
                  skills: (c.skills || []).map(
                    (s) =>
                      String(s.id) === String(deleteModal.skill.id)
                        ? { ...s, active: false }
                        : s,
                  ),
                }
              : c,
          ),
        );

        notify.success(response?.message || "Skill deleted successfully.");
      }

      // ==========================================
      // DELETE SUBSKILL
      // ==========================================

      if (deleteModal.type === "subskill") {
        const response = await skillService.deleteSubSkill(
          deleteModal.subSkill.id,
        );

        throwIfDeleteFailed(response, "Subskill deletion failed.");

        setCategories((current) =>
          current.map((c) =>
            String(c.id) === String(deleteModal.category.id)
              ? {
                  ...c,
                  skills: (c.skills || []).map((s) =>
                    String(s.id) === String(deleteModal.skill.id)
                      ? {
                          ...s,
                          subSkills: (s.subSkills || []).map(
                            (ss) =>
                              String(ss.id) === String(deleteModal.subSkill.id)
                                ? { ...ss, active: false }
                                : ss,
                          ),
                        }
                      : s,
                  ),
                }
              : c,
          ),
        );

        notify.success(response?.message || "Subskill deleted successfully.");
      }

      // ==========================================
      // CLOSE MODAL
      // ==========================================

      setDeleteModal({
        open: false,
        type: null,
        category: null,
        skill: null,
        subSkill: null,
      });
    } catch (error) {
      notify.error(error, "Unable to delete.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEditSubSkill = async (category, skill, subSkill) => {
    if (!subSkill.active) return;

    try {
      const hydratedCategory = await ensureCategoryHydrated(category);
      const matchedSkill = hydratedCategory.skills.find(
        (item) => String(item.id) === String(skill.id),
      );
      const matchedSubSkill = matchedSkill?.subSkills?.find(
        (item) => String(item.id) === String(subSkill.id),
      );
      if (!matchedSkill || !matchedSubSkill) throw new Error("Unable to locate the selected subskill.");
      openDraftEditor({
        scope: "subskill",
        categoryId: hydratedCategory.id,
        categoryName: hydratedCategory.name,
        isCategoryActive: hydratedCategory.active,
        skills: [
          {
            ...matchedSkill,
            isActive: matchedSkill.active,
            subSkills: [{ ...matchedSubSkill, isActive: matchedSubSkill.active }],
          },
        ],
      });
    } catch (error) {
      notify.error(error, `Unable to prepare ${subSkill.name} for editing.`);
    }
  };

  // const handleTrashClick = (label) => {
  //   notify.info(
  //     `Trash UI is ready for ${label}. Delete endpoint will be wired later.`,
  //   );
  // };

  const filteredCategories = useMemo(() => {
    const query = normalize(searchTerm);
    if (!query) return categories;
    return categories.filter((category) => {
      const categoryMatch = `${category.name} ${category.description}`
        .toLowerCase()
        .includes(query);
      const skillMatch = category.skills.some((skill) => {
        const subSkillMatch = skill.subSkills.some((subSkill) =>
          `${subSkill.name} ${subSkill.description}`
            .toLowerCase()
            .includes(query),
        );
        return (
          `${skill.name} ${skill.description}`.toLowerCase().includes(query) ||
          subSkillMatch
        );
      });
      return categoryMatch || skillMatch;
    });
  }, [categories, searchTerm]);

  const filteredRequests = useMemo(() => {
    const query = normalize(requestsSearchTerm);
    if (!query) return requests;
    return requests.filter((request) =>
      [request.resourceName, request.employeeName, request.categoryName, request.skillName, request.subskillName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [requests, requestsSearchTerm]);

  const groupedRequests = useMemo(() => {
    const map = new Map();
    filteredRequests.forEach((request) => {
      const employeeKey = request.resourceId
        ? `id:${request.resourceId}`
        : request.resourceName || request.employeeName || "Unknown";
      const displayName = request.resourceName || request.employeeName || "Unknown";
      if (!map.has(employeeKey)) {
        map.set(employeeKey, { key: employeeKey, name: displayName, requests: [] });
      }
      map.get(employeeKey).requests.push(request);
    });
    return Array.from(map.values());
  }, [filteredRequests]);

  const groupsPageCount = useMemo(
    () => Math.max(1, Math.ceil(groupedRequests.length / REQUESTS_PAGE_SIZE)),
    [groupedRequests.length],
  );

  const paginatedGroups = useMemo(() => {
    const start = (requestsPage - 1) * REQUESTS_PAGE_SIZE;
    return groupedRequests.slice(start, start + REQUESTS_PAGE_SIZE);
  }, [groupedRequests, requestsPage]);

  useEffect(() => {
    setRequestsPage(1);
    setSelectedRequestIds(new Set());
  }, [requestsSearchTerm]);

  useEffect(() => {
    if (requestsPage > groupsPageCount) {
      setRequestsPage(groupsPageCount);
    }
  }, [requestsPage, groupsPageCount]);

  const handleSkillManagementClose = () => {
    setOpenSkillManagement(false);
    setSkillManagementDraft(null);
    setSkillManagementDraftKey("");
    fetchCategories();
  };

  /* ─── Render ────────────────────────────────────────────────────── */

  const deleteModalTitle =
    {
      category: "Delete Category",
      skill: "Delete Skill",
      subskill: "Delete SubSkill",
    }[deleteModal.type] || "Delete";

  const deleteModalMessage =
    deleteModal.type === "category"
      ? `Are you sure you want to delete category "${deleteModal.category?.name}"?`
      : deleteModal.type === "skill"
        ? `Are you sure you want to delete skill "${deleteModal.skill?.name}"?`
        : `Are you sure you want to delete subskill "${deleteModal.subSkill?.name}"?`;

  return (
    <div className="space-y-5 p-6">
      {/* Page header */}
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-2 border-b border-gray-200 pb-4">

          {/* Top Section */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

            {/* Left Content */}
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
                Manage Skill Taxonomy
              </h1>
            </div>

            {/* Right Actions */}
            {activeTab === "taxonomy" ? (
              <div className="flex w-full shrink-0 flex-col gap-2.5 sm:flex-row lg:w-auto lg:items-center lg:justify-end">
                <div className="relative flex-1 sm:w-80 lg:w-96">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search skill taxonomy..."
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-9 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:shadow-sm"
                  />
                  {searchTerm && (
                    <Button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      aria-label="Clear search"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2.5 top-1/2 h-6 w-6 -translate-y-1/2 p-0 text-gray-400 shadow-none hover:text-gray-600"
                    >
                      <CloseIcon className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <Button
                  variant="primary"
                  size="medium"
                  onClick={() => setOpenSkillManagement(true)}
                  className="h-11 px-5"
                >
                  <JobIcon className="h-4 w-4" />
                  Skill Management
                </Button>
              </div>
            ) : (
              <div className="relative w-full shrink-0 sm:w-80 lg:w-96">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={requestsSearchTerm}
                  onChange={(e) => setRequestsSearchTerm(e.target.value)}
                  placeholder="Search requests..."
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-9 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:shadow-sm"
                />
                {requestsSearchTerm && (
                  <Button
                    type="button"
                    onClick={() => setRequestsSearchTerm("")}
                    aria-label="Clear request search"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2.5 top-1/2 h-6 w-6 -translate-y-1/2 p-0 text-gray-400 shadow-none hover:text-gray-600"
                  >
                    <CloseIcon className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <p className="max-w-3xl text-sm leading-relaxed text-gray-500">
            {tabDescriptions[activeTab]}
          </p>
        </div>

        {/* Search hydrating notice */}
        {searchHydrating && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-2.5 text-sm text-indigo-700">
            <LoadingSpinner text="Loading skills and subskills for deeper search results..." size="sm" />
          </div>
        )}
      </div>

      {/* ── Taxonomy tab ── */}
      {activeTab === "taxonomy" ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {!loadingCategories && !searchHydrating && searchTerm && (
            <div className="border-b border-gray-100 bg-gray-50 px-5 py-2.5">
              <span className="text-xs text-gray-500">
                {filteredCategories.length === 0
                  ? "No results found"
                  : `${filteredCategories.length} categor${filteredCategories.length === 1 ? "y" : "ies"} matched`}
              </span>
            </div>
          )}

          {loadingCategories ? (
            <LoadingSpinner text="Loading skill categories..." size="md" />
          ) : filteredCategories.length === 0 ? (
            <div className="p-10">
              <EmptyPane
                message={
                  searchTerm
                    ? "No skill taxonomy data matched your search."
                    : "No skill taxonomy data found."
                }
              />
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredCategories.map((category) => {
                const categoryExpanded = Boolean(
                  expandedCategories[category.id],
                );

                return (
                  <div
                    key={category.id}
                    className={`bg-white transition-colors ${
                      categoryExpanded ? "border-l-2 border-l-indigo-400" : "border-l-2 border-l-transparent"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleCategoryToggle(category)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-gray-50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="shrink-0 text-gray-400">
                          {categoryExpanded ? (
                            <ChevronDownIcon className="h-4 w-4" />
                          ) : (
                            <ChevronRightIcon className="h-4 w-4" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {category.name}
                          </p>
                          {category.description && (
                            <p className="mt-0.5 truncate text-xs text-gray-500">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <ActionButton
                          onClick={(e) => { e.stopPropagation(); handleEditCategory(category); }}
                          icon={EditIcon}
                          variant="edit"
                          label={`Edit ${category.name}`}
                          disabled={!category.active}
                        />
                        <ActionButton
                          onClick={(e) => { e.stopPropagation(); handleDeleteCategory(category); }}
                          icon={DeleteIcon}
                          variant="delete"
                          label={`Delete ${category.name}`}
                          disabled={!category.active}
                        />
                        <GlobalStatusBadge label={category.active ? "Active" : "Inactive"} size="sm" />
                      </div>
                    </button>

                    {categoryExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50/70 px-5 pb-4 pt-3">
                        {category.skillsLoading ? (
                          <InlineSpinner message="Loading skills…" />
                        ) : category.skills.length === 0 ? (
                          <EmptyPane message="No skills mapped under this category." />
                        ) : (
                          <div className="space-y-3">
                            <SearchInput
                              value={skillFilters[category.id] || ""}
                              onChange={(e) =>
                                setSkillFilters((current) => ({
                                  ...current,
                                  [category.id]: e.target.value,
                                }))
                              }
                              placeholder="Search skills in this category…"
                              onClear={() =>
                                setSkillFilters((current) => ({
                                  ...current,
                                  [category.id]: "",
                                }))
                              }
                            />

                            {(() => {
                              const filteredSkills = category.skills.filter((skill) => {
                                const query = normalize(
                                  skillFilters[category.id],
                                );
                                if (!query) return true;
                                if (`${skill.name} ${skill.description}`
                                    .toLowerCase()
                                    .includes(query)) return true;
                                return skill.subSkills.some((sub) =>
                                  `${sub.name} ${sub.description}`.toLowerCase().includes(query),
                                );
                              });

                              if (filteredSkills.length === 0) {
                                return <EmptyPane message="No skills or subskills matched this search." />;
                              }

                              return filteredSkills.map((skill) => {
                                  const skillKey = `${category.id}-${skill.id}`;
                                  const skillExpanded = Boolean(
                                  expandedSkills[skillKey],
                                );

                                return (
                                  <div
                                    key={skill.id}
                                    className={`overflow-hidden rounded-lg border bg-white transition-colors ${
                                      skillExpanded
                                        ? "border-indigo-100"
                                        : "border-gray-200 hover:border-gray-300"
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleSkillToggle(category.id, skill)}
                                      className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-gray-50"
                                    >
                                      <div className="flex min-w-0 items-center gap-3">
                                        <span className="shrink-0 text-gray-400">
                                          {skillExpanded ? (
                                            <ChevronDownIcon className="h-3.5 w-3.5" />
                                          ) : (
                                            <ChevronRightIcon className="h-3.5 w-3.5" />
                                          )}
                                        </span>
                                        <div className="min-w-0">
                                          <p className="truncate text-sm font-medium text-gray-800">
                                            {skill.name}
                                          </p>
                                          {skill.description && (
                                            <p className="mt-0.5 truncate text-xs text-gray-500">
                                              {skill.description}
                                            </p>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex shrink-0 items-center gap-1.5">
                                        <ActionButton
                                          onClick={(e) => { e.stopPropagation(); handleEditSkill(category, skill); }}
                                          icon={EditIcon}
                                          variant="edit"
                                          label={`Edit ${skill.name}`}
                                          disabled={!skill.active}
                                        />
                                        <ActionButton
                                          onClick={(e) => { e.stopPropagation(); handleDeleteSkill(category, skill); }}
                                          icon={DeleteIcon}
                                          variant="delete"
                                          label={`Delete ${skill.name}`}
                                          disabled={!skill.active}
                                        />
                                        <GlobalStatusBadge label={skill.active ? "Active" : "Inactive"} size="sm" />
                                      </div>
                                    </button>

                                    {skillExpanded && (
                                      <div className="border-t border-gray-100 bg-gray-50/60 px-4 pb-3 pt-2.5">
                                        {skill.subSkillsLoading ? (
                                          <InlineSpinner message="Loading subskills…" />
                                        ) : skill.subSkills.length === 0 ? (
                                          <EmptyPane message="No subskills mapped under this skill." />
                                        ) : (
                                          <div className="space-y-2">
                                            <SearchInput
                                              value={subSkillFilters[skillKey] || ""}
                                              onChange={(e) =>
                                                setSubSkillFilters((current) => ({
                                                  ...current,
                                                  [skillKey]: e.target.value,
                                                }))
                                              }
                                              placeholder="Search subskills…"
                                              onClear={() =>
                                                setSubSkillFilters((current) => ({
                                                  ...current,
                                                  [skillKey]: "",
                                                }))
                                              }
                                            />

                                            {(() => {
                                              const query = normalize(subSkillFilters[skillKey]);
                                              const filteredSubs = query
                                                ? skill.subSkills.filter((sub) =>
                                                    `${sub.name} ${sub.description}`.toLowerCase().includes(query)
                                                  )
                                                : skill.subSkills;

                                              if (filteredSubs.length === 0) {
                                                return (
                                                  <p className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-4 text-center text-sm text-gray-400">
                                                    No subskills match this search.
                                                  </p>
                                                );
                                              }

                                              return filteredSubs.map((subSkill) => (
                                                <div
                                                  key={subSkill.id}
                                                  className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white px-3 py-2.5"
                                                >
                                                  <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium text-gray-800">
                                                      {subSkill.name}
                                                    </p>
                                                    <p className="mt-1 truncate text-xs text-gray-500">
                                                      {subSkill.description || "No description available"}
                                                    </p>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <ActionButton
                                                      onClick={() =>
                                                        handleEditSubSkill(
                                                          category,
                                                          skill,
                                                          subSkill,
                                                        )
                                                      }
                                                      icon={EditIcon}
                                                      variant="edit"
                                                      label={`Edit ${subSkill.name}`}
                                                      disabled={!subSkill.active}
                                                    />
                                                    <ActionButton
                                                      onClick={() =>
                                                        handleDeleteSubSkill(
                                                          category,
                                                          skill,
                                                          subSkill,
                                                        )
                                                      }
                                                      icon={DeleteIcon}
                                                      variant="delete"
                                                      label={`Delete ${subSkill.name}`}
                                                      disabled={!subSkill.active}
                                                    />
                                                    <GlobalStatusBadge
                                                      label={subSkill.active ? "Active" : "Inactive"}
                                                      size="sm"
                                                    />
                                                  </div>
                                                </div>
                                              ));
                                            })()}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      ) : (
        /* ── Requests tab ── */
        <div className="space-y-3">
          {/* Summary bar */}
          {!requestsLoading && (
            <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-gray-500">
                {requestsSearchTerm
                  ? `${groupedRequests.length} employee${groupedRequests.length !== 1 ? "s" : ""} matched (${filteredRequests.length} request${filteredRequests.length !== 1 ? "s" : ""})`
                  : `${groupedRequests.length} employee${groupedRequests.length !== 1 ? "s" : ""} · ${requests.length} total request${requests.length !== 1 ? "s" : ""}`}
              </span>
              {groupedRequests.length > 0 && (
                <span className="text-xs text-gray-400">
                  Page {requestsPage} of {groupsPageCount}
                </span>
              )}
            </div>
          )}

          {requestsLoading ? (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <LoadingSpinner text="Loading skill taxonomy requests..." size="md" />
            </div>
          ) : groupedRequests.length === 0 ? (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-10 shadow-sm">
              <EmptyPane
                message={
                  requestsSearchTerm
                    ? "No skill taxonomy requests matched your search."
                    : "No skill taxonomy requests found."
                }
              />
            </div>
          ) : (
            <>
              {/* Employee group cards */}
              <div className="space-y-3">
                {paginatedGroups.map((group) => (
                  <EmployeeGroupCard
                    key={group.key}
                    group={group}
                    isExpanded={expandedEmployees.has(group.key)}
                    onToggle={() => toggleEmployee(group.key)}
                    selectedRequestIds={selectedRequestIds}
                    onSelectRequest={handleSelectRequest}
                    onSelectAll={handleSelectAll}
                    onApprove={handleApproveRequest}
                    onReject={openRejectRequest}
                    onApproveEmployee={handleApproveEmployee}
                    onRejectEmployee={handleRejectEmployee}
                    onBulkApproveSelected={handleBulkApproveSelected}
                    onBulkRejectSelected={handleBulkRejectSelected}
                    processingRequestIds={processingRequestIds}
                    bulkProcessing={bulkProcessing}
                    canApprove={canApproveRequests}
                  />
                ))}
              </div>

              {/* Pagination */}
              <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-5 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-gray-500">
                  Showing employees {(requestsPage - 1) * REQUESTS_PAGE_SIZE + 1}
                  {" – "}
                  {Math.min(requestsPage * REQUESTS_PAGE_SIZE, groupedRequests.length)}
                  {" of "}
                  {groupedRequests.length}
                </p>
                <Pagination
                  currentPage={requestsPage}
                  totalPages={groupsPageCount}
                  onPrevious={() => setRequestsPage((p) => Math.max(1, p - 1))}
                  onNext={() => setRequestsPage((p) => Math.min(groupsPageCount, p + 1))}
                  className="justify-end py-0"
                />
              </div>
            </>
          )}
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteModal.open}
        title={deleteModalTitle}
        message={deleteModalMessage}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteLoading}
        onCancel={() =>
          setDeleteModal({
            open: false,
            type: null,
            category: null,
            skill: null,
            subSkill: null,
          })
        }
        onConfirm={confirmDelete}
      />

      <SkillManagementModal
        open={openSkillManagement}
        onClose={handleSkillManagementClose}
        initialDraft={skillManagementDraft}
        initialDraftKey={skillManagementDraftKey}
      />

      {/* Shared reject modal (single / employee-level / bulk) */}
      <Modal
        isOpen={Boolean(rejectContext)}
        onClose={closeRejectRequest}
        title={rejectContext?.title || "Reject Skill Request"}
        subtitle={rejectContext?.subtitle || ""}
        size="md"
        zIndex="z-[1300]"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="small"
              onClick={closeRejectRequest}
              disabled={bulkProcessing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="small"
              onClick={handleRejectRequest}
              loading={bulkProcessing}
              loadingText="Rejecting..."
              disabled={!rejectRemarks.trim() || bulkProcessing}
            >
              {rejectContext?.queue?.length > 1
                ? `Reject ${rejectContext.queue.length} Requests`
                : "Reject Request"}
            </Button>
          </div>
        }
      >
        <FormTextArea
          label="Remarks"
          name="rejectRemarks"
          value={rejectRemarks}
          onChange={(event) => setRejectRemarks(event.target.value)}
          rows={4}
          placeholder="Skill already exists under a different category"
          disabled={bulkProcessing}
        />
      </Modal>
    </div>
  );
};

export default ManageSkillTaxonomy;
