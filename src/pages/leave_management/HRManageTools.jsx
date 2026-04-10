import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AddEmployeeModal from "./models/AddEmployeeModal";
import AddLeaveTypeModal from "./models/AddLeaveTypeModal";
import AddHolidaysModal from "./models/AddHolidaysModal"; // 1. Import the new modal
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import LoadingSpinner from "../../components/LoadingSpinner";
import EffectiveDeactivationDate from "./models/EffectiveDeactivationDate";
import { motion, AnimatePresence } from "framer-motion";
import { set } from "date-fns";
import CarryForwardTrigger from "./models/CarryForwardTrigger";

const BASE_URL = window.__APP_CONFIG__.BASE_URL;

const HRManageTools = ({ employeeId }) => {
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [isAddLeaveTypeModalOpen, setIsAddLeaveTypeModalOpen] = useState(false);
  // 2. Add state for the new modal
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
  const navigate = useNavigate();

  // const token = localStorage.getItem("token");

  useEffect(() => {
    fetchLeaveTypes();
    // fetchGenderBasedLeaveTypes();
  }, []);

  const fetchLeaveTypes = async () => {
    try {
      setIsLoading(true); // ✅ Show spinner
      const res = await axios.get(`${BASE_URL}/api/leave/get-all-leave-types`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const regular = res.data?.regular || [];
      const genderBased = res.data?.genderBasedLeaves || [];
      // const genderBased = res.data?.genderBasedLeaves || [];
      // const allLeaveTypes = [...regular, ...genderBased];
      // console.log("allLeaveTypes", regular);
      setLeaveTypes(regular);
      setGenderBasedLeaveTypes(genderBased);
    } catch (err) {
      console.error("Failed to fetch leave types", err);
      toast.error("Failed to load leave types");
    } finally {
      setIsLoading(false); // ✅ Hide spinner after request completes
    }
  };

  // const fetchGenderBasedLeaveTypes = async () => {
  //   try {
  //     const res = await axios.get(
  //       `${BASE_URL}/api/gender-base-leave/all-leave-types`,
  //       {
  //         headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  //       }
  //     );
  //     if(res.data?.data === null){
  //       setGenderBasedLeaveTypes([]);
  //     }
  //     else{
  //       setGenderBasedLeaveTypes(res.data?.data);
  //     }
  //   } catch (err) {
  //     console.error("Failed to fetch leave types", err);
  //     toast.error(
  //       err.response?.data?.message || "Failed to load gender based leave types"
  //     );
  //   }
  // };

  const handleConfirm = (leaveTypeId) => {
    setSelectedLeaveTypeIdToDelete(leaveTypeId);
    setIsEffectiveModalOpen(true);
  };

  const executeDelete = async () => {
    setIsDeleting(true);
    await handleDeleteLeaveType(
      selectedLeaveTypeIdToDelete,
      effectiveDeactivationDate,
    );
    setIsDeleting(false);
    setIsEffectiveModalOpen(false);
    setEffectiveDeactivationDate("");
    fetchLeaveTypes();
  };

  const handleDeleteLeaveType = async (leaveTypeId) => {
    try {
      const res = await axios.delete(
        `${BASE_URL}/api/leave/delete-leave-type/${leaveTypeId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          data: {
            deactivationEffectiveDate: effectiveDeactivationDate,
          },
        },
      );
      toast.success(res.data?.message || "Leave type deleted successfully");
      setLeaveTypes((prev) =>
        prev.filter((lt) => lt.leaveTypeId !== leaveTypeId),
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to delete leave type",
      );
    }
  };

  const tableHeaders = leaveTypes.length > 0 ? Object.keys(leaveTypes[0]) : [];
  const tableHeadersGenderBase =
    genderBasedLeaveTypes.length > 0
      ? Object.keys(genderBasedLeaveTypes[0])
      : [];

  return (
    <div className="space-y-6 py-6 px-6">
      <h1 className="text-xl font-bold text-gray-800">HR Tools</h1>
      <p className="text-gray-600 mb-2">
        Manage employees, leave types, and holidays.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 mb-4 text-sm">
        <button
          onClick={() => setIsAddEmployeeModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Add Employee
        </button>
        <button
          onClick={() => {
            setEditLeaveType(null);
            setIsAddLeaveTypeModalOpen(true);
          }}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Add Leave Type
        </button>
        <button
          onClick={() => navigate(`/employee-leave-balance`)}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Edit Leave Balance
        </button>
        <button
          onClick={() => setIsAddHolidaysModalOpen(true)}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Add Holidays
        </button>
        <button
          onClick={() => navigate(`/edit-holidays`)}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Edit Holidays
        </button>
        <button
          onClick={() =>
            window.open(
              "https://celebrated-renewal-07a16fae8e.strapiapp.com",
              "_blank",
              "noopener noreferrer",
            )
          }
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Leave Policies
        </button>
        <button
          onClick={() => setIsCarryModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Process Carry Forward
        </button>
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            Gender Based Leave Types
          </h2>
          <div className="overflow-x-auto border rounded-md max-w-full">
            <table className="min-w-max text-sm text-left border-collapse relative w-[800px]">
              <thead className="bg-gray-100">
                <tr>
                  {tableHeadersGenderBase.map((header, i) => (
                    <th
                      key={header}
                      className={`border px-4 py-3 min-w-[100px] capitalize bg-gray-100 ${
                        i === 0
                          ? "sticky left-0 z-20"
                          : i === 1
                            ? "sticky left-[200px] z-20"
                            : ""
                      }`}
                    >
                      {header}
                    </th>
                  ))}
                  <th className="border px-3 py-2 min-w-[100px] sticky right-0 bg-gray-100 z-20">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {genderBasedLeaveTypes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={tableHeadersGenderBase.length + 1}
                      className="text-center py-6 text-gray-500"
                    >
                      No leave types found.
                    </td>
                  </tr>
                ) : (
                  genderBasedLeaveTypes.map((lt, index) => (
                    <tr key={index} className="border-t">
                      {tableHeadersGenderBase.map((key, i) => (
                        <td
                          key={key}
                          className={`border px-4 py-2 min-w-[200px] bg-white ${
                            i === 0
                              ? "sticky left-0 z-10"
                              : i === 1
                                ? "sticky left-[200px] z-10"
                                : ""
                          }`}
                        >
                          {String(lt[key])}
                        </td>
                      ))}
                      <td className="border px-3 py-2 min-w-[100px] sticky right-0 bg-white">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            title="Edit"
                            onClick={() => {
                              setEditLeaveType(lt);
                              setIsAddLeaveTypeModalOpen(true);
                            }}
                            className="text-blue-500 hover:text-blue-800 transition-colors"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            title="Delete"
                            onClick={() => handleConfirm(lt.leaveTypeId)}
                            className="text-red-500 hover:text-red-800 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2 mt-3">
            Regular Leave Types
          </h2>
          <div className="overflow-x-auto border rounded-md max-w-full">
            <table className="min-w-max text-sm text-left border-collapse relative w-[800px]">
              <thead className="bg-gray-100">
                <tr>
                  {tableHeaders.map((header, i) => (
                    <th
                      key={header}
                      className={`border px-4 py-3 min-w-[100px] capitalize bg-gray-100 ${
                        i === 0
                          ? "sticky left-0 z-20"
                          : i === 1
                            ? "sticky left-[200px] z-20"
                            : ""
                      }`}
                    >
                      {header}
                    </th>
                  ))}
                  <th className="border px-3 py-2 min-w-[100px] sticky right-0 bg-gray-100 z-20">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {leaveTypes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={tableHeaders.length + 1}
                      className="text-center py-6 text-gray-500"
                    >
                      No leave types found.
                    </td>
                  </tr>
                ) : (
                  leaveTypes.map((lt, index) => (
                    <tr key={index} className="border-t">
                      {tableHeaders.map((key, i) => (
                        <td
                          key={key}
                          className={`border px-4 py-2 min-w-[200px] bg-white ${
                            i === 0
                              ? "sticky left-0 z-10"
                              : i === 1
                                ? "sticky left-[200px] z-10"
                                : ""
                          }`}
                        >
                          {String(lt[key])}
                        </td>
                      ))}
                      <td className="border px-3 py-2 min-w-[100px] sticky right-0 bg-white">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            title="Edit"
                            onClick={() => {
                              setEditLeaveType(lt);
                              setIsAddLeaveTypeModalOpen(true);
                            }}
                            className="text-blue-500 hover:text-blue-800 transition-colors"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            title="Delete"
                            onClick={() => handleConfirm(lt.leaveTypeId)}
                            className="text-red-500 hover:text-red-800 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <AddEmployeeModal
        isOpen={isAddEmployeeModalOpen}
        onClose={() => setIsAddEmployeeModalOpen(false)}
      />
      <AddLeaveTypeModal
        isOpen={isAddLeaveTypeModalOpen}
        onClose={() => {
          setIsAddLeaveTypeModalOpen(false);
          setEditLeaveType(null);
        }}
        editData={editLeaveType}
        onSuccess={() => {
          fetchLeaveTypes();
          // fetchGenderBasedLeaveTypes();
          setEditLeaveType(null);
          setIsAddLeaveTypeModalOpen(false);
        }}
      />
      <EffectiveDeactivationDate
        isOpen={isEffectiveModalOpen}
        onConfirm={executeDelete}
        onCancel={() => setIsEffectiveModalOpen(false)}
        isLoading={isDeleting}
        // confirmText="Deactivate"
        effectiveDate={effectiveDeactivationDate}
        setEffectiveDate={setEffectiveDeactivationDate}
      />
      {/* 4. Render the AddHolidaysModal */}
      <AddHolidaysModal
        isOpen={isAddHolidaysModalOpen}
        onClose={() => setIsAddHolidaysModalOpen(false)}
        onSuccess={() => {
          setIsAddHolidaysModalOpen(false);
          // Optional: refetch holiday list if it's displayed on this page
        }}
      />

      <CarryForwardTrigger
        isOpen={isCarryModalOpen}
        onClose={() => setIsCarryModalOpen(false)}
        onSuccess={() => {
          setIsCarryModalOpen(false);
          // 🔥 refresh data / call API / refetch
        }}
      />
    </div>
  );
};

export default HRManageTools;
