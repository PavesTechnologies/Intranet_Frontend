import React, { useEffect, useState } from "react";
import FilterListbox from "../../../../components/filter/FilterListbox";
import Button from "../../../../components/Button/Button";
import FormInput from "../../../../components/forms/FormInput";
import { Fonts } from "../../../../components/Fonts/Fonts";
import Modal from "../../../../components/Modal/modal";

function ModalHeaderCard({ title, description }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
      <div className="flex items-start gap-4">
        <span className="mt-0.5 h-12 w-1.5 shrink-0 rounded-full bg-indigo-600" />
        <div className="min-w-0">
          <h2 className={Fonts.heading4}>{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
    </div>
  );
}

const normalizeStatusValue = (status) => {
  if (!status) return "todo";
  const normalized = status.toLowerCase();
  if (normalized.includes("progress")) return "progress";
  if (normalized.includes("complete")) return "completed";
  return "todo";
};

const formatDate = (date) => {
  if (!date) return "";
  try {
    return new Date(date).toISOString().split("T")[0];
  } catch {
    return "";
  }
};

const createInitialFormData = (data) => {
  const current = data ?? {};
  const due = formatDate(current.due_date || current.dueDate);
  const reminder = formatDate(current.reminder_date || current.reminderDate);

  return {
    title: current.task_title || current.title || "Untitled Task",
    taskType: current.task_type || current.taskType || "Onboarding",
    user_uuid: String(current.user_uuid || ""),
    assigned_to: String(current.assigned_to || ""),
    assigned_team: current.assigned_team || "IT Team",
    priority: current.priority || "Medium",
    status: normalizeStatusValue(current.status),
    progress: current.progress ?? 0,
    dueDate: due,
    reminderDate: reminder || due,
    description: current.description || "",
    created_by: current.created_by || "Admin",
    updated_by: current.updated_by || "Admin",
  };
};

export default function AddTaskModal({
  isOpen,
  onClose,
  onSave,
  employees = [],
  assignees = [],
  initialData,
  mode = "create",
  saving = false,
}) {
  const [formData, setFormData] = useState(createInitialFormData(initialData));

  useEffect(() => {
    if (isOpen) {
      setFormData(createInitialFormData(initialData));
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "user_uuid") {
      setFormData((previous) => ({ ...previous, user_uuid: value }));
      return;
    }

    if (name === "assigned_to") {
      setFormData((previous) => ({
        ...previous,
        assigned_to: String(value || ""),
      }));
      return;
    }

    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const isFormValid = () => {
    const titleValid =
      formData.title && typeof formData.title === "string" && formData.title.trim();
    const userValid =
      formData.user_uuid &&
      typeof formData.user_uuid === "string" &&
      formData.user_uuid.trim();
    const assignedValid =
      formData.assigned_to &&
      typeof formData.assigned_to === "string" &&
      formData.assigned_to.trim();

    return titleValid && userValid && assignedValid;
  };

  const disabled = !isFormValid() || saving;

  const handleSubmit = () => {
    if (!formData.title || typeof formData.title !== "string" || !formData.title.trim()) {
      alert("Please enter a Task Title");
      return;
    }
    if (
      !formData.user_uuid ||
      typeof formData.user_uuid !== "string" ||
      !formData.user_uuid.trim()
    ) {
      alert("Please select an Employee");
      return;
    }
    if (
      !formData.assigned_to ||
      typeof formData.assigned_to !== "string" ||
      !formData.assigned_to.trim()
    ) {
      alert("Please select who to assign this task to");
      return;
    }

    const payload = {
      user_uuid: formData.user_uuid.trim(),
      task_title: formData.title.trim(),
      task_type: formData.taskType || "Onboarding",
      description: formData.description.trim(),
      assigned_to: formData.assigned_to.trim(),
      assigned_team: formData.assigned_team || "IT Team",
      priority: formData.priority || "Medium",
      status:
        formData.status === "todo"
          ? "To Do"
          : formData.status === "progress"
            ? "In Progress"
            : "Completed",
      progress: parseInt(formData.progress, 10) || 0,
      due_date: formData.dueDate || initialData?.due_date,
      reminder_date: formData.reminderDate || initialData?.reminder_date,
      send_notification: true,
      escalation_owner: "Manager",
      internal_notes: "",
      comments: "",
      created_by: "Admin",
      updated_by: "Admin",
    };

    if (mode === "edit" && initialData?.task_uuid) {
      payload.task_uuid = initialData.task_uuid;
    }

    if (typeof onSave === "function") {
      onSave(payload);
    } else {
      alert("Error: Unable to save task. Please refresh the page and try again.");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? () => {} : onClose}
      size="4xl"
      maxHeight="max-h-[90vh]"
      showHeader={false}
      bodyClassName="p-0"
      panelClassName="overflow-hidden"
      footerClassName="px-6 py-4"
      footer={
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" size="medium" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="medium"
            onClick={handleSubmit}
            disabled={disabled}
            loading={saving}
            loadingText={mode === "edit" ? "Updating..." : "Creating..."}
          >
            {mode === "edit" ? "Update Task" : "Create Task"}
          </Button>
        </div>
      }
    >
      <div className="px-6 py-5">
        <ModalHeaderCard
          title={mode === "edit" ? "Edit Task" : "Create Task"}
          description="Configure the employee, owner, priority, and dates for this task."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 px-6 pb-6 md:grid-cols-2">
        <div className="md:col-span-2">
          <FormInput name="title" label="Task Title" value={formData.title} onChange={handleChange} />
        </div>

        <Field label="Employee">
          <FilterListbox
            options={[{ value: "", label: "Select" }, ...employees]}
            value={String(formData.user_uuid)}
            onChange={(value) => handleChange({ target: { name: "user_uuid", value } })}
          />
        </Field>

        <Field label="Assigned To">
          <FilterListbox
            options={[{ value: "", label: "Select" }, ...assignees]}
            value={String(formData.assigned_to)}
            onChange={(value) => handleChange({ target: { name: "assigned_to", value } })}
          />
        </Field>

        <Field label="Priority">
          <FilterListbox
            options={[
              { value: "High", label: "High" },
              { value: "Medium", label: "Medium" },
              { value: "Low", label: "Low" },
            ]}
            value={formData.priority}
            onChange={(value) => handleChange({ target: { name: "priority", value } })}
          />
        </Field>

        <Field label="Status">
          <FilterListbox
            options={[
              { value: "todo", label: "To Do" },
              { value: "progress", label: "In Progress" },
              { value: "completed", label: "Completed" },
            ]}
            value={formData.status}
            onChange={(value) => handleChange({ target: { name: "status", value } })}
          />
        </Field>

        <Field label="Task Type">
          <FilterListbox
            options={[
              { value: "Onboarding", label: "Onboarding" },
              { value: "Exit", label: "Exit" },
              { value: "IT Provisioning", label: "IT Provisioning" },
              { value: "Finance Clearance", label: "Finance Clearance" },
              { value: "Admin", label: "Admin" },
            ]}
            value={formData.taskType}
            onChange={(value) => handleChange({ target: { name: "taskType", value } })}
          />
        </Field>

        <FormInput
          type="date"
          name="dueDate"
          label="Due Date"
          value={formData.dueDate}
          onChange={handleChange}
        />

        <FormInput
          type="date"
          name="reminderDate"
          label="Reminder Date"
          value={formData.reminderDate}
          onChange={handleChange}
        />

        <div className="md:col-span-2">
          <label className={`${Fonts.label} mb-1 block`}>Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="min-h-24 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm outline-none transition focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20"
          />
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <label className={Fonts.label}>{label}</label>
      {children}
    </div>
  );
}
