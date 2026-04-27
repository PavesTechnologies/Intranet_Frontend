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
  assignee.user_uuid ||
  assignee.user_id ||
  assignee.id ||
  "";
// const normalizeTask = (task, employeeMap, assigneeMap) => {
//   const employeeRecord = employeeMap.get(String(task.user_uuid || ""));
//   const assigneeRecord = assigneeMap.get(String(task.assigned_to || ""));

//   return {
//     ...task,
//     task_uuid: task.task_uuid,
//     title: task.task_title,
//     description: task.description || "",
//     status: normalizeStatus(task.status),
//     priority: String(task.priority || "medium").toLowerCase(),
//     dueDate: task.due_date || "",
//     reminderDate: task.reminder_date || "",
//     taskType: task.task_type || "Onboarding",
//     user_uuid: task.user_uuid,
//     employee: employeeRecord ? getEmployeeName(employeeRecord) : task.employee,
//    assignedTo:
//   employees.find(e => String(e.user_uuid) === String(task.assigned_to))
//     ? getEmployeeName(
//         employees.find(e => String(e.user_uuid) === String(task.assigned_to))
//       )
//     : "Unassigned",
//   };
// };
const normalizeTask = (task, employeeMap, assigneeMap) => {
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

    employee: employeeRecord
      ? getEmployeeName(employeeRecord)
      : task.employee,

    assignedTo: assignee
      ? getEmployeeName(assignee)
      : "Unassigned",
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
    if (e.user_uuid) {
      map.set(String(e.user_uuid), e);   // ✅ ONLY UUID
    }
  });
  return map;
}, [employees]);

const assigneeMap = useMemo(() => {
  const map = new Map();

  assignees.forEach((a) => {
    const key =
      a.user_uuid

    if (key) {
      map.set(String(key), a);
    }
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
      const empRes = await axios.get(EMPLOYEES_API, { headers });

    setEmployees(empRes.data || []);
    setAssignees(empRes.data || []); // ✅ SAME DATA
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
    task_title: task.task_title,
    task_type: task.task_type || task.taskType, 
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
    due_date:
      task.dueDate ||
      new Date().toISOString().split("T")[0],

    reminder_date:
      task.reminderDate ||
      task.dueDate ||
      new Date().toISOString().split("T")[0],
      updated_by: "Admin",
      };
    
};
 const handleCreateTask = async (task) => {
  try {
    setSaving(true);

    console.log("🚀 FINAL PAYLOAD:", task);
    console.log("🧾 HEADERS:", headers);

    await axios.post(`${TASKS_API}/create`, task, { headers });

    await fetchTasks();
    showStatusToast("Task created successfully", "success");
    setShowModal(false);
  } catch (err) {
    console.log("❌ ERROR:", err.response?.data);
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

  useEffect(() => {
  if (tasks.length && (employees.length || assignees.length)) {
    setTasks((prev) =>
      prev.map((t) => normalizeTask(t, employeeMap, assigneeMap))
    );
  }
}, [employees, assignees]);



  return (
    <div style={{ padding: 24 }}>
      {/* <button onClick={() => { setSelectedTask(null); setShowModal(true); }}>
        + Add Task
      </button> */}
      <div style={{
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px"
}}>
  <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "bold" }}>Task Management</h1>

  <button
    onClick={() => {
      setSelectedTask(null);
      setShowModal(true);
    }}
    style={{
      background: "#3b82f6",
      color: "#fff",
      padding: "10px 18px",
      border: "none",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer",
      boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
      transition: "all 0.2s ease"
    }}
    onMouseEnter={(e) => e.target.style.background = "#2563eb"}
    onMouseLeave={(e) => e.target.style.background = "#3b82f6"}
  >
    + Add Task
  </button>
</div>

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
                assigned_to: selectedTask.assigned_to, // ✅ FIXED
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
       assignees={employees.map((e) => ({
          value: e.user_uuid,           
          label: getEmployeeName(e),    
        }))}
        onSave={(task) => {
          if (selectedTask) handleUpdateTask(task);
          else handleCreateTask(task);
        }}
      />
    </div>
  );
}
