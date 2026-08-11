import { useState, useEffect } from "react";
import { fetchCalendarHolidays } from "../api";

export const useHolidays = () => {
  const [holidaysMap, setHolidaysMap] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const loadHolidays = async () => {
      try {
        const data = await fetchCalendarHolidays();
        if (!data) return;
        const map = {};
        data.forEach((h) => {
          const [year, month, day] = h.holidayDate.split("-").map(Number);
          const localDate = new Date(year, month - 1, day, 0, 0, 0);
          const key = `${localDate.getFullYear()}-${String(
            localDate.getMonth() + 1,
          ).padStart(2, "0")}-${String(localDate.getDate()).padStart(2, "0")}`;
          map[key] = h;
        });
        setHolidaysMap(map);
      } catch (err) {
        console.error("❌ Failed to load holidays:", err);
      } finally {
        setLoading(false);
      }
    };
    loadHolidays();
  }, []);

  return { holidaysMap, loading };
};
