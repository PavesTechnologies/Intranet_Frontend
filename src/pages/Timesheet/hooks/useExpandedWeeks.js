import { useState } from "react";

export const useExpandedWeeks = () => {
  const [expandedWeeks, setExpandedWeeks] = useState({});

  const toggleWeek = (key) =>
    setExpandedWeeks((prev) => ({ ...prev, [key]: !prev[key] }));

  return { expandedWeeks, toggleWeek };
};
