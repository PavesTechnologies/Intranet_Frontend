import React, { useEffect, useState } from "react";
import api from "../../../api/axiosInstance";
import CommentBox from "./UserCommentBox";
import ExpandableList from "../../../components/List/List";
import { showStatusToast } from "../../../components/toastfy/toast";
import { X } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";

const Lists = ({ projectId }) => {
  const [epics, setEpics] = useState([]);
  const [noEpicStories, setNoEpicStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const { user } = useAuth();
  const currentUser = user;
  const token = localStorage.getItem("token");

  const fetchData = async () => {
    setLoading(true);
    try {
      // ✅ Fetch epics, stories, and tasks (only once)
      const [epicRes, storyRes, taskRes] = await Promise.all([
        api.get(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/epics`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        ),
        api.get(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/stories`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        ),
        api.get(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/tasks`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        ),
      ]);

      const stories = storyRes.data;
      const tasks = taskRes.data;

      // ✅ Attach tasks to each story
      const enrichedStories = stories.map((story) => ({
        ...story,
        tasks: tasks.filter((task) => {
          const taskStoryId = task.storyId || task.story?.id;
          return taskStoryId === story.id;
        }),
      }));

      // ✅ Group stories under epics
      const enrichedEpics = epicRes.data.map((epic) => ({
        ...epic,
        stories: enrichedStories.filter((story) => {
          const storyEpicId = story.epicId || story.epic?.id;
          return storyEpicId === epic.id;
        }),
      }));

      // ✅ Filter stories without epic
      const noEpic = enrichedStories.filter(
        (story) => !story.epic && !story.epicId,
      );

      setEpics(enrichedEpics);
      setNoEpicStories(noEpic);
    } catch (err) {
      console.error("Error loading project data:", err);
      showStatusToast("Failed to load project data.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  useEffect(() => {
    document.body.style.overflow = selectedEntity ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedEntity]);

  if (loading)
    return (
      <div className="p-6 text-xl text-slate-500">Loading project data...</div>
    );

  return (
    <div className="p-6 space-y-6">

      {/* Epics */}
      <h2 className="text-xl font-bold text-indigo-700">Epics</h2>
      {epics.length > 0 ? (
        epics.map((epic) => (
          <ExpandableList
            key={epic.id}
            title={epic.name}
            count={epic.stories.length}
            headerRight={
              <div className="flex items-center">
                <button
                  onClick={() =>
                    setSelectedEntity({ id: epic.id, type: "epic" })
                  }
                >
                  💬
                </button>
              </div>
            }
          >
            {epic.stories.map((story) => (
              <li key={story.id}>
                <ExpandableList
                  title={
                    <span>
                      {story.title}{" "}
                      <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                        Story
                      </span>
                    </span>
                  }
                  count={story.tasks.length}
                  headerRight={
                    <div className="flex items-center">
                      <button
                        onClick={() =>
                          setSelectedEntity({ id: story.id, type: "story" })
                        }
                      >
                        💬
                      </button>
                    </div>
                  }
                >
                  {story.tasks.map((task) => (
                    <li
                      key={task.id}
                      className="flex justify-between items-center px-2"
                    >
                      <span className="text-sm font-medium text-gray-700">
                        {task.title}{" "}
                        <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                          Task
                        </span>
                      </span>
                      <div className="flex items-center">
                        <button
                          onClick={() =>
                            setSelectedEntity({ id: task.id, type: "task" })
                          }
                        >
                          💬
                        </button>
                      </div>
                    </li>
                  ))}
                </ExpandableList>
              </li>
            ))}
          </ExpandableList>
        ))
      ) : (
        <p className="text-gray-500">No epics found.</p>
      )}

      {/* No Epic Stories */}
      {noEpicStories.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-orange-600">
            Stories Assigned to No Epic
          </h2>
          <ExpandableList
            title="Unassigned Stories"
            count={noEpicStories.length}
          >
            {noEpicStories.map((story) => (
              <li key={story.id}>
                <ExpandableList
                  title={
                    <span>
                      {story.title}{" "}
                      <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                        Story
                      </span>
                    </span>
                  }
                  count={story.tasks.length}
                  headerRight={
                    <div className="flex items-center">
                      <button
                        onClick={() =>
                          setSelectedEntity({ id: story.id, type: "story" })
                        }
                      >
                        💬
                      </button>
                    </div>
                  }
                >
                  {story.tasks.map((task) => (
                    <li
                      key={task.id}
                      className="flex justify-between items-center px-2"
                    >
                      <span className="text-sm font-medium text-gray-700">
                        {task.title}{" "}
                        <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                          Task
                        </span>
                      </span>
                      <div className="flex items-center">
                        <button
                          onClick={() =>
                            setSelectedEntity({ id: task.id, type: "task" })
                          }
                        >
                          💬
                        </button>
                      </div>
                    </li>
                  ))}
                </ExpandableList>
              </li>
            ))}
          </ExpandableList>
        </div>
      )}

      {/* Comment Box */}
      {selectedEntity && (
        <div className="fixed bottom-0 right-0 w-[400px] h-[50vh] bg-white shadow-xl border-l border-t rounded-tl-xl z-50 p-4 overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold capitalize">
              Comments for {selectedEntity.type} #{selectedEntity.id}
            </h2>
            <button
              onClick={() => setSelectedEntity(null)}
              className="text-gray-500 hover:text-red-600 text-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <CommentBox
            entityId={selectedEntity.id}
            entityType={selectedEntity.type}
            currentUser={currentUser}
            token={token}
          />
        </div>
      )}
    </div>
  );
};

export default Lists;
