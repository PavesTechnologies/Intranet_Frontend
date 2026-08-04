import React, { useEffect, useState } from "react";
import api from "../../../../api/axiosInstance";
import EditTaskForm from "../../../../components/Backlog/EditTaskForm";

const TaskDetailsPanel = ({ taskId, projectId, onClose, onUpdated }) => {
  const [loading, setLoading] = useState(false);

  // If nothing selected, do not render
  if (!taskId) return null;

  return (
    <div className="p-6 overflow-y-auto h-full bg-white">
      <h2 className="text-xl font-semibold mb-4">Edit Task</h2>

      {/* Only the form handles loading — similar to StoryDetailsPanel */}
      <EditTaskForm
        taskId={taskId}
        projectId={projectId}
        onClose={onClose}
        onUpdated={onUpdated}
      />
    </div>
  );
};

export default TaskDetailsPanel;
