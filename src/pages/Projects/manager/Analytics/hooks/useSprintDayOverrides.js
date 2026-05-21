// hooks/useSprintDayOverrides.js
import axios from "axios";

export function useSprintDayOverrides(sprintId, onSuccess) {
  const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
  const base    = `${window.__APP_CONFIG__.PMS_BASE_URL}/api/sprints/${sprintId}`;

  const toggleHoliday = async (date, markAsHoliday) => {
    if (markAsHoliday) {
      await axios.post(`${base}/holidays`, { date }, { headers });
    } else {
      await axios.delete(`${base}/holidays/${date}`, { headers });
    }
    onSuccess(); // refetch burndown
  };

  const toggleWorkingWeekend = async (date, markAsWorking) => {
    if (markAsWorking) {
      await axios.post(`${base}/working-weekends`, { date }, { headers });
    } else {
      await axios.delete(`${base}/working-weekends/${date}`, { headers });
    }
    onSuccess(); // refetch burndown
  };

  return { toggleHoliday, toggleWorkingWeekend };
}