import { useState, useEffect } from "react";
import axios from "axios";
import {
  toBurndownDatasets,
  toBurnupDatasets,
  toVelocityData,
  toScopeMarkers,
  toVelocitySummary,
} from "../utils/chartDataTransform";

export function useSprintBurnup(sprintId) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!sprintId) return;
    setLoading(true);
    setError(null);

    axios
      .get(`${window.__APP_CONFIG__.PMS_BASE_URL}/api/sprints/${sprintId}/burnup`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const raw = res.data;

        setData({
          raw,
          burndown:        toBurndownDatasets(raw.dailyBurnup, raw.initialStoryPoints),
          burnup:          toBurnupDatasets(raw.dailyBurnup),
          velocity:        toVelocityData(raw.dailyBurnup),
          scopeMarkers:    toScopeMarkers(raw.scopeChanges ?? []),
          velocitySummary: toVelocitySummary(raw.dailyBurnup, raw),
          kpis: {
            totalScope:           raw.currentStoryPoints,
            initialScope:         raw.initialStoryPoints,
            completed:            raw.completedStoryPoints,
            remaining:            raw.remainingStoryPoints,
            totalIssues:          raw.totalIssues,
            completedIssues:      raw.completedIssues,
            remainingIssues:      raw.remainingIssues,
            completionPercentage: raw.completionPercentage,
            isOnTrack:            raw.isOnTrack,
            deviationPoints:      raw.deviationPoints,
            sprintName:           raw.sprintName,
            startDate:            raw.startDate,
            endDate:              raw.endDate,
            totalSprintDays:      raw.totalSprintDays,
          },
        });
      })
      .catch((err) => setError(err?.response?.data?.message ?? "Failed to load analytics"))
      .finally(() => setLoading(false));
  }, [sprintId, token]);

  return { data, loading, error };
}