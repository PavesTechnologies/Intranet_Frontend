// src/pages/Projects/MyWork/hooks/myWorkStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Zustand store for My Work UI state.
 * Persisted keys: collapsedGroups, selectedTypes — survive tab switches.
 * Non-persisted: activeChip, selectedProjects, selectedPriorities — reset on revisit.
 */
export const useMyWorkStore = create(
  persist(
    (set, get) => ({
      // ── Filters ─────────────────────────────────────────────────────────────
      selectedProjects:   [],   // [] = all projects
      selectedTypes:      [],   // [] = all types
      selectedPriorities: [],   // [] = all priorities

      // ── Active snapshot chip ─────────────────────────────────────────────
      activeChip: null,         // null | "overdue" | "dueToday" | "dueThisWeek" | "blocked"

      // ── Collapsed project groups (persisted) ─────────────────────────────
      collapsedGroups: new Set(),

      // ── Completed section open ───────────────────────────────────────────
      completedOpen: false,

      // ── Manager section open ─────────────────────────────────────────────
      managerSectionOpen: false,

      // ── Actions ──────────────────────────────────────────────────────────
      setSelectedProjects:   (v) => set({ selectedProjects: v }),
      setSelectedTypes:      (v) => set({ selectedTypes: v }),
      setSelectedPriorities: (v) => set({ selectedPriorities: v }),

      setActiveChip: (chip) =>
        set({ activeChip: get().activeChip === chip ? null : chip }),

      toggleGroup: (projectId) =>
        set((state) => {
          const next = new Set(state.collapsedGroups);
          next.has(projectId) ? next.delete(projectId) : next.add(projectId);
          return { collapsedGroups: next };
        }),

      toggleCompleted:      () => set((s) => ({ completedOpen: !s.completedOpen })),
      toggleManagerSection: () => set((s) => ({ managerSectionOpen: !s.managerSectionOpen })),

      clearFilters: () =>
        set({
          selectedProjects:   [],
          selectedTypes:      [],
          selectedPriorities: [],
          activeChip:         null,
        }),
    }),
    {
      name: "my-work-ui",
      // Only persist these keys — filters and chips reset on revisit
      partialize: (state) => ({
        collapsedGroups:  Array.from(state.collapsedGroups), // Set → Array for JSON
        selectedTypes:    state.selectedTypes,
      }),
      // Rehydrate Array back to Set
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.collapsedGroups)) {
          state.collapsedGroups = new Set(state.collapsedGroups);
        }
      },
    }
  )
);