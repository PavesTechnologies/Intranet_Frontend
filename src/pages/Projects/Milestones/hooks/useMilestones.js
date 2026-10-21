// src/pages/Projects/Milestones/hooks/useMilestones.js
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  changeMilestoneStatus,
  completeMilestone,
  createMilestone,
  deleteMilestone,
  fetchMilestoneHistory,
  fetchMilestones,
  fetchMilestoneSummary,
  fetchProjectEpics,
  updateMilestone,
} from "../api/milestoneApi";

// ── Query keys ────────────────────────────────────────────────────────────────
export const MILESTONES_KEY = (projectId) => ["milestones", projectId];
export const MILESTONE_LIST_KEY = (projectId, params) => ["milestones", projectId, "list", params];
export const MILESTONE_SUMMARY_KEY = (projectId) => ["milestones", projectId, "summary"];
export const MILESTONE_HISTORY_KEY = (milestoneId) => ["milestoneHistory", milestoneId];
export const PROJECT_EPICS_KEY = (projectId) => ["projectEpics", projectId];

// 403/404 will not succeed on retry; everything else retries once.
const retryUnlessClientError = (failureCount, error) => {
  const status = error?.response?.status;
  if (status && status >= 400 && status < 500) return false;
  return failureCount < 1;
};

export const useMilestoneList = (projectId, params) =>
  useQuery({
    queryKey: MILESTONE_LIST_KEY(projectId, params),
    queryFn: () => fetchMilestones({ projectId, ...params }),
    enabled: !!projectId,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: retryUnlessClientError,
  });

export const useMilestoneSummary = (projectId) =>
  useQuery({
    queryKey: MILESTONE_SUMMARY_KEY(projectId),
    queryFn: () => fetchMilestoneSummary(projectId),
    enabled: !!projectId,
    staleTime: 30_000,
    retry: retryUnlessClientError,
  });

export const useMilestoneHistory = (milestoneId, enabled) =>
  useQuery({
    queryKey: MILESTONE_HISTORY_KEY(milestoneId),
    queryFn: () => fetchMilestoneHistory(milestoneId),
    enabled: !!milestoneId && enabled,
    staleTime: 30_000,
    retry: retryUnlessClientError,
  });

export const useProjectEpics = (projectId, enabled = true) =>
  useQuery({
    queryKey: PROJECT_EPICS_KEY(projectId),
    queryFn: () => fetchProjectEpics(projectId),
    enabled: !!projectId && enabled,
    staleTime: 5 * 60_000,
    retry: retryUnlessClientError,
  });

/**
 * All milestone writes share one hook so every success refreshes list, summary
 * and history together — readiness of *other* milestones can change on any write.
 */
export const useMilestoneMutations = (projectId) => {
  const qc = useQueryClient();
  const onSuccess = (_data, variables) => {
    qc.invalidateQueries({ queryKey: MILESTONES_KEY(projectId) });
    if (variables?.milestoneId) {
      qc.invalidateQueries({ queryKey: MILESTONE_HISTORY_KEY(variables.milestoneId) });
    }
  };

  return {
    create: useMutation({ mutationFn: createMilestone, onSuccess }),
    update: useMutation({ mutationFn: updateMilestone, onSuccess }),
    changeStatus: useMutation({ mutationFn: changeMilestoneStatus, onSuccess }),
    complete: useMutation({ mutationFn: completeMilestone, onSuccess }),
    remove: useMutation({
      mutationFn: ({ milestoneId }) => deleteMilestone(milestoneId),
      onSuccess,
    }),
  };
};
