// src/pages/Projects/Summary/Summary.jsx
"use client";

import React, { useEffect, useMemo, useState, lazy, Suspense } from "react";
import api from "../../../api/axiosInstance";
import { motion } from "framer-motion";
import { preloadAllWidgets } from "./preloadWidgets";

// Skeletons
import HeaderSkeleton from "./skeletons/HeaderSkeleton";
import ScopeSkeleton from "./skeletons/ScopeSkeleton";
import StatusSkeleton from "./skeletons/StatusSkeleton";
import ChartCardSkeleton from "./skeletons/ChartCardSkeleton";
import ListCardSkeleton from "./skeletons/ListCardSkeleton";

// Lazy load heavy widgets
const ScopeAndProgress = lazy(() => import("./widgets/ScopeAndProgress"));
const StatusOverview = lazy(() => import("./widgets/StatusOverview"));
const TypesOfWork = lazy(() => import("./widgets/TypesOfWork"));
const TeamWorkload = lazy(() => import("./widgets/TeamWorkload"));
const PriorityDistribution = lazy(
  () => import("./widgets/PriorityDistribution"),
);
const EpicProgress = lazy(() => import("./widgets/EpicProgress"));

const Summary = ({ projectId, projectName }) => {
  const [projectData, setProjectData] = useState({
    epics: null,
    stories: null,
    tasks: null,
    // bugs: null,
    statuses: null,
    users: null,
    stage: null,
  });

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    // Preload widgets in idle time
    preloadAllWidgets();
  }, []);

  useEffect(() => {
    if (!projectId || !token) return;
    const base = window.__APP_CONFIG__.PMS_BASE_URL;
    const headers = { Authorization: `Bearer ${token}` };

    // Fetch all APIs in parallel using Promise.allSettled
    const requests = [
      api
        .get(`${base}/api/projects/${projectId}`, { headers })
        .then((res) => ({ stage: res.data?.currentStage || "INITIATION" })),
      api
        .get(`${base}/api/projects/${projectId}/epics`, { headers })
        .then((res) => ({ epics: res.data || [] })),
      api
        .get(`${base}/api/projects/${projectId}/stories`, { headers })
        .then((res) => ({ stories: res.data || [] })),
      api
        .get(`${base}/api/projects/${projectId}/tasks`, { headers })
        .then((res) => ({ tasks: res.data || [] })),
      // api
      //   .get(`${base}/api/testing/bugs/projects/${projectId}/summaries`, {
      //     headers,
      //   })
      //   .then((res) => ({ bugs: res.data || [] }))
      //   .catch(() => ({ bugs: [] })),
      api
        .get(`${base}/api/projects/${projectId}/statuses`, { headers })
        .then((res) => ({ statuses: res.data || [] })),
      api
        .get(`${base}/api/projects/${projectId}/members-with-owner`, {
          headers,
        })
        .then((res) => ({ users: res.data || [] })),
    ];

    // Execute all requests in parallel
    Promise.allSettled(requests).then((results) => {
      const merged = {};
      results.forEach((result) => {
        if (result.status === "fulfilled") {
          Object.assign(merged, result.value);
        }
      });
      setProjectData((prev) => ({ ...prev, ...merged }));
    });
  }, [projectId, token]);

  const isDataReady = {
    work:
      projectData.epics &&
      projectData.stories &&
      projectData.tasks,
      // && projectData.bugs,
    statuses: projectData.statuses,
    users: projectData.users,
  };

  const allWork = useMemo(() => {
    if (!isDataReady.work) return [];

    return [
      ...(projectData.tasks || []).map(t => ({
        status: { name: t.statusName || "UNKNOWN" }
      })),

      ...(projectData.stories || []).map(s => ({
        status: { name: s.statusName || "UNKNOWN" }
      })),

      // ...(projectData.bugs || []).map(b => ({
      //   status: { name: b.status || "UNKNOWN" }
      // })),
    ];
  }, [projectData.tasks, projectData.stories, isDataReady.work]);

  return (
    <motion.div
      className="bg-white mt-2 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.36 }}
    >
      {/* HEADER */}
      {!projectData.stage ? (
        <HeaderSkeleton />
      ) : (
        <div className="mb-6 px-1">
          <div className="flex items-center justify-between">
            <div>
              {/* <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">
                {projectName || "Project"}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Overview & progress at a glance
              </p> */}
            </div>
            <div>
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Stage: {projectData.stage}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SCOPE */}
      <div className="mb-4">
        {!isDataReady.work || !isDataReady.statuses ? (
          <ScopeSkeleton />
        ) : (
          <Suspense fallback={<ScopeSkeleton />}>
            <ScopeAndProgress
              epics={projectData.epics}
              stories={projectData.stories}
              statuses={projectData.statuses}
              tasks={projectData.tasks}
              // bugs={projectData.bugs}
            />
          </Suspense>
        )}
      </div>

      {/* STATUS */}
      <div className="mb-4">
        {!isDataReady.work || !isDataReady.statuses ? (
          <StatusSkeleton />
        ) : (
          <Suspense fallback={<StatusSkeleton />}>
            <StatusOverview
              workItems={allWork}
              statuses={projectData.statuses}
            />
          </Suspense>
        )}
      </div>

      {/* BOTTOM FLOAT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          {!isDataReady.work ? (
            <ChartCardSkeleton />
          ) : (
            <Suspense fallback={<ChartCardSkeleton />}>
              <PriorityDistribution
                tasks={projectData.tasks}
                stories={projectData.stories}
                // bugs={projectData.bugs}
              />
            </Suspense>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {!isDataReady.work ? (
            <ListCardSkeleton />
          ) : (
            <Suspense fallback={<ListCardSkeleton />}>
              <TypesOfWork
                tasks={projectData.tasks}
                stories={projectData.stories}
                epics={projectData.epics}
                // bugs={projectData.bugs}
              />
            </Suspense>
          )}

          {!isDataReady.work || !isDataReady.users ? (
            <ListCardSkeleton />
          ) : (
            <Suspense fallback={<ListCardSkeleton />}>
              <TeamWorkload workItems={allWork} users={projectData.users} />
            </Suspense>
          )}
        </div>
      </div>

      {/* EPICS */}
      <div className="my-4">
        {!isDataReady.work || !isDataReady.statuses ? (
          <ListCardSkeleton />
        ) : (
          <Suspense fallback={<ListCardSkeleton />}>
            <EpicProgress
              epics={projectData.epics}
              stories={projectData.stories}
              tasks={projectData.tasks}
              // bugs={projectData.bugs}
              statuses={projectData.statuses}
            />
          </Suspense>
        )}
      </div>
    </motion.div>
  );
};

export default Summary;
