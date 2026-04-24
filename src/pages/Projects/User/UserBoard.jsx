import React, { useEffect, useState } from "react";
import axios from "axios";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

const getColumnStyles = () => ({
  header:
    "bg-indigo-900 text-white rounded-t-2xl font-bold text-lg py-3 text-center",
  body: "bg-white rounded-b-2xl p-4 flex-1 min-h-[500px]",
  container:
    "rounded-2xl shadow-lg border border-gray-300 flex flex-col flex-1",
});

const KanbanCard = ({ task }) => {
  const [{ isDragging }, dragRef] = useDrag({
    type: "TASK",
    item: { id: task.id, statusId: task.statusId },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={dragRef}
      className={`bg-white rounded-2xl shadow p-4 mb-3 cursor-move border border-gray-200 hover:shadow-lg transition ${
        isDragging ? "opacity-50" : "opacity-100"
      }`}
    >
      <p className="text-xs text-indigo-500 uppercase tracking-wide mb-1">
        Task
      </p>
      <p className="font-semibold text-gray-800">{task.title}</p>
    </div>
  );
};

const KanbanColumn = ({ status, tasks, onDrop }) => {
  const { header, body, container } = getColumnStyles();

  const [{ isOver }, dropRef] = useDrop({
    accept: "TASK",
    drop: (item) => {
      if (item.statusId !== status.id) {
        onDrop(item.id, status.id);
        item.statusId = status.id;
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  return (
    <div className={container}>
      <div className={header}>{status.name.replace(/_/g, " ")}</div>
      <div ref={dropRef} className={`${body} ${isOver ? "bg-indigo-50" : ""}`}>
        {tasks.length === 0 ? (
          <p className="text-gray-400 italic">No tasks</p>
        ) : (
          tasks.map((task) => <KanbanCard key={task.id} task={task} />)
        )}
      </div>
    </div>
  );
};

const Board = ({ projectId, projectName }) => {
  const [tasks, setTasks] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchBoardData = async () => {
      try {
        // Load statuses dynamically
        const statusRes = await axios.get(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/statuses`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        const sortedStatuses = statusRes.data.sort(
          (a, b) => a.sortOrder - b.sortOrder,
        );
        setStatuses(sortedStatuses);

        // Load tasks
        const taskRes = await axios.get(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/tasks`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        setTasks(taskRes.data);
      } catch (error) {
        console.error("Error loading board:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBoardData();
  }, [projectId, token]);

  const handleDrop = async (taskId, newStatusId) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const updatedTask = { ...task, statusId: newStatusId };

    try {
      await axios.put(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/tasks/${taskId}`,
        updatedTask,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
    } catch (err) {
      console.error("Failed to update task:", err);
    }
  };

  if (loading) return <div className="p-6">Loading board...</div>;

  // Group tasks by backend statusId
  const groupedTasks = {};
  statuses.forEach((s) => {
    groupedTasks[s.id] = tasks.filter((task) => task.statusId === s.id);
  });

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-6 min-h-screen">
        <h3 className="text-xl font-semibold mb-6 text-indigo-900">
          Scrum Board: {projectName}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statuses.map((status) => (
            <KanbanColumn
              key={status.id}
              status={status}
              tasks={groupedTasks[status.id] || []}
              onDrop={handleDrop}
            />
          ))}
        </div>
      </div>
    </DndProvider>
  );
};

export default Board;
