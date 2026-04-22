import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

import TaskBoard from "./components/TaskBoard";
import AddTaskModal from "./components/AddTaskModal";
import useApiConfig from "./hooks/useApiConfig";
import { showStatusToast } from "../../../components/toastfy/toast";

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

const getAssigneeName = (assignee = {}) =>
  assignee.name || assignee.full_name || assignee.mail || assignee.email || "Unassigned";

const getAssigneeValue = (assignee = {}) =>
  assignee.user_id ||
  assignee.id ||
  assignee.user_uuid ||
  assignee.mail ||
  assignee.email ||
  assignee.name ||
  "";

const normalizeTask = (task, employeeMap, assigneeMap) => {
  const employeeRecord = employeeMap.get(String(task.user_uuid || ""));
  const assigneeRecord = assigneeMap.get(String(task.assigned_to || ""));

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
    employee: employeeRecord ? getEmployeeName(employeeRecord) : "",
    assigned_to: task.assigned_to,
    assignedTo: assigneeRecord ? getAssigneeName(assigneeRecord) : "",
  };
};

export default function OnboardingTask() {
  const { BASE_URL, headers } = useApiConfig();

  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const TASKS_API = `${BASE_URL}/api/tasks`;
  const EMPLOYEES_API = `${BASE_URL}/permanent-employee/core-employee-details/`;
  const ASSIGNEES_API = `${BASE_URL}/offer-approval/admin-users`;

  const employeeMap = useMemo(() => {
    const map = new Map();
    employees.forEach((e) => {
      if (e.user_uuid) map.set(String(e.user_uuid), e);
    });
    return map;
  }, [employees]);

  const assigneeMap = useMemo(() => {
    const map = new Map();
    assignees.forEach((a) => {
      [
        a.user_id,
        a.id,
        a.user_uuid,
        a.mail,
        a.email,
        a.name,
      ]
        .filter(Boolean)
        .forEach((key) => map.set(String(key), a));
    });
    return map;
  }, [assignees]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${TASKS_API}/all`, { headers });
      const data = Array.isArray(res.data) ? res.data : res.data.tasks || [];
      setTasks(data.map((t) => normalizeTask(t, employeeMap, assigneeMap)));
    } catch {
      setError("Failed to fetch tasks");
      showStatusToast("Failed to fetch tasks", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      setOptionsLoading(true);
      const [empRes, assRes] = await Promise.all([
        axios.get(EMPLOYEES_API, { headers }),
        axios.get(ASSIGNEES_API, { headers }),
      ]);

      setEmployees(empRes.data || []);
      setAssignees(assRes.data || []);
    } catch {
      showStatusToast("Failed to load options", "error");
    } finally {
      setOptionsLoading(false);
    }
  };

  useEffect(() => {
    if (BASE_URL) {
      fetchOptions();
      fetchTasks();
    }
  }, [BASE_URL]);

const buildTaskPayload = (task) => {
  return {
    user_uuid: task.user_uuid,
    task_title: task.title,
    task_type: task.taskType,
    description: task.description || "",

    assigned_to: task.assigned_to, // ✅ FIXED

    assigned_team: "IT Team",
    priority: task.priority,

    status:
      task.status === "todo"
        ? "To Do"
        : task.status === "progress"
        ? "In Progress"
        : "Completed",

    progress: task.progress || 0,
    due_date: task.dueDate || null,
    reminder_date: task.reminderDate || null,
  };
};
  const handleCreateTask = async (task) => {
    try {
      setSaving(true);
      await axios.post(`${TASKS_API}/create`, buildTaskPayload(task), { headers });
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
      await axios.put(
        `${TASKS_API}/update/${selectedTask.task_uuid}`,
        buildTaskPayload(task),
        { headers }
      );
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
    await axios.delete(`${TASKS_API}/delete/${id}`, { headers });
    fetchTasks();
  };

  const groupedTasks = {
    todo: tasks.filter((t) => t.status === "todo"),
    progress: tasks.filter((t) => t.status === "progress"),
    completed: tasks.filter((t) => t.status === "completed"),
  };

  return (
    <div style={{ padding: 24 }}>
      <button onClick={() => { setSelectedTask(null); setShowModal(true); }}>
        + Add Task
      </button>

      <TaskBoard
        tasks={groupedTasks}
        onCardClick={(task) => {
          setSelectedTask(task);
          setShowModal(true);
        }}
        onDelete={deleteTask}
      />

      <AddTaskModal
        isOpen={showModal}
        mode={selectedTask ? "edit" : "create"}
        initialData={
          selectedTask
            ? {
                ...selectedTask,

                // ✅ FIX: convert backend value → dropdown value
                assigned_to:
                  assignees.find(
                    (a) =>
                      a.name === selectedTask.assigned_to ||
                      a.mail === selectedTask.assigned_to ||
                      a.email === selectedTask.assigned_to
                  )?.user_id || "",
              }
            : null
        }
        onClose={() => {
          setShowModal(false);
          setSelectedTask(null);
        }}
        employees={employees.map((e) => ({
          value: e.user_uuid,
          label: getEmployeeName(e),
        }))}
        assignees={assignees.map((a) => ({
          value: getAssigneeValue(a),
          label: getAssigneeName(a),
        }))}
        onSave={(task) => {
          if (selectedTask) handleUpdateTask(task);
          else handleCreateTask(task);
        }}
      />
    </div>
  );
}
