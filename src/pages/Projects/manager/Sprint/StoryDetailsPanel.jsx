import React, { useEffect, useState } from "react";
import api from "../../../../api/axiosInstance";
import EditStoryForm from "../../../../components/Backlog/EditStoryForm";

const StoryDetailsPanel = ({ storyId, projectId, onClose, onUpdated }) => {
  const [loading, setLoading] = useState(false);

  // If no story selected, don't render anything
  if (!storyId) return null;

  return (
    <div className="p-6 overflow-y-auto h-full bg-white">
      {/* <h2 className="text-xl font-semibold mb-4">Edit Story</h2> */}

      <EditStoryForm
        storyId={storyId}
        projectId={projectId}
        onClose={onClose}
        onUpdated={onUpdated}
      />
    </div>
  );
};

export default StoryDetailsPanel;
