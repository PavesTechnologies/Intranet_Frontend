"use client";

import React, { useEffect, useState } from "react";
import api from "../../../api/axiosInstance";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import LoadingSpinner from "../../../components/LoadingSpinner";

const COLORS = [
  "#312e81",
  "#4338ca",
  "#4f46e5",
  "#6366f1",
  "#831843",
  "#9d174d",
  "#be185d",
  "#db2777",
  "#e879f9",
  "#c026d3",
];

// Stage hierarchy → percentage mapping
const stageProgressMap = {
  INITIATION: 5,
  PLANNING: 15,
  DESIGN: 30,
  DEVELOPMENT: 65,
  TESTING: 80,
  DEPLOYMENT: 90,
  MAINTENANCE: 98,
  COMPLETED: 100,
};

// Stage-based color gradient for progress bar
const stageColorMap = {
  INITIATION: "linear-gradient(90deg, #6366f1, #818cf8)",
  PLANNING: "linear-gradient(90deg, #4338ca, #6366f1)",
  DESIGN: "linear-gradient(90deg, #2563eb, #60a5fa)",
  DEVELOPMENT: "linear-gradient(90deg, #4f46e5, #818cf8)",
  TESTING: "linear-gradient(90deg, #9333ea, #c084fc)",
  DEPLOYMENT: "linear-gradient(90deg, #16a34a, #86efac)",
  MAINTENANCE: "linear-gradient(90deg, #eab308, #facc15)",
  COMPLETED: "linear-gradient(90deg, #22c55e, #86efac)",
};

const Summary = ({ projectId, projectName }) => {
  const [epics, setEpics] = useState([]);
  const [stories, setStories] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [bugs, setBugs] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [projectStage, setProjectStage] = useState("");
  const [projectProgress, setProjectProgress] = useState(0);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const base = window.__APP_CONFIG__.PMS_BASE_URL;

        // Fetch project details (to get stage)
        const projectRes = await api.get(
          `${base}/api/projects/${projectId}`,
          { headers },
        );
        const stage =
          projectRes.data.currentStage ||
          projectRes.data.currentStage ||
          "INITIATION";
        const upperStage = stage?.toUpperCase();

        setProjectStage(upperStage);
        setProjectProgress(stageProgressMap[upperStage] || 0);

        // Fetch related entities
        const [epicRes, storyRes, taskRes, bugRes] = await Promise.all([
          api.get(`${base}/api/projects/${projectId}/epics`, { headers }),
          api.get(`${base}/api/projects/${projectId}/stories`, { headers }),
          api.get(`${base}/api/projects/${projectId}/tasks`, { headers }),
          api.get(`${base}/api/bugs/project/${projectId}`, { headers }),
        ]);

        setEpics(epicRes.data);
        setStories(storyRes.data);
        setTasks(taskRes.data);
        setBugs(bugRes.data);

        // Fetch comments
        const commentPromises = [];
        const addRequests = (items, type) => {
          items.forEach((i) =>
            commentPromises.push({
              type,
              id: i.id,
              name: i.name || i.title || `Unnamed ${type}`,
              request: api.get(`${base}/api/comments/${type}/${i.id}`, {
                headers,
              }),
            }),
          );
        };

        addRequests(epicRes.data, "epic");
        addRequests(storyRes.data, "story");
        addRequests(taskRes.data, "task");

        const results = await Promise.allSettled(
          commentPromises.map((c) => c.request),
        );
        const allComments = [];

        results.forEach((r, idx) => {
          if (r.status === "fulfilled") {
            const { type, name, id } = commentPromises[idx];
            r.value.data.forEach((c) => {
              allComments.push({
                ...c,
                type: type.charAt(0).toUpperCase() + type.slice(1),
                parentId: c.parentId,
                parentItemName: name,
                parentItemId: id,
              });
            });
          }
        });

        allComments.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        );
        setComments(allComments);
      } catch (err) {
        console.error("Failed to fetch project summary:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [projectId, token]);

  /** ---------- Chart Data Preparation ---------- **/

  const prepareTasksByAssigneeData = () => {
    if (!tasks.length) return [];
    const grouped = {};
    tasks.forEach((task) => {
      const name =
        task.assignee?.username ||
        task.assignee?.name ||
        task.assigneeName ||
        "Unassigned";
      grouped[name] = (grouped[name] || 0) + 1;
    });
    return Object.entries(grouped)
      .map(([name, value]) => ({ name: `${name} (${value})`, value }))
      .sort((a, b) => b.value - a.value);
  };

  const preparePriorityData = () => {
    const groupByPriority = (items) => {
      const result = {};
      items.forEach((i) => {
        const p = i.priority || "Unspecified";
        result[p] = (result[p] || 0) + 1;
      });
      return result;
    };

    const taskData = groupByPriority(tasks);
    const storyData = groupByPriority(stories);
    const bugData = groupByPriority(bugs);

    const allPriorities = Array.from(
      new Set([
        ...Object.keys(taskData),
        ...Object.keys(storyData),
        ...Object.keys(bugData),
      ]),
    );

    return allPriorities.map((p) => ({
      priority: p,
      Tasks: taskData[p] || 0,
      Stories: storyData[p] || 0,
      Bugs: bugData[p] || 0,
    }));
  };

  const groupComments = (data) => {
    const parentComments = data.filter((c) => !c.parentId);
    const replies = data.filter((c) => c.parentId);
    return parentComments.map((parent) => ({
      ...parent,
      replies: replies.filter((r) => r.parentId === parent.id),
    }));
  };

  const filteredComments =
    filter === "All" ? comments : comments.filter((c) => c.type === filter);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <LoadingSpinner text="Loading Project Summary..." />
      </div>
    );
  }

  const progressBarColor =
    stageColorMap[projectStage] || "linear-gradient(90deg, #4f46e5, #818cf8)";

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-3xl font-bold mb-2 text-indigo-900">
        Project Summary: {projectName}
      </h2>

      {/* Project Stage Progress Bar */}
      <div className="bg-white shadow rounded-lg p-4 mb-8">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-semibold text-indigo-900">Project Stage</h4>
          <span className="text-sm font-medium text-gray-600">
            {projectStage} ({projectProgress}%)
          </span>
        </div>
        <div className="w-full h-full bg-gray-200 rounded-full ">
          <div
            className="h-4 rounded-full transition-all duration-700"
            style={{
              width: `${projectProgress}%`,
              background: progressBarColor,
            }}
          ></div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Epics", value: epics.length },
          { label: "Stories", value: stories.length },
          { label: "Tasks", value: tasks.length },
          { label: "Bugs", value: bugs.length },
        ].map((item, i) => (
          <div
            key={i}
            className="bg-white shadow rounded-lg p-4 text-center hover:shadow-lg transition"
          >
            <div className="text-gray-500 font-medium">{item.label}</div>
            <div className="text-3xl font-bold text-indigo-900">
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1  md:grid-cols-2 xl:grid-cols-3 gap-6 mb-10">
        {/* Priority Distribution */}
        <div className="bg-white rounded-lg shadow p-5 hover:shadow-xl transition">
          <h4 className="font-semibold text-indigo-900 mb-3">
            Priority Distribution
          </h4>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={preparePriorityData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="priority" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Tasks" fill="#312e81" />
              <Bar dataKey="Stories" fill="#831843" />
              <Bar dataKey="Bugs" fill="#1d4ed8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Epic Progress */}
        <div className="bg-white rounded-lg shadow p-5 hover:shadow-xl transition">
          <h4 className="font-semibold text-indigo-900 mb-3">Epic Progress</h4>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              layout="vertical"
              data={epics.map((epic) => ({
                Epic: epic.name,
                Progress: Number(epic.progressPercentage) || 0,
              }))}
              margin={{ top: 20, right: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} unit="%" />
              <YAxis dataKey="Epic" type="category" width={150} />
              <Tooltip formatter={(v) => [`${v}%`, "Progress"]} />
              <Legend />
              <Bar dataKey="Progress" fill="#4f46e5" barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tasks by Assignee */}
        <div className="bg-white rounded-lg shadow p-5 hover:shadow-xl transition">
          <h4 className="font-semibold text-indigo-900 mb-3">
            Tasks by Assignee
          </h4>

          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={prepareTasksByAssigneeData()}
                cx="50%"
                cy="50%"
                outerRadius={120}
                labelLine={false}
                label={({ name }) => name}
                dataKey="value"
              >
                {prepareTasksByAssigneeData().map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value} Tasks`} />
            </PieChart>
          </ResponsiveContainer>

          {/* Custom legend below chart */}
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {prepareTasksByAssigneeData().map((entry, i) => (
              <div key={i} className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-sm text-gray-700">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <div className="bg-white rounded-lg shadow p-6 hover:shadow-xl transition">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
          <h3 className="text-2xl font-semibold text-indigo-900 mb-3 sm:mb-0">
            Project Comments
          </h3>
          <div className="flex flex-wrap gap-2">
            {["All", "Epic", "Story", "Task"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full border transition ${
                  filter === f
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-50"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {filteredComments.length > 0 ? (
          <div className="max-h-[350px] overflow-y-auto space-y-4">
            {groupComments(filteredComments).map((comment) => (
              <div
                key={comment.id}
                className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-indigo-800">
                    {comment.userName || "Anonymous"}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(comment.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mb-1">
                  <span className="font-medium text-pink-700">
                    [{comment.type}]{" "}
                  </span>
                  <span className="text-indigo-800 font-medium">
                    {comment.parentItemName}
                  </span>
                </div>
                <p className="text-gray-800 whitespace-pre-line mb-2">
                  {comment.content || "(No content)"}
                </p>

                {comment.replies?.length > 0 && (
                  <div className="ml-4 border-l-2 border-indigo-300 pl-3 space-y-2">
                    {comment.replies.map((reply) => (
                      <div
                        key={reply.id}
                        className="p-2 bg-indigo-50 rounded-md"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-indigo-700">
                            {reply.userName || "Anonymous"}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(reply.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-line">
                          {reply.content || "(No content)"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 text-sm italic">
            No comments found for this selection.
          </div>
        )}
      </div>
    </div>
  );
};

export default Summary;
