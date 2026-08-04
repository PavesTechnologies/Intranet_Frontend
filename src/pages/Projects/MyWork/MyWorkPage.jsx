// src/pages/Projects/MyWork/MyWorkPage.jsx
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { ROLES } from "../../../config/sidebarConfig";
import api from "../../../api/axiosInstance";
import { RefreshCw, CheckCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { useMyWorkData, useUpdateStatus, useMarkDone, MY_WORK_KEY } from "./hooks/useMyWork";
import { useMyWorkStore } from "./hooks/myWorkStore";
import { applyFilters } from "./utils/myWorkUtils";
import { ArrowLeft } from "lucide-react";
import SnapshotBar      from "../../../components/MyWork/SnapshotBar";
import FilterBar        from "../../../components/MyWork/FilterBar";
import ProjectGroup     from "../../../components/MyWork/ProjectGroup";
import TestWorkSection  from "../../../components/MyWork/TestWorkSection";
import CompletedSection from "../../../components/MyWork/CompletedSection";
import ItemDetailPanel  from "../../../components/MyWork/ItemDetailPanel";
import { MyWorkPageSkeleton } from "./skeletons/MyWorkSkeletons";
import { useNavigate } from "react-router-dom";
import Button from "../../../components/Button/Button";
export default function MyWorkPage() {
  const { user, hasRole } = useAuth();
  const userId   = user?.id || user?.user_id;
  const navigate = useNavigate();
  const qc = useQueryClient();

  // ── Data ────────────────────────────────────────────────────────────────────
  const { data, isLoading, isError, isFetching, refetch } = useMyWorkData(userId);

  // ── Mutations ────────────────────────────────────────────────────────────────
  const { mutate: updateStatus } = useUpdateStatus(userId);
  const { mutate: markDone }     = useMarkDone(userId);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [selectedItem, setSelectedItem] = useState(null);
  const store = useMyWorkStore();

  // Default the view to match the user's role: Project_Manager → "As Project
  // Manager", General (or anything else) → "As Member". The toggle itself
  // stays visible and switchable for every user regardless of role.
  useEffect(() => {
    store.setViewMode(hasRole([ROLES.PROJECT_MANAGER]) ? "manager" : "member");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Which projects is this user the owner/PM of? ─────────────────────────────
  // Cross-referenced against the project groups in /api/my-work so a project
  // shows under "As Project Manager" only when the user actually owns it there,
  // and under "As Member" otherwise — a project's own role, not a global one.
  const [ownerProjectIds, setOwnerProjectIds] = useState(new Set());
  useEffect(() => {
    if (!userId) return;
    api
      .get(`${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/owner/${userId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => {
        setOwnerProjectIds(new Set((res.data || []).map((p) => p.id)));
      })
      .catch(() => setOwnerProjectIds(new Set()));
  }, [userId]);

  // ── Client-side filtering (instant — no network) ─────────────────────────────
  const filteredData = useMemo(() => applyFilters(data, {
    selectedProjects:   store.selectedProjects,
    selectedTypes:      store.selectedTypes,
    selectedPriorities: store.selectedPriorities,
    activeChip:         store.activeChip,
  }), [data, store.selectedProjects, store.selectedTypes, store.selectedPriorities, store.activeChip]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleStatusChange = useCallback((args) => {
    updateStatus({ ...args });
  }, [updateStatus]);

  const handleMarkDone = useCallback((item) => {
    // Find the "done" status for this project
    const doneStatusId = null; // React Query's project statuses cache will have this
    // For bugs, we hardcode CLOSED; for tasks/stories the mutation uses the first closed-named status
    markDone({
      type:         item.type,
      id:           item.id,
      doneStatus:   "CLOSED",
      doneStatusId: doneStatusId,
    });
  }, [markDone]);

  const handleCardClick = useCallback((item) => {
    setSelectedItem(item);
  }, []);

  // ── Loading / error states ────────────────────────────────────────────────────
  if (isLoading) return <MyWorkPageSkeleton />;

  if (isError) return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <div className="text-4xl mb-3">⚠️</div>
      <h3 className="text-base font-semibold text-slate-700 mb-1">
        Failed to load your work
      </h3>
      <p className="text-sm text-slate-400 mb-4">
        Something went wrong fetching your items.
      </p>
      <Button variant="primary" onClick={refetch}>Retry</Button>
    </div>
  );

  // Toggle is available to every user, manager or general. Each project group
  // from /api/my-work is routed to "manager" or "member" based on whether this
  // user actually owns that specific project (per /api/projects/owner/{id}) —
  // so a PM on Project A but plain member on Project B sees A under "As
  // Project Manager" and B under "As Member", not one bucket for everything.
  const isManagerView = store.viewMode === "manager";

  // Unfiltered split — used for the "Projects" filter dropdown options so they
  // don't shrink as other filters are applied.
  const rawProjects        = data?.projects || [];
  const rawManagerProjects = rawProjects.filter((g) => ownerProjectIds.has(g.projectId));
  const rawMemberProjects  = rawProjects.filter((g) => !ownerProjectIds.has(g.projectId));

  // Filtered split — used for the actual rendered list.
  const allProjects     = filteredData?.projects || [];
  const managerProjects = allProjects.filter((g) => ownerProjectIds.has(g.projectId));
  const memberProjects  = allProjects.filter((g) => !ownerProjectIds.has(g.projectId));
  const projects         = isManagerView ? managerProjects : memberProjects;
  const isEmpty  = !isLoading && projects.length === 0 && !store.activeChip
    && !store.selectedProjects.length && !store.selectedTypes.length;

  return (
    <div className="min-h-full bg-slate-50">
      <div className="w-full px-4 py-6">

        {/* ── Page header ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          
          <div>
            <h1 className="text-xl font-bold text-slate-900">My Work</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {isManagerView
                ? "Items you're accountable for as project manager"
                : "Everything assigned to you across all projects"}
            </p>
            
          </div>
          <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-5 h-5 bg-white border border-gray-200 text-gray-600 rounded-full shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 shrink-0"
            title="Go Back"
          >
            <ArrowLeft className="w-3 h-3" strokeWidth={2.5} />
          </button>
          <button
            onClick={refetch}
            title="Refresh"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600
              hover:bg-white border border-transparent hover:border-slate-200
              transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          </div>
        </div>

        {/* ── Snapshot bar ──────────────────────────────────────────────────── */}
        <SnapshotBar snapshot={filteredData} />

        {/* ── Filter bar ────────────────────────────────────────────────────── */}
        <FilterBar projects={isManagerView ? rawManagerProjects : rawMemberProjects} />


        {/* ── Empty state (no work assigned at all) ─────────────────────────── */}
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CheckCheck className="w-12 h-12 text-emerald-400 mb-3" />
            <h3 className="text-base font-semibold text-slate-700 mb-1">
              You're all caught up!
            </h3>
            <p className="text-sm text-slate-400">
              {isManagerView
                ? "No items you're accountable for right now."
                : "No active work items assigned to you right now."}
            </p>
          </div>
        ) : (
          <>
            {/* ── No results from active filter ─────────────────────────────── */}
            {projects.length === 0 && (
              <div className="py-12 text-center text-sm text-slate-400">
                No items match the current filters.
              </div>
            )}

            {/* ── Project groups (owned-by-me projects in manager view, the
                 rest in member view) ─────────────────────────────────────── */}
            {projects.map((group) => (
              <ProjectGroup
                key={group.projectId}
                group={group}
                onStatusChange={handleStatusChange}
                onMarkDone={handleMarkDone}
                onCardClick={handleCardClick}
              />
            ))}

            {!isManagerView && (
              <>
                {/* ── Test work section (QA users) ────────────────────────── */}
                {data?.testWork?.length > 0 && (
                  <TestWorkSection testWork={data.testWork} />
                )}

                {/* ── Completed toggle ────────────────────────────────────── */}
                <CompletedSection userId={userId} />
              </>
            )}
          </>
        )}
      </div>

      {/* ── Item detail panel (slide-over) ────────────────────────────────────── */}
      {selectedItem && (
        <ItemDetailPanel
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}