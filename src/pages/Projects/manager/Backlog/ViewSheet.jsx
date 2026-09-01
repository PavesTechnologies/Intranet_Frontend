import React, { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import api from "../../../../api/axiosInstance";
import Button from "../../../../components/Button/Button";
import CommentBox from "../CommentBox";
import { useAuth } from "../../../../contexts/AuthContext";
import {
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  LayoutList,
  Search,
  RotateCcw,
} from "lucide-react";

const ViewSheet = () => {
  const { projectId, type, id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [issue, setIssue] = useState(location.state?.issue || null);
  const [loading, setLoading] = useState(!location.state?.issue);

  const [relatedNames, setRelatedNames] = useState({
    epicName: "",
    storyName: "",
    sprintName: "",
    reporterName: "",
    assigneeName: "",
    projectName: "",
  });

  const token = localStorage.getItem("token");
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const getEndpoint = () => {
    if (type === "task") return `/api/tasks/${id}`;
    if (type === "story") return `/api/stories/${id}`;
    if (type === "epic") return `/api/epics/${id}`;
    if (type === "bug") return `/api/bugs/${id}`;
    return null;
  };

  // Fetch issue details
  useEffect(() => {
    if (!issue) {
      const endpoint = getEndpoint();
      if (!endpoint) return;

      setLoading(true);
      api
        .get(`${window.__APP_CONFIG__.PMS_BASE_URL}${endpoint}`, { headers })
        .then((res) => setIssue(res.data))
        .catch((err) => console.error("Failed to fetch issue:", err))
        .finally(() => setLoading(false));
    }
  }, [id, type]);

  // Fetch related entity names
  useEffect(() => {
    if (!issue) return;
    const base = window.__APP_CONFIG__.PMS_BASE_URL;

    const fetchName = async (endpoint, field) => {
      try {
        const res = await api.get(`${base}${endpoint}`, { headers });
        return (
          res.data.name ||
          res.data.title ||
          res.data.sprintName ||
          res.data.fullName
        );
      } catch (err) {
        console.warn(`Failed to fetch ${field}:`, err);
        return null;
      }
    };

    const fetchRelated = async () => {
      const names = {};

      if (issue.epicId)
        names.epicName = await fetchName(`/api/epics/${issue.epicId}`, "epic");
      if (issue.storyId)
        names.storyName = await fetchName(
          `/api/stories/${issue.storyId}`,
          "story",
        );

      const sId = issue.sprintId || issue.sprint?.id;
      if (sId) {
        // Fetching from a general sprints endpoint or via project if needed
        names.sprintName = await fetchName(`/api/sprints/${sId}`, "sprint");
      }

      if (issue.reporterId)
        names.reporterName = await fetchName(
          `/api/users/${issue.reporterId}`,
          "reporter",
        );
      if (issue.assigneeId)
        names.assigneeName = await fetchName(
          `/api/users/${issue.assigneeId}`,
          "assignee",
        );
      if (issue.projectId)
        names.projectName = await fetchName(
          `/api/projects/${issue.projectId}`,
          "project",
        );

      setRelatedNames(names);
    };

    fetchRelated();
  }, [issue]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 mt-10">
        <p className="text-indigo-600 font-medium animate-pulse">
          Loading {type} details...
        </p>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="flex justify-center items-center h-64 mt-10">
        <p className="text-red-500 font-medium">
          Failed to load {type} details.
        </p>
      </div>
    );
  }

  // Safely extract status string to prevent crashes
  const statusString =
    issue.status?.name || issue.statusName || issue.status || "Unknown";

  return (
    <div className="w-full mt-8 px-4 sm:px-6 space-y-8 pb-12">
      {/* HEADER */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 capitalize flex items-center gap-2">
            <span className="text-indigo-600">{type}</span> Details
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {relatedNames.projectName || projectId
              ? `Project: ${relatedNames.projectName || projectId}`
              : ""}
          </p>
        </div>
      <button
  onClick={() => navigate(-1)}
            className="flex items-center justify-center w-5 h-5 bg-white border border-gray-200 text-gray-600 rounded-full shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 shrink-0"
>
 
 <ArrowLeft size={15} />
</button>
      </div>

      {/* MAIN ISSUE CARD */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 sm:p-8 space-y-8">
        {/* Title & Description */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 leading-tight">
            {issue.title || issue.name || "Untitled"}
          </h2>
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Description
            </h3>
            <div className="text-gray-700 leading-relaxed bg-gray-50/50 p-4 rounded-lg border border-gray-100 min-h-[80px]">
              {issue.description ? (
                <span className="whitespace-pre-wrap">{issue.description}</span>
              ) : (
                <span className="text-gray-400 italic">
                  No description available.
                </span>
              )}
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* DETAILS GRID */}
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 text-sm">
          {/* --- COMMON FIELDS --- */}
          <Detail label="Status">
            <Badge color="blue">
              {String(statusString).replace(/_/g, " ")}
            </Badge>
          </Detail>

          <Detail label="Priority">
            <Badge color="red">{issue.priority || "Not set"}</Badge>
          </Detail>

          <Detail
            label="Assignee"
            value={
              relatedNames.assigneeName ||
              issue.assignee?.name ||
              issue.assignedTo ||
              "Unassigned"
            }
          />
          <Detail
            label="Reporter"
            value={
              relatedNames.reporterName ||
              issue.reporter?.name ||
              issue.reporterName ||
              "Unassigned"
            }
          />

          <Detail
            label="Start Date"
            value={
              issue.startDate
                ? new Date(issue.startDate).toLocaleDateString()
                : "-"
            }
          />

          <Detail
            label="Due Date"
            value={
              issue.dueDate ? new Date(issue.dueDate).toLocaleDateString() : "-"
            }
          />

          {/* <Detail
            label="Created On"
            value={
              issue.createdOn
                ? new Date(issue.createdOn).toLocaleDateString()
                : issue.createdAt
                  ? new Date(issue.createdAt).toLocaleDateString()
                  : "-"
            }
          /> */}

          {/* --- EPIC SPECIFIC --- */}
          {type === "epic" && (
            <>
              <Detail label="Progress">
                <Badge color="green">{`${issue.progressPercentage || 0}%`}</Badge>
              </Detail>
            </>
          )}

          {/* --- STORY SPECIFIC --- */}
          {type === "story" && (
            <>
              <Detail
                label="Epic"
                value={relatedNames.epicName || issue.epic?.name || "-"}
              />
              <Detail
                label="Sprint"
                value={relatedNames.sprintName || issue.sprint?.name || "-"}
              />
              <Detail label="Story Points">
                {issue.storyPoints ? (
                  <span className="font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md">
                    {issue.storyPoints}
                  </span>
                ) : (
                  "-"
                )}
              </Detail>
            </>
          )}

          {/* --- TASK SPECIFIC --- */}
          {type === "task" && (
            <>
              <Detail
                label="Story"
                value={relatedNames.storyName || issue.storyTitle || "-"}
              />
              <Detail
                label="Sprint"
                value={relatedNames.sprintName || issue.sprintName || "-"}
              />
              <Detail label="Estimated Hours">
                {issue.estimatedHours ? (
                  <span className="font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md">
                    {issue.estimatedHours}
                  </span>
                ) : (
                  "-"
                )}
              </Detail>
              <Detail label="Billable">
                <Badge
                  color={
                    issue.billable || String(issue.isBillable) === "true"
                      ? "green"
                      : "gray"
                  }
                >
                  {issue.billable || String(issue.isBillable) === "true"
                    ? "Yes"
                    : "No"}
                </Badge>
              </Detail>
            </>
          )}

          {/* --- BUG SPECIFIC --- */}
          {type === "bug" && (
            <>
              <Detail
                label="Story"
                value={relatedNames.storyName || issue.storyTitle || "-"}
              />
              <Detail
                label="Sprint"
                value={relatedNames.sprintName || issue.sprintName || "-"}
              />
              <Detail label="Severity">
                <Badge color="red">{issue.severity || "-"}</Badge>
              </Detail>
              <Detail
                label="Bug Type"
                value={issue.bugType || issue.type || "-"}
              />
            </>
          )}
        </dl>

        {/* ACCEPTANCE CRITERIA (Stories & Tasks) */}
        {(type === "story" || type === "task") && issue.acceptanceCriteria && (
          <div className="pt-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Acceptance Criteria
            </h3>
            <div className="text-gray-700 leading-relaxed bg-amber-50/50 p-4 rounded-lg border border-amber-100">
              <span className="whitespace-pre-wrap">
                {issue.acceptanceCriteria}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* COMMENT SECTION */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 sm:p-8">
        <h2 className="text-lg font-bold mb-6 text-gray-900 flex items-center gap-2">
          <span className="text-indigo-600">💬</span> Discussion
        </h2>
        <CommentBox 
  entityId={id} 
  entityType={type?.toLowerCase()} // or .toLowerCase()
  currentUser={user} 
/>
      </div>
    </div>
  );
};

// ===== HELPER COMPONENTS =====
const Detail = ({ label, value, children }) => (
  <div className="flex flex-col gap-1.5">
    <dt className="text-xs font-bold text-gray-400 uppercase tracking-wider">
      {label}
    </dt>
    <dd className="text-sm font-medium text-gray-900">
      {children || value || "-"}
    </dd>
  </div>
);

const Badge = ({ children, color }) => {
  const colors = {
    blue: "bg-blue-50 text-blue-700 border border-blue-200",
    red: "bg-red-50 text-red-700 border border-red-200",
    green: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    gray: "bg-slate-50 text-slate-700 border border-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase rounded-md ${
        colors[color] || colors.gray
      }`}
    >
      {children}
    </span>
  );
};

export default ViewSheet;
