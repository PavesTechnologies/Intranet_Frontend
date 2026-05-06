// src/pages/Projects/MyWork/hooks/useMyWork.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchMyWork,
  fetchMyWorkCompleted,
  fetchProjectStatuses,
  updateTaskStatus,
  updateStoryStatus,
  updateBugStatus,
} from "../api/myWorkApi";

// ── Query keys ────────────────────────────────────────────────────────────────
export const MY_WORK_KEY      = (userId) => ["myWork", userId];
export const MY_WORK_COMPLETED_KEY = (userId) => ["myWorkCompleted", userId];
export const PROJECT_STATUSES_KEY  = (projectId) => ["projectStatuses", projectId];

// ─────────────────────────────────────────────────────────────────────────────
// Main data hook
// ─────────────────────────────────────────────────────────────────────────────
export const useMyWorkData = (userId) =>
  useQuery({
    queryKey:  MY_WORK_KEY(userId),
    queryFn:   () => fetchMyWork(userId),
    enabled:   !!userId,
    staleTime: 60_000,          // 60 s — show cached data instantly, refresh silently
    gcTime:    5 * 60_000,      // keep in cache 5 min
    retry:     2,
  });

// ─────────────────────────────────────────────────────────────────────────────
// Completed items (lazy — only fetches when enabled)
// ─────────────────────────────────────────────────────────────────────────────
export const useMyWorkCompleted = (userId, enabled) =>
  useQuery({
    queryKey:  MY_WORK_COMPLETED_KEY(userId),
    queryFn:   () => fetchMyWorkCompleted(userId),
    enabled:   !!userId && enabled,
    staleTime: 2 * 60_000,
  });

// ─────────────────────────────────────────────────────────────────────────────
// Project statuses (for status change dropdown)
// Cached 5 min — statuses change rarely
// ─────────────────────────────────────────────────────────────────────────────
export const useProjectStatuses = (projectId) =>
  useQuery({
    queryKey:  PROJECT_STATUSES_KEY(projectId),
    queryFn:   () => fetchProjectStatuses(projectId),
    enabled:   !!projectId,
    staleTime: 5 * 60_000,
    gcTime:    10 * 60_000,
  });

// ─────────────────────────────────────────────────────────────────────────────
// Status update mutation — optimistic UI
// ─────────────────────────────────────────────────────────────────────────────
export const useUpdateStatus = (userId) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ type, id, statusId, status }) => {
      if (type === "TASK")  return updateTaskStatus({ taskId: id, statusId });
      if (type === "STORY") return updateStoryStatus({ storyId: id, statusId });
      if (type === "BUG")   return updateBugStatus({ bugId: id, status });
    },

    // Optimistic: update the cached data immediately before server responds
    onMutate: async ({ type, id, statusId, status, statusName, bugStatus }) => {
      await qc.cancelQueries({ queryKey: MY_WORK_KEY(userId) });
      const prev = qc.getQueryData(MY_WORK_KEY(userId));

      qc.setQueryData(MY_WORK_KEY(userId), (old) => {
        if (!old) return old;
        return {
          ...old,
          projects: old.projects.map((group) => ({
            ...group,
            items: group.items.map((item) =>
              item.id === id && item.type === type
                ? {
                    ...item,
                    statusId:   statusId ?? item.statusId,
                    statusName: statusName ?? item.statusName,
                    bugStatus:  bugStatus ?? item.bugStatus,
                  }
                : item
            ),
          })),
        };
      });

      return { prev };
    },

    // Rollback on error
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(MY_WORK_KEY(userId), ctx.prev);
    },

    // Always refetch after mutation settles
    onSettled: () => {
      qc.invalidateQueries({ queryKey: MY_WORK_KEY(userId) });
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Mark Done mutation — optimistic removal from active list
// ─────────────────────────────────────────────────────────────────────────────
export const useMarkDone = (userId) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ type, id, doneStatusId, doneStatus }) => {
      if (type === "TASK")  return updateTaskStatus({ taskId: id, statusId: doneStatusId });
      if (type === "STORY") return updateStoryStatus({ storyId: id, statusId: doneStatusId });
      if (type === "BUG")   return updateBugStatus({ bugId: id, status: doneStatus || "CLOSED" });
    },

    onMutate: async ({ type, id }) => {
      await qc.cancelQueries({ queryKey: MY_WORK_KEY(userId) });
      const prev = qc.getQueryData(MY_WORK_KEY(userId));

      // Optimistically remove from projects list — card animates out
      qc.setQueryData(MY_WORK_KEY(userId), (old) => {
        if (!old) return old;
        const updated = {
          ...old,
          allActiveCount: Math.max(0, (old.allActiveCount || 0) - 1),
          projects: old.projects
            .map((group) => ({
              ...group,
              items: group.items.filter(
                (item) => !(item.id === id && item.type === type)
              ),
            }))
            .filter((group) => group.items.length > 0),
        };
        return updated;
      });

      return { prev };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(MY_WORK_KEY(userId), ctx.prev);
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: MY_WORK_KEY(userId) });
      qc.invalidateQueries({ queryKey: MY_WORK_COMPLETED_KEY(userId) });
    },
  });
};