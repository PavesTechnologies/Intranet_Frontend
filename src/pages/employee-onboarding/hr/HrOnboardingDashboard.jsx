"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, FileText, ShieldCheck, CheckCircle2, XCircle, MailCheck, Clock, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { showStatusToast } from "../../../components/toastfy/toast";
import Button from "../../../components/Button/Button";
import Table from "../../../components/Table/table";
import Pagination from "../../../components/Pagination/pagination";
import EmployeeCreateModal from "../components/employee-create-modal/EmployeeCreateModal";
import {
  getNormalizedStatus,
  getOfferDisplayStatus,
  isTrackedOnboardingStatus,
  OFFER_STATUS,
  persistJoiningStatus,
} from "../components/offerStatus";
import { fetchOfferDetailsList } from "../components/fetchOfferDetails";
import { PAGE_SIZE } from "./constants";
import ActionMenu from "./components/ActionMenu";
import JoinModal from "./components/JoinModal";
import OfferStatusCell from "./components/OfferStatusCell";
import ReassignJoiningModal from "./components/ReassignJoiningModal";
import FilterListbox from "../../../components/filter/FilterListbox";
import GroupedKPISection from "../components/GroupedKPISection";

const HR_CATEGORY_GROUPS = [
  {
    key: "EmployeeOnboarding",
    title: "Employee Onboarding",
    statusDefs: [
      { status: "SUBMITTED", label: "Submitted",  icon: FileText,    iconBg: "bg-blue-50",    iconColor: "text-blue-600"    },
      { status: "VERIFIED",  label: "Verified",   icon: ShieldCheck, iconBg: "bg-green-50",   iconColor: "text-green-600"   },
      { status: "COMPLETED", label: "Completed",  icon: CheckCircle2,iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
      { status: "REJECTED",  label: "Rejected",   icon: XCircle,     iconBg: "bg-red-50",     iconColor: "text-red-600"     },
    ],
  },
  {
    key: "JoiningProcess",
    title: "Joining Process",
    statusDefs: [
      { status: "JOINING",         label: "Joining",         icon: MailCheck,  iconBg: "bg-teal-50",   iconColor: "text-teal-600"   },
      { status: "JOINING_PENDING", label: "Joining Pending", icon: Clock,      iconBg: "bg-amber-50",  iconColor: "text-amber-600"  },
      { status: "RESCHEDULED",     label: "Rescheduled",     icon: RefreshCw,  iconBg: "bg-orange-50", iconColor: "text-orange-600" },
    ],
  },
];

export default function HrOnboardingDashboard() {
  const navigate = useNavigate();
  const BASE_URL = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;

  const [data, setData] = useState([]);
  const [employeeUserIds, setEmployeeUserIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [bulkJoinMode, setBulkJoinMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewingJoinLetter, setPreviewingJoinLetter] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [loadingEditDetails, setLoadingEditDetails] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editDisabledUserIds, setEditDisabledUserIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [managerOptions, setManagerOptions] = useState([]);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [joiningCommentsByUser, setJoiningCommentsByUser] = useState({});
  const [loadingStatusCommentUserId, setLoadingStatusCommentUserId] = useState(null);

  const [joinForm, setJoinForm] = useState({
    joining_date: "",
    reporting_time: "",
    location: "",
    department: "",
    reporting_manager: "",
    custom_message: "",
  });

  const [editJoinForm, setEditJoinForm] = useState({
    joining_date: "",
    reporting_time: "",
    location: "",
    department: "",
    reporting_manager: "",
    joining_comments: "",
  });

  const getManagerDisplayName = (manager) =>
    `${manager.first_name || ""} ${manager.last_name || ""}`.trim();

  const getManagerPayloadValue = (manager) =>
    String(manager.employee_id || manager.user_uuid || manager.uuid || "").trim();

  const resolveReportingManager = (value) => {
    const normalizedValue = String(value || "").trim();
    if (!normalizedValue) return "";

    const manager = managerOptions.find((option) => {
      const optionValue = String(option.value || "").trim();
      const optionLabel = String(option.label || "").trim();
      const optionName = String(option.name || "").trim();

      return (
        optionValue === normalizedValue ||
        optionLabel === normalizedValue ||
        optionName === normalizedValue
      );
    });

    return manager?.value || normalizedValue;
  };

  const handleKpiClick = (status) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const offers = await fetchOfferDetailsList(BASE_URL, localStorage.getItem("token"));
      setData(offers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCoreEmployees = async () => {
    try {
      const res = await axios.get(
        `${BASE_URL}/permanent-employee/core-employee-details/`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      const ids = (res.data || []).map((emp) => emp.user_uuid);
      setEmployeeUserIds(ids);
    } catch (err) {
      console.error("Failed to fetch core employees", err);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchCoreEmployees();
  }, []);

  const handleOpenCreateModal = (employee) => {
    setSelectedEmployee({
      userUuid: employee.user_uuid,
      firstName: employee.first_name,
      middleName: employee.middle_name,
      lastName: employee.last_name,
    });
    setIsCreateOpen(true);
  };

  const handleOpenEditModal = async (employee) => {
    setEditingEmployee(employee);
    setEditJoinForm({
      joining_date: employee.joining_date || "",
      reporting_time: employee.reporting_time || "",
      location: employee.location || "",
      department: employee.department || "",
      reporting_manager: employee.reporting_manager || "",
      joining_comments: employee.joining_comments || "",
    });
    setShowEditModal(true);

    try {
      setLoadingEditDetails(true);

      const res = await axios.get(
        `${BASE_URL}/hr/offerletters/${employee.user_uuid}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      const detail = res.data || {};

      setEditJoinForm({
        joining_date: String(
          detail.joining_date || employee.joining_date || "",
        ).trim(),
        reporting_time: String(
          detail.reporting_time || employee.reporting_time || "",
        ).trim(),
        location: String(detail.location || employee.location || "").trim(),
        department: String(
          detail.department || employee.department || "",
        ).trim(),
        reporting_manager: String(
          detail.reporting_manager || employee.reporting_manager || "",
        ).trim(),
        joining_comments: String(
          detail.joining_comments || employee.joining_comments || ""
        ).trim(),
      });
    } catch (err) {
      console.error("Failed to load joining details", err);
      showStatusToast("Failed to load joining details");
    } finally {
      setLoadingEditDetails(false);
    }
  };

  const handleCloseCreateModal = () => {
    setIsCreateOpen(false);
    setSelectedEmployee(null);
    setCurrentPage(1);
    fetchCoreEmployees();
    fetchEmployees();
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingEmployee(null);
    setEditJoinForm({
      joining_date: "",
      reporting_time: "",
      location: "",
      department: "",
      reporting_manager: "",
      joining_comments: "",
    });
  };

  const fetchManagers = async () => {
    setLoadingManagers(true);

    try {
      const res = await axios.get(`${BASE_URL}/permanent-employee/core-employee-details/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      const managers = (res.data || [])
        .map((u) => {
          const displayName = getManagerDisplayName(u);
          const payloadValue = getManagerPayloadValue(u);

          if (!displayName || !payloadValue) return null;

          return {
            value: payloadValue,
            label: displayName,
            name: displayName,
          };
        })
        .filter(Boolean);

      setManagerOptions(managers);
    } catch (err) {
      console.error("Failed to load managers:", err);
    }

    setLoadingManagers(false);
  };

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchJoiningCommentForUser = async (userUuid) => {
    if (!userUuid) return;

    // ✅ prevent duplicate calls while loading
    if (loadingStatusCommentUserId === userUuid) return;

    try {
      setLoadingStatusCommentUserId(userUuid);

      const res = await axios.get(
        `${BASE_URL}/hr/offerletters/${userUuid}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      setJoiningCommentsByUser((prev) => ({
        ...prev,
        [userUuid]: res.data?.joining_comments || "",
      }));
    } catch (err) {
      console.error("Failed to fetch joining comments", err);
    } finally {
      setLoadingStatusCommentUserId(null);
    }
  };

  // const getHrDisplayStatus = (offer) =>
  //   getOfferDisplayStatus(offer, employeeUserIds);
  const getHrDisplayStatus = (offer) =>
    getNormalizedStatus(getOfferDisplayStatus(offer, employeeUserIds));

  const pageData = useMemo(() => {
    return data.filter(
      (emp) =>
        editDisabledUserIds.includes(emp?.user_uuid) ||
        isTrackedOnboardingStatus(emp, employeeUserIds),
    );
  }, [data, employeeUserIds, editDisabledUserIds]);

  const filteredData = useMemo(() => {
    return pageData.filter((emp) => {
      const searchText =
        `${emp.first_name} ${emp.last_name} ${emp.designation}`.toLowerCase();

      const matchesSearch = searchText.includes(searchTerm.toLowerCase());

      const status = getHrDisplayStatus(emp);
      const filter = statusFilter.trim().toUpperCase();

      if (filter === "ALL") {
        return matchesSearch;
      }

      return matchesSearch && status === filter;
    });
  }, [
    pageData,
    searchTerm,
    statusFilter,
    employeeUserIds,
    editDisabledUserIds,
  ]);

  const categoryData = useMemo(() => {
    return HR_CATEGORY_GROUPS.map((group) => ({
      key: group.key,
      title: group.title,
      cards: group.statusDefs.map((def) => ({
        status:    def.status,
        label:     def.label,
        count:     pageData.filter((e) => getHrDisplayStatus(e) === def.status).length,
        icon:      def.icon,
        iconBg:    def.iconBg,
        iconColor: def.iconColor,
      })),
    }));
  }, [pageData, employeeUserIds]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const resetBulk = () => {
    setBulkJoinMode(false);
    setSelectedIds([]);
    setShowModal(false);
    setJoinForm({
      joining_date: "",
      reporting_time: "",
      location: "",
      department: "",
      reporting_manager: "",
      custom_message: "",
    });
  };

  const handleSendJoinEmail = async () => {
    const {
      joining_date,
      reporting_time,
      location,
      department,
      reporting_manager,
      
    } = joinForm;

    if (
      !joining_date ||
      !reporting_time ||
      !location ||
      !department ||
      !reporting_manager 
      
    ) {
      showStatusToast("Please fill all required fields");
      return;
    }

    const selectedEmployees = filteredData.filter((e) =>
      selectedIds.includes(e.user_uuid),
    );

    const emails = selectedEmployees
      .map((emp) => emp.mail)
      .filter(Boolean);

    if (emails.length === 0) {
      showStatusToast("No valid emails found");
      return;
    }

    const normalizedReportingManager =
      resolveReportingManager(reporting_manager);

    const payload = {
      user_emails_list: emails,
      ...joinForm,
      reporting_manager: normalizedReportingManager,
    };
    const joiningDetails = {
      ...joinForm,
      reporting_manager: normalizedReportingManager,
    };

    try {
      setSending(true);

      await axios.post(`${BASE_URL}/hr/offerletters/bulk-join`, payload, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });

      setData((prev) =>
        prev.map((emp) =>
          selectedIds.includes(emp.user_uuid)
            ? {
              ...emp,
              ...joiningDetails,
              status:
                getNormalizedStatus(emp.status) === "VERIFIED"
                  ? "JOINING"
                  : emp.status,
            }
            : emp,
        ),
      );

      selectedEmployees.forEach((employee) =>
        persistJoiningStatus({
          ...employee,
          ...joiningDetails,
          status: "JOINING",
        }),
      );

      await fetchEmployees();
      showStatusToast("Joining emails sent");
      resetBulk();
    } catch (err) {
      console.log("JOIN ERROR FULL:", err.response?.data);
      console.log("JOIN ERROR DETAIL:", err.response?.data?.detail);
      console.log("JOIN PAYLOAD:", payload);
      console.error(err);

      showStatusToast("Failed to send emails");
    } finally {
      setSending(false);
    }
  };

  const handlePreviewJoiningLetter = async () => {
    const {
      joining_date,
      reporting_time,
      location,
      department,
      reporting_manager,
      custom_message,
    } = joinForm;

    if (
      !joining_date ||
      !reporting_time ||
      !location ||
      !department ||
      !reporting_manager
    ) {
      showStatusToast("Please fill all required fields");
      return;
    }

    const selectedEmployees = filteredData.filter((e) =>
      selectedIds.includes(e.user_uuid),
    );

    const previewEmail = selectedEmployees[0]?.mail;

    if (!previewEmail) {
      showStatusToast("Please select a candidate to preview");
      return;
    }

    const normalizedReportingManager =
      resolveReportingManager(reporting_manager);

    const payload = {
      user_emails_list: [previewEmail],
      joining_date,
      reporting_time,
      location,
      department,
      reporting_manager: normalizedReportingManager,
      custom_message: custom_message || "",
    };

    try {
      setPreviewingJoinLetter(true);

      const res = await axios.post(
        `${BASE_URL}/hr/offerletters/bulk-join`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
          params: { preview: true },
          responseType: "blob",
        },
      );

      const contentType = res.headers?.["content-type"] || "";

      if (!contentType.includes("application/pdf")) {
        const errorText = await res.data.text();
        console.error("Joining preview returned non-PDF response:", errorText);
        showStatusToast("Failed to generate joining letter PDF");
        return;
      }

      const file = new Blob([res.data], { type: "application/pdf" });
      window.open(URL.createObjectURL(file), "_blank");
    } catch (err) {
      const errorBlob = err.response?.data;
      const errorText = errorBlob?.text ? await errorBlob.text() : "";
      console.error("Failed to preview joining letter", err, errorText);
      showStatusToast("Failed to preview joining letter");
    } finally {
      setPreviewingJoinLetter(false);
    }
  };

  const handleUpdateJoiningPending = async () => {
    if (!editingEmployee) return;

    const {
      joining_date,
      reporting_time,
      location,
      department,
      reporting_manager,
      joining_comments,
    } = editJoinForm;

    if (
      !joining_date ||
      !reporting_time ||
      !location ||
      !department ||
      !reporting_manager ||
      !joining_comments
    ) {
      showStatusToast("Please fill all required fields");
      return;
    }

    const normalizedReportingManager =
      resolveReportingManager(reporting_manager);

    const payload = {
      user_uuid: editingEmployee.user_uuid,
      new_joining_date: joining_date,
      reporting_manager: normalizedReportingManager,
      reporting_time,
      location,
      department,
      joining_comments: joining_comments || "",
    };

    try {
      setSavingEdit(true);

      const res = await axios.put(`${BASE_URL}/hr/offerletters/reassign-joining`, payload, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });
      const updatedStatus =
        getNormalizedStatus(res.data?.status) ||
        getHrDisplayStatus(editingEmployee);

      persistJoiningStatus({
        ...editingEmployee,
        joining_date,
        reporting_time,
        location,
        department,
        reporting_manager: normalizedReportingManager,
        joining_comments,
      });

      setData((prev) =>
        prev.map((emp) =>
          emp.user_uuid === editingEmployee.user_uuid
            ? {
              ...emp,
              status: updatedStatus,
              joining_date,
              reporting_time,
              location,
              department,
              reporting_manager: normalizedReportingManager,
              joining_comments,
            }
            : emp,
        ),
      );
      console.log("UPDATED STATUS:", updatedStatus);
      fetchEmployees();

      setEditDisabledUserIds((prev) =>
        prev.includes(editingEmployee.user_uuid)
          ? prev
          : [...prev, editingEmployee.user_uuid],
      );

      showStatusToast("Joining date updated");
      handleCloseEditModal();
    } catch (err) {
      console.error("Failed to update joining date", err);
      showStatusToast("Failed to update joining date");
    } finally {
      setSavingEdit(false);
    }
  };

  const headers = [
  bulkJoinMode ? (
    <input
      type="checkbox"
      className="h-4 w-4 cursor-pointer"
      onChange={(e) => {
        if (e.target.checked) {
          // Select only IDs of candidates who are VERIFIED
          const verifiedIds = filteredData
            .filter((emp) => getHrDisplayStatus(emp) === "VERIFIED")
            .map((emp) => emp.user_uuid);
          setSelectedIds(verifiedIds);
        } else {
          setSelectedIds([]);
        }
      }}
      // Check if all available verified candidates are selected
      checked={
        selectedIds.length > 0 &&
        selectedIds.length === filteredData.filter(e => getHrDisplayStatus(e) === "VERIFIED").length
      }
    />
  ) : null,
  "Name",
  "Email",
  "Contact",
  "Role",
  "Status",
  "Action",
].filter(Boolean);

  const columns = [
    bulkJoinMode ? "select" : null,
    "name",
    "mail",
    "contact",
    "designation",
    "status",
    "action",
  ].filter(Boolean);

  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);

  useEffect(() => {
    if (totalPages === 0) {
      setCurrentPage(1);
      return;
    }

    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const rows = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;

    return filteredData
      .slice(startIndex, startIndex + PAGE_SIZE)
      .map((emp) => {
        const displayStatus = getHrDisplayStatus(emp);
        const isEmployeeCreated = displayStatus === "COMPLETED";
        const isVerified = displayStatus === "VERIFIED";
        const isJoining = displayStatus === "JOINING";
        const isJoiningPending = displayStatus === "JOINING_PENDING";
        const isRescheduled = displayStatus === OFFER_STATUS.RESCHEDULED;

        const isEditDisabled = editDisabledUserIds.includes(emp.user_uuid);

        return {
          rowClass: isEmployeeCreated ? "bg-green-100" : "",
          select: bulkJoinMode ? (
    <input
      type="checkbox"
      className="h-4 w-4 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
      checked={selectedIds.includes(emp.user_uuid)}
      onChange={() => toggleSelect(emp.user_uuid)}
      // Only allow clicking if the status is VERIFIED
      disabled={!isVerified}
      title={!isVerified ? "Only verified candidates can be selected" : ""}
    />
  ) : null,

          name: `${emp.first_name} ${emp.last_name}`,
          mail: emp.mail || "—",
          contact: emp.contact_number || "—",
          designation: emp.designation || "—",

          status: (
            <OfferStatusCell
              employee={emp}
              displayStatus={displayStatus}
              joiningCommentsByUser={joiningCommentsByUser}
              loadingStatusCommentUserId={loadingStatusCommentUserId}
              fetchJoiningCommentForUser={fetchJoiningCommentForUser}
            />
          ),
          action: (
            <ActionMenu
              onView={() =>
                navigate(`/employee-onboarding/hr/profile/${emp.user_uuid}`)
              }
              onCreate={() => handleOpenCreateModal(emp)}
              onEdit={() => handleOpenEditModal(emp)}
              showCreate={
                (isVerified || isJoining || isJoiningPending || isRescheduled) &&
                !isEmployeeCreated
              }
              showEdit={(isJoiningPending || isRescheduled) && !isEditDisabled}
            />
          ),
        };
      });
  }, [
    filteredData,
    currentPage,
    selectedIds,
    navigate,
    employeeUserIds,
    editDisabledUserIds,
    joiningCommentsByUser,
    loadingStatusCommentUserId,
  ]);

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 space-y-8 font-sans">
      {/* Header */}
      <div className="px-1">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          HR Onboarding Dashboard
        </h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          Verify employee documents & profiles
        </p>
      </div>

      {/* Grouped KPI Section */}
      <GroupedKPISection
        groups={categoryData}
        statusFilter={statusFilter}
        onStatusClick={handleKpiClick}
      />

      {/* Search & Table Section */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="bg-slate-50/50 border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3 flex-1">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by candidate name or role…"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 text-slate-900 text-sm rounded-xl shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-medium"
              />
            </div>

            <div className="w-full md:w-48">
              <FilterListbox
                options={[
                  { value: "ALL", label: "All Status" },
                  { value: "SUBMITTED", label: "Submitted" },
                  { value: "VERIFIED", label: "Verified" },
                  { value: "JOINING", label: "Joining" },
                  { value: "JOINING_PENDING", label: "Joining Pending" },
                  { value: "COMPLETED", label: "Completed" },
                  { value: "RESCHEDULED", label: "Rescheduled" },
                  { value: "REJECTED", label: "Rejected" },
                ]}
                value={statusFilter}
                onChange={(val) => {
                  setStatusFilter(val);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!bulkJoinMode ? (
             // FIND THE "Bulk Join" BUTTON AND UPDATE onClick:
<Button
  varient="primary"
  size="small"
  onClick={() => {
    const hasVerified = filteredData.some(
      (e) => getHrDisplayStatus(e) === "VERIFIED",
    );

    if (!hasVerified) {
      showStatusToast("No verified candidates available for bulk join");
      return;
    }

    setBulkJoinMode(true);
    // OPTIONAL: Automatically filter to Verified to show selectable users
    setStatusFilter("VERIFIED"); 
    setCurrentPage(1);
  }}
>
  Bulk Join
</Button>
            ) : (
              <div className="flex gap-3">
                <Button
                  varient="primary"
                  size="small"
                  disabled={selectedIds.length === 0}
                  onClick={() => setShowModal(true)}
                >
                  Send ({selectedIds.length})
                </Button>

                <Button varient="secondary" size="small" onClick={resetBulk}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="relative overflow-visible">
          <Table
            headers={headers}
            columns={columns}
            rows={rows}
            loading={loading}
          />

          {filteredData.length > PAGE_SIZE && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPrevious={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              onNext={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            />
          )}
        </div>
      </div>

      <JoinModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleSendJoinEmail}
        onPreview={handlePreviewJoiningLetter}
        loading={sending}
        previewLoading={previewingJoinLetter}
        form={joinForm}
        setForm={setJoinForm}
        managerOptions={managerOptions}
        loadingManagers={loadingManagers}
      />

      <ReassignJoiningModal
        open={showEditModal}
        onClose={handleCloseEditModal}
        onSubmit={handleUpdateJoiningPending}
        loading={savingEdit}
        loadingDetails={loadingEditDetails}
        form={editJoinForm}
        setForm={setEditJoinForm}
        managerOptions={managerOptions}
        loadingManagers={loadingManagers}
      />

      <EmployeeCreateModal
        isOpen={isCreateOpen}
        onClose={handleCloseCreateModal}
        userUuid={selectedEmployee?.userUuid}
        firstName={selectedEmployee?.firstName}
        middleName={selectedEmployee?.middleName}
        lastName={selectedEmployee?.lastName}
      />
    </div>
  );
}


