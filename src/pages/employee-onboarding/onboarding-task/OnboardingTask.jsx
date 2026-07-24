import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api/axiosInstance" ;

import TaskBoard from "./components/TaskBoard";
import AddTaskModal from "./components/AddTaskModal";
import useApiConfig from "./hooks/useApiConfig";
import { showStatusToast } from "../../../components/toastfy/toast";
import Button from "../../../components/Button/Button";
import { PageCard, PageCardContent } from "../../../components/Cards/PageCard";
import ConfirmationModal from "../../../components/confirmation_modal/ConfirmationModal";
import PageHeader from "../../../components/ui/PageHeader";

const normalizeStatus = (status) => {
  if (!status) return "todo";
  const normalized = String(status).toLowerCase();
  if (normalized.includes("progress")) return "progress";
  if (normalized.includes("complete")) return "completed";
  return "todo";
};

const getEmployeeName = (employee = {}) => {
  const fullName =
    employee.full_name ||
    [employee.first_name, employee.middle_name, employee.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();

  return (
    fullName ||
    employee.employee_name ||
    employee.work_email ||
    employee.email ||
    employee.employee_id ||
    "Unknown Employee"
  );
};

const normalizeTask = (task, employeeMap) => {
  const employeeRecord = employeeMap.get(String(task.user_uuid || ""));
  const assignee = employeeMap.get(String(task.assigned_to || ""));

  return {
    ...task,
    task_uuid: task.task_uuid,
    title: task.task_title,
    description: task.description || "",
    status: normalizeStatus(task.status),
    priority: String(task.priority || "medium").toLowerCase(),
    dueDate: task.due_date || "",
    reminderDate: task.reminder_date || "",
    taskType: task.task_type || "Onboarding",
    user_uuid: task.user_uuid,
    employee: employeeRecord ? getEmployeeName(employeeRecord) : task.employee,
    assignedTo: assignee ? getEmployeeName(assignee) : "Unassigned",
  };
};

export default function OnboardingTask() {
  const { BASE_URL, headers } = useApiConfig();

  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);

  const TASKS_API = `${BASE_URL}/api/tasks`;
  const EMPLOYEES_API = `${BASE_URL}/permanent-employee/core-employee-details/`;

  const employeeMap = useMemo(() => {
    const map = new Map();
    employees.forEach((employee) => {
      if (employee.user_uuid) {
        map.set(String(employee.user_uuid), employee);
      }
    });
    return map;
  }, [employees]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get(`${TASKS_API}/all`, { headers });
      const data = Array.isArray(res.data) ? res.data : res.data.tasks || [];
      setTasks(data.map((task) => normalizeTask(task, employeeMap)));
    } catch {
      showStatusToast("Failed to fetch tasks", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const empRes = await api.get(EMPLOYEES_API, { headers });
      setEmployees(empRes.data || []);
    } catch {
      showStatusToast("Failed to load options", "error");
    }
  };

  useEffect(() => {
    if (BASE_URL) {
      fetchOptions();
    }
  }, [BASE_URL]);

  useEffect(() => {
    if (BASE_URL && employees.length) {
      fetchTasks();
    }
  }, [BASE_URL, employees.length]);

  useEffect(() => {
    if (tasks.length && employees.length) {
      setTasks((prev) => prev.map((task) => normalizeTask(task, employeeMap)));
    }
  }, [employees, employeeMap]);

  const buildTaskPayload = (task) => ({
    user_uuid: task.user_uuid,
    task_title: task.task_title,
    task_type: task.task_type || task.taskType,
    description: task.description || "",
    assigned_to: task.assigned_to,
    assigned_team: "IT Team",
    priority: task.priority,
    status:
      task.status === "todo"
        ? "To Do"
        : task.status === "progress"
          ? "In Progress"
          : "Completed",
    progress: task.progress || 0,
    due_date: task.dueDate || new Date().toISOString().split("T")[0],
    reminder_date:
      task.reminderDate || task.dueDate || new Date().toISOString().split("T")[0],
    updated_by: "Admin",
  });

  const handleCreateTask = async (task) => {
    try {
      setSaving(true);
      await api.post(`${TASKS_API}/create`, task, { headers });
      await fetchTasks();
      showStatusToast("Task created successfully", "success");
      setShowModal(false);
    } catch {
      showStatusToast("Failed to create task", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTask = async (task) => {
    try {
      setSaving(true);
      // Use the payload directly from AddTaskModal — it already maps status correctly
      // Do NOT re-map through buildTaskPayload, which would double-map status strings
      const payload = {
        ...task,
        updated_by: "Admin",
      };
      await api.put(`${TASKS_API}/update/${selectedTask.task_uuid}`, payload, {
        headers,
      });
      await fetchTasks();
      showStatusToast("Task updated successfully", "success");
      setShowModal(false);
      setSelectedTask(null);
    } catch {
      showStatusToast("Failed to update task", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteTask = async (id) => {
    try {
      setDeleting(true);
      await api.delete(`${TASKS_API}/delete/${id}`, { headers });
      showStatusToast("Task deleted successfully", "success");
      await fetchTasks();
      setTaskToDelete(null);
    } catch {
      showStatusToast("Failed to delete task", "error");
    } finally {
      setDeleting(false);
    }
  };

  const groupedTasks = {
    todo: tasks.filter((task) => task.status === "todo"),
    progress: tasks.filter((task) => task.status === "progress"),
    completed: tasks.filter((task) => task.status === "completed"),
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Task Management"
        subtitle="Configure and track onboarding tasks across each workflow stage."
        actions={
          <Button
            onClick={() => {
              setSelectedTask(null);
              setShowModal(true);
            }}
            variant="primary"
            size="medium"
          >
            + Add Task
          </Button>
        }
      />

      <PageCard className="border-slate-200">
        <PageCardContent className="p-6 md:p-8">
          <TaskBoard
            tasks={groupedTasks}
            loading={loading}
            onCardClick={(task) => {
              setSelectedTask(task);
              setShowModal(true);
            }}
            onDelete={(task) => setTaskToDelete(task)}
          />
        </PageCardContent>
      </PageCard>

      <AddTaskModal
        isOpen={showModal}
        mode={selectedTask ? "edit" : "create"}
        saving={saving}
        initialData={
          selectedTask
            ? {
                ...selectedTask,
                assigned_to: selectedTask.assigned_to,
              }
            : null
        }
        onClose={() => {
          if (saving) return;
          setShowModal(false);
          setSelectedTask(null);
        }}
        employees={employees.map((employee) => ({
          value: employee.user_uuid,
          label: getEmployeeName(employee),
        }))}
        assignees={employees.map((employee) => ({
          value: employee.user_uuid,
          label: getEmployeeName(employee),
        }))}
        onSave={(task) => {
          if (selectedTask) handleUpdateTask(task);
          else handleCreateTask(task);
        }}
      />

      <ConfirmationModal
        isOpen={Boolean(taskToDelete)}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleting}
        onCancel={() => {
          if (deleting) return;
          setTaskToDelete(null);
        }}
        onConfirm={() => {
          if (taskToDelete) {
            deleteTask(taskToDelete.task_uuid);
          }
        }}
      />
    </div>
  );
}
