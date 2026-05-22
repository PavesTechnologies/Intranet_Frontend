// hooks/useSprintDayOverrides.js
import { useState, useEffect, useCallback } from "react";
import axios from "axios";

export function useSprintDayOverrides(sprintId, onSuccess) {
  const [holidays,        setHolidays]        = useState([]);
  const [workingWeekends, setWorkingWeekends]  = useState([]);
  const [overrideLoading, setOverrideLoading]  = useState(false);

  const getHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
  const base = `${window.__APP_CONFIG__.PMS_BASE_URL}/api/sprints/${sprintId}`;

  const fetchOverrides = useCallback(async () => {
    if (!sprintId) return;
    setOverrideLoading(true);
    try {
      const [hRes, wwRes] = await Promise.all([
        axios.get(`${base}/holidays`,        { headers: getHeaders() }),
        axios.get(`${base}/working-weekends`, { headers: getHeaders() }),
      ]);
      setHolidays(hRes.data        ?? []);
      setWorkingWeekends(wwRes.data ?? []);
    } catch {
      // silently ignore – panel is non-critical
    } finally {
      setOverrideLoading(false);
    }
  }, [sprintId]);

  useEffect(() => { fetchOverrides(); }, [fetchOverrides]);

  const toggleHoliday = async (date, markAsHoliday) => {
    const payload = { dates: [date] };
    if (markAsHoliday) {
      await axios.post(`${base}/holidays`, payload, { headers: getHeaders() });
    } else {
      await axios.delete(`${base}/holidays`, { headers: getHeaders(), data: payload });
    }
    await fetchOverrides();
    onSuccess();
  };

  const toggleWorkingWeekend = async (date, markAsWorking) => {
    const payload = { dates: [date] };
    if (markAsWorking) {
      await axios.post(`${base}/working-weekends`, payload, { headers: getHeaders() });
    } else {
      await axios.delete(`${base}/working-weekends`, { headers: getHeaders(), data: payload });
    }
    await fetchOverrides();
    onSuccess();
  };

  return { holidays, workingWeekends, overrideLoading, toggleHoliday, toggleWorkingWeekend };
}
