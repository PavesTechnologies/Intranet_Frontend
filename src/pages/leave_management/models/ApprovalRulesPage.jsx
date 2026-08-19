import React, { useEffect, useState, Fragment } from "react";
import api from "../../../api/axiosInstance";
import { Listbox, Transition } from "@headlessui/react";
import { Check, Plus, ChevronDown, Pencil, Trash2 } from "lucide-react";
import LoadingSpinner from "../../../components/LoadingSpinner";
import { toast } from "react-toastify";
import ConfirmationModal from "./ConfirmationModal";
import Button from "../../../components/Button/Button";
import FormInput from "../../../components/forms/FormInput";
import DataTable from "../../../components/patterns/DataTable";
import PageHeader from "../../../components/ui/PageHeader";
import PageContainer from "../../../components/patterns/PageContainer";
import Modal from "../../../components/Modal/modal";
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
      const res = await api.get(`${BASE_URL}/api/approval-rules/all`, {
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
      const res = await api.get(
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
      const res = await api.get(
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
        checkerRole: "hr_administrator",
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
        await api.put(`${BASE_URL}/api/approval-rules/update`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
      } else {
        await api.post(`${BASE_URL}/api/approval-rules/create`, formData, {
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
      await api.delete(`${BASE_URL}/api/approval-rules/delete/${id}`, {
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
    <PageContainer density="comfortable" className="max-w-6xl mx-auto">
      {/* HEADER */}
      <PageHeader
        title="Approval Rules"
        actions={
          <Button
            variant="primary"
            onClick={() => openModal()}
            className="flex items-center gap-2 rounded-xl shadow"
          >
            <Plus className="w-5 h-5" /> Add Rule
          </Button>
        }
      />

      {/* TABLE */}
      <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
        <DataTable
          loading={loading}
          emptyTitle="No approval rules found"
          getRowKey={(rule) => rule.id}
          columns={[
            { key: "actionType", header: "Action" },
            { key: "makerRole", header: "Maker" },
            { key: "checkerRole", header: "Checker" },
            {
              key: "approvalLevel",
              header: "Level",
              className: "text-center",
            },
            { key: "approvalCondition", header: "Condition" },
            { key: "approverType", header: "Approver Type" },
            {
              key: "actions",
              header: "Actions",
              className: "text-center",
              render: (rule) => (
                <div className="flex justify-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openModal(rule)}
                    className="text-indigo-600 hover:text-indigo-800"
                    aria-label="Edit rule"
                  >
                    <Pencil className="w-5 h-5" />
                  </Button>

                  <Button
                    variant="danger"
                    size="icon"
                    onClick={() => confirmDelete(rule.id)}
                    className="text-red-600 hover:text-red-800"
                    aria-label="Delete rule"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              ),
            },
          ]}
          rows={rules}
        />
      </div>

      {/* ===================== MODAL ===================== */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingRule ? "Edit Rule" : "Add New Rule"}
        size="md"
        closeOnBackdrop={false}
        closeOnEscape={false}
        showCloseButton={true}
      >
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  className="shadow"
                  disabled={loading}
                >
                  Save
                </Button>
              </div>
            </form>
      </Modal>

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
    </PageContainer>
  );
}

/* ---------------------- Reusable Components ---------------------- */

function InputField({ label, value, onChange, type = "text" }) {
  return (
    <FormInput
      label={label}
      name={
        label
          ? label.replace(/\s+/g, "").replace(/^./, (c) => c.toLowerCase())
          : undefined
      }
      type={type}
      value={value}
      onChange={onChange}
      inputClassName="focus:ring-2 focus:ring-indigo-500"
    />
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
