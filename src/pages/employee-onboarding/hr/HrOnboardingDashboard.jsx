"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Users,
  XCircle,
  ShieldCheck,
  Clock,
  MailCheck,
} from "lucide-react";
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
import StatCard from "./components/StatCard";

export default function HrOnboardingDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
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

  const handleKpiClick = (status) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const offers = await fetchOfferDetailsList(BASE_URL, token);
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
            Authorization: `Bearer ${token}`,
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
            Authorization: `Bearer ${token}`,
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
      const res = await axios.get(`${BASE_URL}/offer-approval/admin-users`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const managers = (res.data || []).map((u) => ({
        value: String(u.name || "").trim(),
        label: `${String(u.name || "").trim()} (${u.mail})`,
      }));

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
        headers: { Authorization: `Bearer ${token}` },
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
      joining_comments,
    } = joinForm;

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

    const payload = {
      user_emails_list: emails,
      ...joinForm,
    };

    try {
      setSending(true);

      await axios.post(`${BASE_URL}/hr/offerletters/bulk-join`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      setData((prev) =>
        prev.map((emp) =>
          selectedIds.includes(emp.user_uuid)
            ? {
                ...emp,
                ...joinForm,
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
          ...joinForm,
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

    const payload = {
      user_uuid: editingEmployee.user_uuid,
      new_joining_date: joining_date,
      reporting_manager,
      reporting_time,
      location,
      department,
      joining_comments: joining_comments || "",
    };

    try {
      setSavingEdit(true);

      const res =await axios.put(`${BASE_URL}/hr/offerletters/reassign-joining`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
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
        reporting_manager,
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
                reporting_manager,
                joining_comments,
              }
            : emp,
        ),
      );
      console.log("UPDATED STATUS:",updatedStatus);
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
    bulkJoinMode ? "Select" : null,
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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">HR Onboarding Dashboard</h1>

        <p className="text-gray-500">Verify employee documents & profiles</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <StatCard
          title="Total Profiles"
          value={loading ? "0" : pageData.length}
          icon={Users}
          onClick={() => handleKpiClick("ALL")}
        />

        <StatCard
          title="Verified"
          value={
            loading
              ? "0"
              : pageData.filter((e) => getHrDisplayStatus(e) === "VERIFIED")
                  .length
          }
          icon={ShieldCheck}
          onClick={() => handleKpiClick("VERIFIED")}
        />

        <StatCard
          title="Joining"
          value={
            loading
              ? "0"
              : pageData.filter((e) => getHrDisplayStatus(e) === "JOINING")
                  .length
          }
          icon={MailCheck}
          onClick={() => handleKpiClick("JOINING")}
        />

        <StatCard
          title="Joining Pending"
          value={
            loading
              ? "0"
              : pageData.filter(
                  (e) => getHrDisplayStatus(e) === "JOINING_PENDING",
                ).length
          }
          icon={Clock}
          onClick={() => handleKpiClick("JOINING_PENDING")}
        />

        <StatCard
          title="Completed"
          value={
            loading
              ? "0"
              : pageData.filter((e) => getHrDisplayStatus(e) === "COMPLETED")
                  .length
          }
          icon={Users}
          onClick={() => handleKpiClick("COMPLETED")}
        />

        <StatCard
          title="Rescheduled"
          value={
            loading
              ? "0"
              : pageData.filter(
                  (e) =>
                    getHrDisplayStatus(e) ===
                    "RESCHEDULED"
                ).length
          }
          icon={Clock}
          onClick={() => handleKpiClick("RESCHEDULED")}
        />

        <StatCard
          title="Rescheduled"
          value={
            loading
              ? "0"
              : pageData.filter(
                  (e) =>
                    getHrDisplayStatus(e) ===
                    "REJECTED"
                ).length
          }
          icon={Clock}
          onClick={() => handleKpiClick("RESCHEDULED")}
        />

        <StatCard
          title="Rejected"
          value={
            loading
              ? "0"
              : pageData.filter((e) => getHrDisplayStatus(e) === "REJECTED")
                  .length
          }
          icon={XCircle}
          onClick={() => handleKpiClick("REJECTED")}
        />
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <input
          placeholder="Search by candidate name... or Role"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full md:w-1/3 px-3 py-2 border rounded-lg"
        />

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full md:w-48 px-3 py-2 border rounded-lg bg-white"
        >
          <option value="ALL">All Status</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="VERIFIED">Verified</option>
          <option value="JOINING">Joining</option>
          <option value="JOINING_PENDING">Joining Pending</option>
          <option value="COMPLETED">Completed</option>
          <option value="RESCHEDULED">Rescheduled</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm flex justify-between">
        <h2 className="font-semibold text-gray-700">Recent Offer Letters</h2>

        {!bulkJoinMode ? (
          <Button
            varient="primary"
            size="small"
            onClick={() => {
              const hasVerified = filteredData.some(
                (e) => getHrDisplayStatus(e) === "VERIFIED",
              );

              if (!hasVerified) {
                showStatusToast(
                  "No verified candidates available for bulk join",
                );
                return;
              }

              setBulkJoinMode(true);
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

      <div className="bg-white rounded-xl shadow-sm relative overflow-visible">
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

      <JoinModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleSendJoinEmail}
        loading={sending}
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
