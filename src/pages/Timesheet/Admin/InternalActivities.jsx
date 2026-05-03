import axios from "axios";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Pencil, CheckCircle, XCircle, Trash2 } from "lucide-react";
import Button from "../../../components/Button/Button";
import LoadingSpinner from "../../../components/LoadingSpinner";

const InternalActivities = () => {
  const [internalActivities, setInternalActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [addTaskField, setAddTaskField] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [tempTaskName, setTempTaskName] = useState("");

  const fetchInternalActivities = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${
          window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT
        }/api/internal-projects/all`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      setInternalActivities(res.data);
    } catch (err) {
      console.log("failed to fetch internal activities: ", err);
      toast.error(
        err?.response?.data || "Failed to fetch internal activities.",
      );
    } finally {
      setLoading(false);
    }
  };

  const addTask = async () => {
    if (!newTaskName.trim()) {
      toast.error("Task name cannot be empty.");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(
        `${
          window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT
        }/api/internal-projects/create`,
        {
          taskName: newTaskName,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      setNewTaskName("");
      setAddTaskField(false);
      fetchInternalActivities();
      toast.success(res?.data || "Task added successfully");
    } catch (err) {
      console.log("failed to add task: ", err);
      toast.error(err?.response?.data || "Failed to add task.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = () => {
    setAddTaskField(!addTaskField);
    setNewTaskName("");
  };

  const handleEdit = (activites) => {
    setEditingTaskId(activites.id);
    setTempTaskName(activites.taskName);
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setTempTaskName("");
  };

  const updateTaskName = async (id) => {
    if (!tempTaskName.trim()) {
      toast.error("Task name cannot be empty.");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.put(
        `${
          window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT
        }/api/internal-projects/${id}`,
        { taskName: tempTaskName },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      setEditingTaskId(null);
      setTempTaskName("");
      fetchInternalActivities();
      toast.success(res?.data || "Task updated successfully");
    } catch (err) {
      console.log("failed to update task: ", err);
      toast.error(err?.response?.data || "Failed to update task.");
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async (id) => {
    const confirmed = window.confirm("Are you sure you want to delete?");
    if (!confirmed) {
      return;
    }

    setLoading(true);
    try {
      const res = await axios.delete(
        `${
          window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT
        }/api/internal-projects/${id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      setEditingTaskId(null);
      setTempTaskName("");
      fetchInternalActivities();
      toast.success(res?.data || "Task deleted successfully");
    } catch (err) {
      console.log("failed to delete task: ", err);
      toast.error(err?.response?.data || "Failed to delete task.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInternalActivities();
  }, []);

  return (
    <div>
      {loading ? (
        <LoadingSpinner text="Loading Internal Activities..." />
      ) : (
        <div>
          <div className="max-h-[50vh] overflow-y-auto border rounded-lg shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 bg-gray-100 uppercase tracking-wider sticky top-0 z-10">
                    Task Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 bg-gray-100 uppercase tracking-wider sticky top-0 z-10">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {internalActivities.map((activites) => (
                  <tr key={activites.id}>
                    <td className="w-full px-4 py-2 whitespace-nowrap">
                      {editingTaskId === activites.id ? (
                        <input
                          type="text"
                          name="task"
                          value={tempTaskName}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                          onChange={(e) => setTempTaskName(e.target.value)}
                        />
                      ) : (
                        <div className="text-sm font-medium text-gray-900">
                          {activites.taskName}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {editingTaskId === activites.id ? (
                        <div className="flex items-center gap-3">
                          <CheckCircle
                            className="text-green-600 hover:text-green-800 w-6 h-6 cursor-pointer"
                            onClick={() => updateTaskName(activites.id)}
                            title="Save"
                          />
                          <XCircle
                            className="text-red-500 hover:text-red-800 w-6 h-6 cursor-pointer"
                            onClick={handleCancelEdit}
                            title="Cancel"
                          />
                          <Trash2
                            className="text-red-500 hover:text-red-800 w-6 h-6 cursor-pointer"
                            onClick={() => deleteTask(activites.id)}
                            title="Delete"
                          />
                        </div>
                      ) : (
                        <button
                          title="Edit"
                          onClick={() => handleEdit(activites)}
                          disabled={editingTaskId !== null}
                        >
                          <Pencil
                            width={15}
                            height={15}
                            className={`
                    ${
                      editingTaskId !== null
                        ? "text-gray-400"
                        : "text-blue-500 hover:text-blue-800"
                    } 
                    transition-colors
                  `}
                          />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {addTaskField && (
            <div className="flex items-center justify-start gap-3 mt-4">
              <input
                type="text"
                name="newTaskName"
                id="newTaskName"
                placeholder="Task Name"
                value={newTaskName}
                className="w-1/2 px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                onChange={(e) => setNewTaskName(e.target.value)}
              />
              <button title="Add" onClick={addTask} disabled={loading}>
                <CheckCircle
                  className={`w-6 h-6 ${
                    loading ? "text-gray-500" : "text-green-500"
                  }`}
                />
              </button>
              <button
                title="Cancel"
                onClick={() => setAddTaskField(false)}
                disabled={loading}
              >
                <XCircle
                  className={`w-6 h-6 ${
                    loading ? "text-gray-500" : "text-red-500"
                  }`}
                />
              </button>
            </div>
          )}

          <div className="z-20 sticky mt-4">
            <Button
              size="small"
              variant="primary"
              onClick={handleAddTask}
              disabled={editingTaskId !== null || loading}
            >
              + Add Task
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InternalActivities;
