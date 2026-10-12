import React from "react";
import StatCard from "@/components/Cards/StatCard";

/**
 * The global StatCard, made clickable: used as a summary card that also switches the page to the
 * matching tab/filter. `active` outlines the card that matches the current view.
 */
export default function SelectableStatCard({ active, onClick, ...statCardProps }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full rounded-xl text-left transition hover:-translate-y-px hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
        active ? "ring-2 ring-indigo-500" : ""
      }`}
    >
      <StatCard {...statCardProps} />
    </button>
  );
}
