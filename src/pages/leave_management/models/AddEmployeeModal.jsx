import React, { useState } from "react";
import { User } from "lucide-react";
import api from "../../../api/axiosInstance";
import Button from "../../../components/Button/Button";
import FormInput from "../../../components/forms/FormInput";
import FormSelect from "../../../components/forms/FormSelect";
import Modal from "../../../components/Modal/modal";

const BASE_URL = window.__APP_CONFIG__.BASE_URL;

const AddEmployeeModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    gender: "",
    phone: "",
    hireDate: "",
    role: "",
    managerId: "",
    password: "",
    jobTitle: "",
    status: "ACTIVE",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const payload = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      gender: formData.gender,
      phone: formData.phone,
      hireDate: formData.hireDate,
      role: formData.role,
      password: formData.password,
      status: formData.status,
    };

    // 🔥 FIX: send as nested object
    if (formData.managerId) {
      payload.manager = { employeeId: formData.managerId };
    }

    try {
      await api.post(`${BASE_URL}/api/employee/register`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setSuccess("Employee added successfully!");
      setLoading(false);
      setTimeout(() => {
        setSuccess("");
        onClose();
      }, 1000);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        gender: "",
        phone: "",
        hireDate: "",
        role: "",
        managerId: "",
        password: "",
        status: "ACTIVE",
      });
    } catch (err) {
      setLoading(false);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to add employee. Please try again!",
      );
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Employee"
      titleIcon={<User className="w-6 h-6 text-indigo-600" />}
      panelClassName="max-w-lg sm:max-w-xl"
      closeOnBackdrop={false}
      closeOnEscape={true}
      showCloseButton={true}
      disableBodyScroll={true}
    >
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {success && <div className="text-green-600 text-sm">{success}</div>}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FormInput
                label="First Name *"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                required
                inputClassName="input"
                placeholder="Enter first name"
              />
            </div>
            <div>
              <FormInput
                label="Last Name *"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                required
                inputClassName="input"
                placeholder="Enter last name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender *
              </label>
              <FormSelect
                name="gender"
                options={[
                  { value: "", label: "Select gender" },
                  { value: "Male", label: "Male" },
                  { value: "Female", label: "Female" },
                  { value: "Other", label: "Other" },
                ]}
                value={formData.gender}
                onChange={handleChange}
              />
            </div>
            <div>
              <FormInput
                label="Phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                maxLength={10}
                inputClassName="input"
                placeholder="Optional"
              />
            </div>
            <div className="sm:col-span-2">
              <FormInput
                label="Email *"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                inputClassName="input"
                placeholder="Enter email address"
              />
            </div>
            <div>
              <FormInput
                label="Joining Date *"
                name="hireDate"
                type="date"
                value={formData.hireDate}
                onChange={handleChange}
                required
                inputClassName="input"
              />
            </div>
            <div>
              <FormInput
                label="Designation"
                name="role"
                type="text"
                value={formData.role}
                onChange={handleChange}
                inputClassName="input"
                placeholder="Ex: Software Engineer"
              />
            </div>
            <div className="sm:col-span-2">
              <FormInput
                label="Manager Employee ID"
                name="managerId"
                type="text"
                value={formData.managerId}
                onChange={handleChange}
                inputClassName="input"
                placeholder="Ex: PAVEMP12345"
              />
            </div>
            <div className="sm:col-span-2">
              <FormInput
                label="Password *"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                inputClassName="input"
                placeholder="Enter password"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="bg-white text-gray-800 border border-gray-300 hover:bg-gray-100"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="bg-indigo-600 text-white hover:bg-indigo-700"
              disabled={loading}
            >
              {loading ? "Adding..." : "Add Employee"}
            </Button>
          </div>
        </form>
      {/* Tailwind CSS input and btn class shorthands for clarity */}
      <style>{`
        .input {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid #D1D5DB;
          border-radius: 0.5rem;
          outline: none;
          transition: border 0.2s, box-shadow 0.2s;
          font-size: 1rem;
        }
        .input:focus {
          border-color: #6366F1;
          box-shadow: 0 0 0 2px #6366F133;
        }
        .btn {
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          font-weight: 500;
          transition: background 0.2s, color 0.2s;
        }
      `}</style>
    </Modal>
  );
};

export default AddEmployeeModal;
