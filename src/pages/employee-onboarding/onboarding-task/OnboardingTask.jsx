import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

import TaskBoard from "./components/TaskBoard";
import AddTaskModal from "./components/AddTaskModal";
import useApiConfig from "./hooks/useApiConfig";

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

const getEmployeeOptionLabel = (employee) => getEmployeeName(employee);

const getAssigneeName = (assignee = {}) =>
  assignee.name || assignee.full_name || assignee.mail || assignee.email || "Unassigned";

const getAssigneeValue = (assignee = {}) =>
  assignee.user_uuid ||
  assignee.userUuid ||
  assignee.mail ||
  assignee.email ||
  assignee.name ||
  "";

const normalizeTask = (task, employeeMap, assigneeMap) => {
  const employeeKeyCandidates = [
    task.employee_uuid,
    task.employee_id,
    task.employee_user_uuid,
    task.user_uuid,
  ].filter(Boolean);

  const assigneeKeyCandidates = [
    task.assigned_to,
    task.assigned_to_uuid,
    task.assignee_uuid,
    task.assignee_email,
    task.assignedTo,
  ].filter(Boolean);

  const employeeRecord = employeeKeyCandidates
    .map((key) => employeeMap.get(String(key)))
    .find(Boolean);

  const assigneeRecord = assigneeKeyCandidates
    .map((key) => assigneeMap.get(String(key)))
    .find(Boolean);

  return {
    ...task,
    task_uuid: task.task_uuid || task.uuid || task.id,
    title: task.title || task.task_title || task.task_name || task.name || "Untitled Task",
    description: task.description || task.task_description || "",
    status: normalizeStatus(task.status || task.task_status || task.state),
    priority: String(task.priority || task.priority_level || "medium").toLowerCase(),
    dueDate: task.dueDate || task.due_date || "",
    reminderDate: task.reminderDate || task.reminder_date || "",
    taskType: task.taskType || task.task_type || "Onboarding",
    employee_uuid:
      task.employee_uuid ||
      task.employee_id ||
      task.employee_user_uuid ||
      task.user_uuid ||
      employeeRecord?.employee_uuid ||
      employeeRecord?.user_uuid ||
      "",
    employee:
      task.employee ||
      task.employee_name ||
      task.employee_full_name ||
      (employeeRecord ? getEmployeeName(employeeRecord) : ""),
    user_uuid: task.user_uuid || task.employee_user_uuid || employeeRecord?.user_uuid || "",
    assigned_to:
      task.assigned_to ||
      task.assigned_to_uuid ||
      task.assignee_uuid ||
      task.assignee_email ||
      task.assignedTo ||
      "",
    assignedTo:
      task.assignedTo ||
      task.assigned_to_name ||
      task.assignee_name ||
      (assigneeRecord ? getAssigneeName(assigneeRecord) : "") ||
      task.assigned_to ||
      "Unassigned",
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

    employees.forEach((employee) => {
      [
        employee.employee_uuid,
        employee.user_uuid,
        employee.employee_id,
      ]
        .filter(Boolean)
        .forEach((key) => map.set(String(key), employee));
    });

    return map;
  }, [employees]);

  const assigneeMap = useMemo(() => {
    const map = new Map();

    assignees.forEach((assignee) => {
      [
        assignee.user_uuid,
        assignee.userUuid,
        assignee.mail,
        assignee.email,
        assignee.name,
      ]
        .filter(Boolean)
        .forEach((key) => map.set(String(key), assignee));
    });

    return map;
  }, [assignees]);

  const fetchTasks = async (currentEmployeeMap = employeeMap, currentAssigneeMap = assigneeMap) => {
    try {
      setLoading(true);

      const res = await axios.get(`${TASKS_API}/all`, { headers });
      const data = Array.isArray(res.data) ? res.data : res.data.tasks || [];

      setTasks(
        data.map((task) => normalizeTask(task, currentEmployeeMap, currentAssigneeMap)),
      );
      setError(null);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  };

  const fetchAddTaskOptions = async () => {
    try {
      setOptionsLoading(true);

      const [employeesRes, assigneesRes] = await Promise.all([
        axios.get(EMPLOYEES_API, { headers }),
        axios.get(ASSIGNEES_API, { headers }),
      ]);

      const employeeList = Array.isArray(employeesRes.data)
        ? employeesRes.data
        : employeesRes.data.data || [];
      const assigneeList = Array.isArray(assigneesRes.data)
        ? assigneesRes.data
        : assigneesRes.data.data || [];

      setEmployees(employeeList);
      setAssignees(assigneeList);

      const nextEmployeeMap = new Map();
      employeeList.forEach((employee) => {
        [employee.employee_uuid, employee.user_uuid, employee.employee_id]
          .filter(Boolean)
          .forEach((key) => nextEmployeeMap.set(String(key), employee));
      });

      const nextAssigneeMap = new Map();
      assigneeList.forEach((assignee) => {
        [
          assignee.user_uuid,
          assignee.userUuid,
          assignee.mail,
          assignee.email,
          assignee.name,
        ]
          .filter(Boolean)
          .forEach((key) => nextAssigneeMap.set(String(key), assignee));
      });

      await fetchTasks(nextEmployeeMap, nextAssigneeMap);
    } catch (err) {
      console.error("Failed to fetch add-task options:", err);
      setError("Failed to load employee and assignee options");
    } finally {
      setOptionsLoading(false);
    }
  };

  useEffect(() => {
    if (!BASE_URL) {
      console.error("Employee onboarding base URL is not configured");
      return;
    }

    fetchAddTaskOptions();
  }, [BASE_URL]);

  const employeeOptions = useMemo(
    () =>
      employees
        .filter((employee) => employee.employee_uuid || employee.user_uuid)
        .map((employee) => ({
          value: employee.employee_uuid || employee.user_uuid,
          label: getEmployeeOptionLabel(employee),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [employees],
  );

  const assigneeOptions = useMemo(
    () =>
      assignees
        .map((assignee) => ({
          value: getAssigneeValue(assignee),
          label: `${getAssigneeName(assignee)}${
            assignee.mail ? ` (${assignee.mail})` : ""
          }`,
        }))
        .filter((assignee) => assignee.value)
        .sort((a, b) => a.label.localeCompare(b.label)),
    [assignees],
  );

  const buildTaskPayload = (task, currentTask = null) => {
    const selectedEmployee =
      employeeMap.get(String(task.employee_uuid)) ||
      employeeMap.get(String(currentTask?.employee_uuid || "")) ||
      null;
    const selectedAssignee =
      assigneeMap.get(String(task.assigned_to)) ||
      assigneeMap.get(String(currentTask?.assigned_to || "")) ||
      null;

    return {
      ...currentTask,
      title: task.title,
      description: task.description,
      task_type: task.taskType,
      status: normalizeStatus(task.status || currentTask?.status || "todo"),
      priority: task.priority,
      due_date: task.dueDate || null,
      reminder_date: task.reminderDate || null,
      employee_uuid: task.employee_uuid || null,
      employee_name: selectedEmployee ? getEmployeeName(selectedEmployee) : "",
      user_uuid: selectedEmployee?.user_uuid || currentTask?.user_uuid || null,
      assigned_to: task.assigned_to || null,
      assigned_to_name: selectedAssignee ? getAssigneeName(selectedAssignee) : "",
      assigned_to_uuid:
        selectedAssignee?.user_uuid || selectedAssignee?.userUuid || currentTask?.assigned_to_uuid || null,
    };
  };

  const handleCreateTask = async (task) => {
    try {
      setSaving(true);
      const payload = buildTaskPayload(task);
      await axios.post(`${TASKS_API}/create`, payload, { headers });
      await fetchTasks();
      setShowModal(false);
    } catch (err) {
      console.error("Create error:", err);
      setError("Failed to create task");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTask = async (task) => {
    try {
      setSaving(true);
      const payload = buildTaskPayload(task, selectedTask);
      await axios.put(`${TASKS_API}/update/${selectedTask.task_uuid}`, payload, {
        headers,
      });
      await fetchTasks();
      setSelectedTask(null);
      setShowModal(false);
    } catch (err) {
      console.error("Update error:", err);
      setError("Failed to update task");
    } finally {
      setSaving(false);
    }
  };

  const deleteTask = async (taskUuid) => {
    try {
      await axios.delete(`${TASKS_API}/delete/${taskUuid}`, {
        headers,
      });
      await fetchTasks();
    } catch (err) {
      console.error("Delete error:", err);
      setError("Failed to delete task");
    }
  };

  const groupedTasks = {
    todo: tasks.filter((task) => normalizeStatus(task.status) === "todo"),
    progress: tasks.filter((task) => normalizeStatus(task.status) === "progress"),
    completed: tasks.filter(
      (task) => normalizeStatus(task.status) === "completed",
    ),
  };

  const stats = [
    { label: "Total Tasks", value: tasks.length },
    { label: "To Do", value: groupedTasks.todo.length },
    { label: "In Progress", value: groupedTasks.progress.length },
    { label: "Completed", value: groupedTasks.completed.length },
  ];

  const modalInitialData = selectedTask
    ? {
        title: selectedTask.title || "",
        taskType: selectedTask.taskType || "Onboarding",
        employee_uuid: selectedTask.employee_uuid || "",
        assigned_to: selectedTask.assigned_to || "",
        priority: selectedTask.priority || "medium",
        dueDate: selectedTask.dueDate || "",
        reminderDate: selectedTask.reminderDate || "",
        description: selectedTask.description || "",
        status: selectedTask.status || "todo",
      }
    : null;

  return (
    <div
      style={{
        padding: 24,
        background: "linear-gradient(180deg, #f8fafc 0%, #eef4ff 100%)",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 32, color: "#0f172a", fontWeight: 700 }}>
            Onboarding Tasks
          </h1>
          <p style={{ margin: "8px 0 0", color: "#475569" }}>
            Manage employee onboarding tasks with clear owners, due dates, and status updates.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedTask(null);
            setShowModal(true);
          }}
          style={{
            background: "#0f172a",
            color: "#fff",
            border: "none",
            padding: "12px 18px",
            borderRadius: 12,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 10px 25px rgba(15,23,42,0.18)",
          }}
        >
          + Add Task
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: 20,
        }}
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "#ffffff",
              borderRadius: 16,
              padding: 18,
              boxShadow: "0 10px 30px rgba(15,23,42,0.07)",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
              {stat.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#0f172a" }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {loading && <p style={{ color: "#334155" }}>Loading tasks...</p>}
      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

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
        initialData={modalInitialData}
        onClose={() => {
          setShowModal(false);
          setSelectedTask(null);
        }}
        employees={employeeOptions}
        assignees={assigneeOptions}
        loadingOptions={optionsLoading || saving}
        onSave={(task) => {
          if (selectedTask) {
            handleUpdateTask(task);
            return;
          }

          handleCreateTask(task);
        }}
      />
    </div>
  );
}
