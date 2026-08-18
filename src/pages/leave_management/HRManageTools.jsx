import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pencil,
  Trash2,
  Settings,
  Users,
  CalendarDays,
  ClipboardCheck,
  History,
} from "lucide-react";
import { toast } from "react-toastify";
import Button from "../../components/Button/Button";
import PageHeader from "../../components/ui/PageHeader";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";

// Modals
import AddEmployeeModal from "./models/AddEmployeeModal";
import AddLeaveTypeModal from "./models/AddLeaveTypeModal";
import AddHolidaysModal from "./models/AddHolidaysModal";
import EffectiveDeactivationDate from "./models/EffectiveDeactivationDate";
import CarryForwardTrigger from "./models/CarryForwardTrigger";
import ApplyLeaveOnBehalf from "./models/ApplyLeaveOnBehalf";
import PendingApprovalsQueueView from "./models/PendingApprovalsQueueView";
import LoadingSpinner from "../../components/LoadingSpinner";
import { useAuth } from "../../contexts/AuthContext";
import GenericTable from "../../components/Table/table";

const BASE_URL = window.__APP_CONFIG__.BASE_URL;

const HRManageTools = ({ employeeId }) => {
  const [activeTab, setActiveTab] = useState("leaveTypes"); // Tabs: "leaveTypes", "employeeActions", "holidaySettings"
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [isAddLeaveTypeModalOpen, setIsAddLeaveTypeModalOpen] = useState(false);
  const [isAddHolidaysModalOpen, setIsAddHolidaysModalOpen] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [genderBasedLeaveTypes, setGenderBasedLeaveTypes] = useState([]);
  const [editLeaveType, setEditLeaveType] = useState(null);
  const [selectedLeaveTypeIdToDelete, setSelectedLeaveTypeIdToDelete] =
    useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [effectiveDeactivationDate, setEffectiveDeactivationDate] =
    useState("");
  const [isEffectiveModalOpen, setIsEffectiveModalOpen] = useState(false);
  const [isCarryModalOpen, setIsCarryModalOpen] = useState(false);
  const [OnBehalfOpen, setOnBehalfOpen] = useState(false);
  const user = useAuth().user;

  const permissions = user.roles?.includes("Admin") || user.roles?.includes("Super_Admin");


  const navigate = useNavigate();

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const fetchLeaveTypes = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`${BASE_URL}/api/leave/get-all-leave-types`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setLeaveTypes(res.data?.regular || []);
      setGenderBasedLeaveTypes(res.data?.genderBasedLeaves || []);
    } catch (err) {
      toast.error("Failed to load leave types");
    } finally {
      setIsLoading(false);
    }
  };

  const executeDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await api.delete(
        `${BASE_URL}/api/leave/delete-leave-type/${selectedLeaveTypeIdToDelete}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          data: { deactivationEffectiveDate: effectiveDeactivationDate },
        },
      );
      toast.success(res.data?.message || "Leave type deleted successfully");
      fetchLeaveTypes();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete leave type");
    } finally {
      setIsDeleting(false);
      setIsEffectiveModalOpen(false);
      setEffectiveDeactivationDate("");
    }
  };

  const tabs = [
    {
      id: "leaveTypes",
      label: "Leave Configuration",
      // icon: <Settings size={16} />,
    },
    !permissions && {
      id: "employeeActions",
      label: "Employee Management",
      // icon: <Users size={16} />,
    },
    {
      id: "holidaySettings",
      label: "Holiday Management",
      // icon: <CalendarDays size={16} />,
    },
    {
      id: "pendingApprovals",
      label: "Pending Approvals",
      // icon: <ClipboardCheck size={16} />,
    },
  ];

  return (
    <div className="space-y-6 py-6 px-6 max-w-7xl mx-auto">
      <PageHeader
        title="HR Administration"
        subtitle="Configure system leave types, manage team balances, and holiday calendars."
      />

      {/* TABS - Matching LeaveSection Style */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="!inline-flex !h-auto !bg-transparent !p-0 !rounded-none !justify-start items-center gap-2 border-b border-gray-200">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="relative pb-3 !rounded-none !bg-transparent !shadow-none font-medium transition-colors focus:outline-none flex items-center gap-2 data-[state=active]:!text-indigo-600 data-[state=inactive]:text-gray-500 hover:text-gray-900"
            >
              {tab.icon}
              <span className="ml-1">{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div
                  className="absolute bottom-[-1px] left-0 right-0 h-[2.5px] bg-indigo-600 rounded-t-full"
                  layoutId="adminUnderline"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mt-4">
        <AnimatePresence mode="wait">
          {/* TAB 1: LEAVE CONFIGURATION */}
          {activeTab === "leaveTypes" && (
            <motion.div
              key="leaveTypes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">
                  System Leave Types
                </h3>
                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setEditLeaveType(null);
                      setIsAddLeaveTypeModalOpen(true);
                    }}
                    variant="primary"
                    size="medium"
                  >
                    + Add Leave Type
                  </Button>
                  <Button
                    onClick={() => {
                      window.open(
                        "https://celebrated-renewal-07a16fae8e.strapiapp.com/admin/auth/login",
                        "_blank",
                        "noopener,noreferrer",
                      );
                    }}
                    variant="secondary"
                    size="medium"
                  >
                    Leave Policies
                  </Button>
                  {permissions && (
                    <Button
                      onClick={() => navigate("/approval-rules")}
                      variant="primary"
                      size="medium"
                    >
                      Approval Rules
                    </Button>
                  )}
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-20">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="space-y-8">
                  <LeaveTable
                    title="Gender Based Policies"
                    data={genderBasedLeaveTypes}
                    onEdit={(lt) => {
                      setEditLeaveType(lt);
                      setIsAddLeaveTypeModalOpen(true);
                    }}
                    onDelete={(id) => {
                      setSelectedLeaveTypeIdToDelete(id);
                      setIsEffectiveModalOpen(true);
                    }}
                  />
                  <LeaveTable
                    title="Regular Policies"
                    data={leaveTypes}
                    onEdit={(lt) => {
                      setEditLeaveType(lt);
                      setIsAddLeaveTypeModalOpen(true);
                    }}
                    onDelete={(id) => {
                      setSelectedLeaveTypeIdToDelete(id);
                      setIsEffectiveModalOpen(true);
                    }}
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 2: EMPLOYEE MANAGEMENT */}
          {activeTab === "employeeActions" && (
            <motion.div
              key="employeeActions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {/* <AdminCard
                title="Onboard Employee"
                desc="Create new system credentials and profiles."
                icon={<Users className="text-blue-500" />}
                onClick={() => setIsAddEmployeeModalOpen(true)}
              /> */}
              <AdminCard
                title="Leave Balances"
                desc="Manually adjust or review employee quotas."
                icon={<ClipboardCheck className="text-emerald-500" />}
                onClick={() => navigate(`/employee-leave-balance`)}
              />
              <AdminCard
                title="Apply on Behalf"
                desc="Submit leave requests for other employees."
                icon={<History className="text-orange-500" />}
                onClick={() => setOnBehalfOpen(true)}
              />
              <AdminCard
                title="Carry Forward"
                desc="Process unused leaves to the next cycle."
                icon={<History className="text-purple-500" />}
                onClick={() => setIsCarryModalOpen(true)}
              />
            </motion.div>
          )}

          {/* TAB 3: HOLIDAY MANAGEMENT */}
          {activeTab === "holidaySettings" && (
            <motion.div
              key="holidaySettings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <AdminCard
                title="Add Holidays"
                desc="Upload or add multiple calendar holidays."
                icon={<CalendarDays className="text-red-500" />}
                onClick={() => setIsAddHolidaysModalOpen(true)}
              />
              {!permissions && (
                <AdminCard
                  title="Modify Calendar"
                  desc="Edit or remove existing holiday dates."
                  icon={<Pencil className="text-gray-500" />}
                  onClick={() => navigate(`/edit-holidays`)}
                />
              )}
            </motion.div>
          )}

          {/* TAB 4: PENDING APPROVALS (read-only) */}
          {activeTab === "pendingApprovals" && (
            <motion.div
              key="pendingApprovals"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <PendingApprovalsQueueView />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <AddEmployeeModal
        isOpen={isAddEmployeeModalOpen}
        onClose={() => setIsAddEmployeeModalOpen(false)}
      />
      <AddLeaveTypeModal
        isOpen={isAddLeaveTypeModalOpen}
        onClose={() => setIsAddLeaveTypeModalOpen(false)}
        editData={editLeaveType}
        onSuccess={fetchLeaveTypes}
      />
      <EffectiveDeactivationDate
        isOpen={isEffectiveModalOpen}
        onConfirm={executeDelete}
        onCancel={() => setIsEffectiveModalOpen(false)}
        isLoading={isDeleting}
        effectiveDate={effectiveDeactivationDate}
        setEffectiveDate={setEffectiveDeactivationDate}
      />
      <AddHolidaysModal
        isOpen={isAddHolidaysModalOpen}
        onClose={() => setIsAddHolidaysModalOpen(false)}
      />
      <CarryForwardTrigger
        isOpen={isCarryModalOpen}
        onClose={() => setIsCarryModalOpen(false)}
      />
      <ApplyLeaveOnBehalf
        isOpen={OnBehalfOpen}
        onClose={() => setOnBehalfOpen(false)}
        year={new Date().getFullYear()}
      />
    </div>
  );
};

// --- Sub-Components ---

const AdminCard = ({ title, desc, icon, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-start gap-4 p-5 bg-white border border-gray-200 rounded-2xl hover:border-indigo-300 hover:shadow-md transition-all text-left"
  >
    <div className="p-3 bg-gray-50 rounded-xl">{icon}</div>
    <div>
      <h4 className="font-bold text-gray-800">{title}</h4>
      <p className="text-xs text-gray-500 mt-1">{desc}</p>
    </div>
  </button>
);

const LeaveTable = ({ title, data, onEdit, onDelete }) => {
  if (data.length === 0) return null;

  const rawHeaders = Object.keys(data[0]);

  // Reorder headers to put leaveName first for better alignment
  let headers = [...rawHeaders];
  const nameIndex = headers.indexOf("leaveName");
  if (nameIndex > -1) {
    headers.splice(nameIndex, 1);
    headers.unshift("leaveName");
  }

  const formatHeader = (h) => {
    const customMappings = {
      leaveTypeId: "ID",
      leaveName: "Leave Name",
      description: "Description",
      maxDaysPerYear: "Max Days / Year",
      maxCarryForwardPerYear: "Max Carry Forward / Year",
      maxCarryForward: "Max Carry Forward",
      accrualFrequency: "Accrual Frequency",
      requiresDocumentation: "Requires Doc",
      expiryDays: "Expiry Days",
      waitingPeriodDays: "Waiting Period",
      advanceNoticeDays: "Advance Notice",
      pastDateLimitDays: "Past Date Limit",
      allowHalfDay: "Half Day Allowed",
      allowNegativeBalance: "Negative Balance",
      noticePeriodRestriction: "Notice Restriction",
      weekendsAndHolidaysAllowed: "Holidays Allowed",
      active: "Active",
      effectiveStartDate: "Effective Start",
      maxLeaveDays: "Max Days",
      minLeaveDays: "Min Days",
      coolDownPeriod: "Cool Down",
      gender: "Gender",
      maxNoOfTimes: "Max No. of Times"
    };

    if (customMappings[h]) return customMappings[h];

    return h
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  const renderCellValue = (value) => {
    if (value === null || value === undefined || value === "") return "-";

    if (typeof value === "boolean") {
      return (
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${value
            ? "bg-emerald-50 text-emerald-700 border-emerald-150"
            : "bg-red-50 text-red-650 border-red-150"
            }`}
        >
          {value ? "True" : "False"}
        </span>
      );
    }

    return String(value);
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
        {title}
      </h4>

      <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm bg-white">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white text-xs font-semibold tracking-wider">
              {headers.map((h, i) => (
                <th
                  key={h}
                  className={`px-4 py-3.5 whitespace-nowrap ${i === 0
                    ? "sticky left-0 bg-blue-900 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)] text-left"
                    : "text-center"
                    }`}
                >
                  {formatHeader(h)}
                </th>
              ))}
              <th className="px-4 py-3.5 text-center sticky right-0 bg-indigo-900 z-10 border-l border-indigo-800 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.15)]">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {data.map((row, idx) => {
              const bgClass = idx % 2 === 0 ? "bg-white" : "bg-[#f9fafb]";
              const stickyBgClass = idx % 2 === 0 ? "bg-white" : "bg-[#f9fafb]";

              return (
                <tr
                  key={idx}
                  className={`transition-colors ${bgClass} hover:bg-[#eff6ff] group`}
                >
                  {headers.map((key, i) => (
                    <td
                      key={key}
                      className={`px-4 py-3 text-gray-700 whitespace-nowrap ${i === 0
                        ? `sticky left-0 ${stickyBgClass} group-hover:bg-[#eff6ff] font-semibold z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-left`
                        : "text-center"
                        }`}
                    >
                      {renderCellValue(row[key])}
                    </td>
                  ))}

                  <td className={`px-4 py-3 sticky right-0 ${stickyBgClass} group-hover:bg-[#eff6ff] z-10 border-l border-gray-100 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]`}>
                    <div className="flex justify-center gap-3">
                      <Button
                        onClick={() => onEdit(row)}
                        variant="ghost"
                        size="icon"
                        className="text-indigo-700 hover:text-indigo-900"
                        title="Edit"
                        aria-label="Edit"
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button
                        onClick={() => onDelete(row.leaveTypeId)}
                        variant="danger"
                        size="icon"
                        className="text-red-700 hover:text-red-800"
                        title="Delete"
                        aria-label="Delete"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HRManageTools;
