import React, { useEffect, useState, Fragment } from "react";
import axios from "axios";
import { Listbox, Transition } from "@headlessui/react";
import { Check, Plus, ChevronDown, Pencil, Trash2 } from "lucide-react";
import LoadingSpinner from "../../../components/LoadingSpinner";
import { toast } from "react-toastify";
import ConfirmationModal from "./ConfirmationModal";
import { set } from "date-fns";
import { is } from "date-fns/locale";

const BASE_URL = window.__APP_CONFIG__.BASE_URL;

export default function ApprovalRulesPage() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  const [actionTypeOptions, setActionTypeOptions] = useState([]);
  const [approverTypeOptions, setApproverTypeOptions] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const [formData, setFormData] = useState({
    actionType: "",
    makerRole: "HR",
    checkerRole: "hr_administrator",
    approvalLevel: 1,
    approvalCondition: "",
    approverType: "",
  });

  // --------------------------
  // Fetch Rules + Options
  // --------------------------
  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/api/approval-rules/all`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setRules(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch rules", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActionTypes = async () => {
    try {
      const res = await axios.get(
        `${BASE_URL}/api/approval-rules/action-types`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setActionTypeOptions(res.data);
    } catch (err) {
      console.error("Failed to fetch action types");
    }
  };

  const fetchApproverTypes = async () => {
    try {
      const res = await axios.get(
        `${BASE_URL}/api/approval-rules/approver-types`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setApproverTypeOptions(res.data);
    } catch (err) {
      console.error("Failed to fetch approver types");
    }
  };

  useEffect(() => {
    fetchRules();
    fetchActionTypes();
    fetchApproverTypes();
  }, []);

  // --------------------------
  // Modal Handler
  // --------------------------
  const openModal = (rule = null) => {
    setEditingRule(rule);
    setFormData(
      rule || {
        actionType: "",
        makerRole: "HR",
        checkerRole: "hrAdministrator",
        approvalLevel: 1,
        approvalCondition: "",
        approverType: "",
      },
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingRule(null);
    setIsModalOpen(false);
  };

  // --------------------------
  // Save Rule
  // --------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRule) {
        await axios.put(`${BASE_URL}/api/approval-rules/update`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
      } else {
        await axios.post(`${BASE_URL}/api/approval-rules/create`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
      }
      toast.success("Rule saved successfully");
      fetchRules();
      closeModal();
    } catch (err) {
      console.error("Failed to save rule", err);
      toast.error(err.response?.data?.message || "Failed to save rule");
    }
  };

  // --------------------------
  // Delete
  // --------------------------
  const confirmDelete = (id) => {
    setDeleteId(id);
    setShowConfirmModal(true);
  };

  const handleDeleteConfirm = async () => {
    await deleteRule(deleteId);
    setShowConfirmModal(false);
    setDeleteId(null);
  };

  const deleteRule = async (id) => {
    try {
      await axios.delete(`${BASE_URL}/api/approval-rules/delete/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      toast.success("Rule deleted successfully");
      fetchRules();
    } catch (err) {
      console.error("Failed to delete rule", err);
      toast.error(err.response?.data?.message || "Failed to delete rule");
    }
  };

  // ================================================================
  //                            UI START
  // ================================================================
  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Approval Rules</h1>

        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl shadow hover:bg-indigo-700 transition"
        >
          <Plus className="w-5 h-5" /> Add Rule
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-gray-600 uppercase text-xs">
              <th className="p-3">Action</th>
              <th className="p-3">Maker</th>
              <th className="p-3">Checker</th>
              <th className="p-3 text-center">Level</th>
              <th className="p-3">Condition</th>
              <th className="p-3">Approver Type</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {rules.map((rule) => (
              <tr
                key={rule.id}
                className="border-b hover:bg-gray-50 transition"
              >
                <td className="p-3 font-medium">{rule.actionType}</td>
                <td className="p-3">{rule.makerRole}</td>
                <td className="p-3">{rule.checkerRole}</td>
                <td className="p-3 text-center">{rule.approvalLevel}</td>
                <td className="p-3">{rule.approvalCondition}</td>
                <td className="p-3">{rule.approverType}</td>

                <td className="p-3 flex justify-center gap-3">
                  <button
                    onClick={() => openModal(rule)}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    <Pencil className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => confirmDelete(rule.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===================== MODAL ===================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-xl border p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-800">
              {editingRule ? "Edit Rule" : "Add New Rule"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Dropdown
                label="Action Type"
                value={formData.actionType}
                options={actionTypeOptions}
                onChange={(val) =>
                  setFormData({ ...formData, actionType: val })
                }
              />

              <InputField
                label="Maker Role"
                value={formData.makerRole}
                onChange={(e) =>
                  setFormData({ ...formData, makerRole: e.target.value })
                }
              />

              <InputField
                label="Checker Role"
                value={formData.checkerRole}
                onChange={(e) =>
                  setFormData({ ...formData, checkerRole: e.target.value })
                }
              />

              <InputField
                type="number"
                label="Approval Level"
                value={formData.approvalLevel}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    approvalLevel: Number(e.target.value),
                  })
                }
              />

              <InputField
                label="Approval Condition"
                value={formData.approvalCondition}
                type="text"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    approvalCondition: e.target.value,
                  })
                }
              />

              <Dropdown
                label="Approver Type"
                value={formData.approverType}
                options={approverTypeOptions}
                disabledOptions={(opt) => opt !== "DIRECT_MAPPING"}
                onChange={(val) =>
                  setFormData({ ...formData, approverType: val })
                }
              />

              {/* Buttons */}
              <div className="flex justify-end gap-4 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow"
                  disabled={loading}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <ConfirmationModal
          isOpen={showConfirmModal}
          title="Delete Approval Rule"
          message="Are you sure you want to delete this rule? This action cannot be undone."
          onConfirm={() => handleDeleteConfirm()} // Pass the handleDeleteConfirm function
          isLoading={loading}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}
    </div>
  );
}

/* ---------------------- Reusable Components ---------------------- */

function InputField({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type={type}
        className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500"
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

function Dropdown({ label, value, options, onChange, disabledOptions }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>

      <Listbox value={value} onChange={onChange}>
        <div className="relative">
          <Listbox.Button className="w-full border px-3 py-2 rounded-lg bg-white flex justify-between items-center">
            {value || `Select ${label}`}
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </Listbox.Button>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-75"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute mt-1 w-full bg-white border rounded-lg shadow-lg z-20">
              {options.map((opt) => {
                const disabled = disabledOptions?.(opt);

                return (
                  <Listbox.Option
                    key={opt}
                    value={opt}
                    disabled={disabled}
                    className={({ active }) =>
                      `cursor-pointer px-3 py-2 
                      ${disabled ? "opacity-40 cursor-not-allowed" : ""}
                      ${active && !disabled ? "bg-gray-100" : ""}`
                    }
                  >
                    {opt}
                  </Listbox.Option>
                );
              })}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
}
