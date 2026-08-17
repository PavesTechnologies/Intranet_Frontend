// src/pages/EditHolidaysPage.jsx
import React, { useState, useEffect } from "react";
import api from "../../../api/axiosInstance";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Edit, Trash2, Save, XCircle } from "lucide-react";
import LoadingSpinner from "../../../components/LoadingSpinner";
import ConfirmationModal from "./ConfirmationModal";
import Button from "../../../components/Button/Button";
import FormInput from "../../../components/forms/FormInput";
import FormSelect from "../../../components/forms/FormSelect";
import FilterBar from "../../../components/patterns/FilterBar";
import DataTable from "../../../components/patterns/DataTable";
import BackButton from "../../../components/patterns/BackButton";

const BASE_URL = window.__APP_CONFIG__.BASE_URL;

const EditHolidaysPage = () => {
  const [holidays, setHolidays] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [editingHolidayId, setEditingHolidayId] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] =
    useState(false);
  const [selectedLeaveTypeIdToDelete, setSelectedLeaveTypeIdToDelete] =
    useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const years = Array.from({ length: 5 }, (_, i) => {
    return new Date().getFullYear() - 2 + i;
  });

  const navigate = useNavigate();
  // const token = localStorage.getItem("token");

  const fetchHolidays = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(
        `${BASE_URL}/api/holidays/year/${selectedYear}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      setHolidays(response.data);
    } catch (err) {
      setError("Failed to fetch holidays. Please try again later.");
      toast.error("Failed to fetch holidays.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all holidays
  useEffect(() => {
    fetchHolidays();
  }, [selectedYear, localStorage.getItem("token")]);

  // Handlers for editing
  const handleEditClick = (holiday) => {
    setEditingHolidayId(holiday.holidayId);
    setEditedData({ ...holiday });
  };

  const handleCancelEdit = () => {
    setEditingHolidayId(null);
    setEditedData({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveHoliday = async (holidayId) => {
    try {
      setIsLoading(true);
      await api.put(`${BASE_URL}/api/holidays/update`, editedData, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      toast.success("Holiday updated successfully!");
      setHolidays((holidays) =>
        holidays.map((h) => (h.holidayId === holidayId ? editedData : h)),
      );
      handleCancelEdit();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update holiday.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConfirmation = (holidayId) => {
    setSelectedLeaveTypeIdToDelete(holidayId);
    setIsDeleteConfirmationOpen(true);
  };

  const handleDeleteHoliday = async (holidayId) => {
    try {
      setIsDeleting(true);
      const res = await api.delete(
        `${BASE_URL}/api/holidays/delete/${holidayId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      toast.success(res.data.message || "Holiday deleted successfully!");
      setHolidays((holidays) =>
        holidays.filter((h) => h.holidayId !== holidayId),
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete holiday.");
    } finally {
      setIsDeleting(false);
      setIsDeleteConfirmationOpen(false);
      fetchHolidays();
    }
  };

  const filteredHolidays = holidays.filter((holiday) => {
    const lowerSearch = searchTerm.toLowerCase();
    return (
      holiday.holidayName.toLowerCase().includes(lowerSearch) ||
      holiday.type.toLowerCase().includes(lowerSearch) ||
      (holiday.state || "").toLowerCase().includes(lowerSearch) ||
      (holiday.country || "").toLowerCase().includes(lowerSearch)
    );
  });

  return (
    <div className="relative p-6 space-y-4">
      {/* 🔹 Full-Screen Loading Spinner Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex justify-center items-center z-[9999] animate-fadeIn">
          <LoadingSpinner text="Please wait" />
        </div>
      )}

      <div className="flex items-center gap-3 px-6 mb-4">
        <BackButton onClick={() => navigate(-1)} />
        <h1 className="text-xl font-bold text-gray-800">Manage Holidays</h1>
      </div>

      {/* Search Bar */}
      <FilterBar className="mb-4">
        {/* Search Input */}
        <FormInput
          type="text"
          name="holidaySearch"
          placeholder="Search by Holiday Name, Type, State or Country..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          inputClassName="w-full"
          className="flex-1 min-w-[240px]"
        />

        {/* Year Listbox */}
        <div className="w-32">
          <FormSelect
            name="holidayYear"
            options={years.map((year) => ({ value: year, label: String(year) }))}
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          />
        </div>
      </FilterBar>

      {/* Holidays Table */}
      <div className="border rounded-lg overflow-hidden">
        <DataTable
          emptyTitle="No holidays found"
          getRowKey={(holiday) => holiday.holidayId}
          rows={filteredHolidays}
          columns={[
            {
              key: "holidayName",
              header: "Holiday Name",
              className: "text-center",
              render: (holiday) =>
                editingHolidayId === holiday.holidayId ? (
                  <FormInput
                    type="text"
                    name="holidayName"
                    value={editedData.holidayName}
                    onChange={handleInputChange}
                    inputClassName="w-full"
                  />
                ) : (
                  holiday.holidayName
                ),
            },
            {
              key: "holidayDate",
              header: "Date",
              className: "text-center",
              render: (holiday) =>
                editingHolidayId === holiday.holidayId ? (
                  <FormInput
                    type="date"
                    name="holidayDate"
                    value={
                      new Date(editedData.holidayDate)
                        .toISOString()
                        .split("T")[0]
                    }
                    onChange={handleInputChange}
                    inputClassName="w-full"
                  />
                ) : (
                  new Date(holiday.holidayDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                ),
            },
            {
              key: "type",
              header: "Type",
              className: "text-center",
              render: (holiday) =>
                editingHolidayId === holiday.holidayId ? (
                  <FormInput
                    name="holidayTypeDisplay"
                    value={editedData.type || ""}
                    inputClassName="bg-gray-100 text-gray-400 hover:cursor-not-allowed"
                    readOnly
                  />
                ) : (
                  holiday.type
                ),
            },
            {
              key: "state",
              header: "State",
              className: "text-center",
              render: (holiday) =>
                editingHolidayId === holiday.holidayId ? (
                  <FormInput
                    type="text"
                    name="state"
                    value={editedData.state || ""}
                    onChange={handleInputChange}
                    placeholder="State"
                    inputClassName="bg-gray-100 text-gray-400 hover:cursor-not-allowed"
                    readOnly
                  />
                ) : holiday.state ? (
                  holiday.state
                ) : (
                  "-"
                ),
            },
            {
              key: "country",
              header: "Country",
              className: "text-center",
              render: (holiday) =>
                editingHolidayId === holiday.holidayId ? (
                  <FormInput
                    type="text"
                    name="country"
                    value={editedData.country || ""}
                    onChange={handleInputChange}
                    placeholder="Country"
                    inputClassName="bg-gray-100 text-gray-400 hover:cursor-not-allowed"
                    readOnly
                  />
                ) : holiday.country ? (
                  holiday.country
                ) : (
                  "-"
                ),
            },
            {
              key: "actions",
              header: "Actions",
              className: "text-center",
              render: (holiday) =>
                editingHolidayId === holiday.holidayId ? (
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="primary"
                      size="icon"
                      onClick={() => handleSaveHoliday(holiday.holidayId)}
                      className="text-green-500 hover:text-green-800"
                      title="Save"
                      aria-label="Save"
                    >
                      <Save size={20} />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCancelEdit}
                      className="text-red-500 hover:text-red-700"
                      title="Cancel"
                      aria-label="Cancel"
                    >
                      <XCircle size={20} />
                    </Button>
                  </div>
                ) : (
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(holiday)}
                      className={`text-blue-600  ${
                        holiday.isActive
                          ? "hover:text-blue-800"
                          : "text-opacity-15 cursor-not-allowed"
                      }`}
                      title={
                        holiday.isActive
                          ? "Edit"
                          : "This holiday cannot be edited."
                      }
                      aria-label="Edit"
                      disabled={!holiday.isActive}
                    >
                      <Edit size={20} />
                    </Button>
                    <Button
                      variant="danger"
                      size="icon"
                      onClick={() =>
                        handleDeleteConfirmation(holiday.holidayId)
                      }
                      className={`text-red-600  ${
                        holiday.isActive
                          ? "hover:text-red-800"
                          : "text-opacity-15 cursor-not-allowed"
                      }`}
                      title={
                        holiday.isActive
                          ? "Delete"
                          : "This holiday cannot be deleted."
                      }
                      aria-label="Delete"
                      disabled={!holiday.isActive}
                    >
                      <Trash2 size={20} />
                    </Button>
                  </div>
                ),
            },
          ]}
        />
      </div>
      <ConfirmationModal
        isOpen={isDeleteConfirmationOpen}
        title="Confirm Deletion"
        message="Are you sure you want to delete this holiday?"
        onConfirm={() => handleDeleteHoliday(selectedLeaveTypeIdToDelete)}
        onCancel={() => setIsDeleteConfirmationOpen(false)}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default EditHolidaysPage;
