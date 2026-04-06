import React from "react";
import clsx from "clsx";


// const normalizeStatus = (label = "") => {
//   const map = {
//     accepted: "active",
//     verified: "active",
//     submitted: "pending",
//     rejected: "reject",
//   };

//   const key = label.toLowerCase();
//   return map[key] || key;
// };


const StatusBadge = ({ label, size = "md" }) => {
  const raw = label?.toLowerCase() || "";
  const normalized = raw;

  let bgColor = "bg-gray-200";
  let textColor = "text-gray-700";

  if (
    normalized.includes("approve") ||
    normalized.includes("complete") ||
    normalized.includes("release") ||
    normalized.includes("active") 
  ) {
    bgColor = "bg-green-100";
    textColor = "text-green-700";
  } else if (
    normalized.includes("pending") ||
    normalized.includes("hold") ||
    normalized.includes("progress")
  ) {
    bgColor = "bg-yellow-100";
    textColor = "text-yellow-700";
  } else if (
    normalized.includes("reject") ||
    normalized.includes("cancel") ||
    normalized.includes("fail") ||
    normalized.includes("inactive") 
  ) {
    bgColor = "bg-red-100";
    textColor = "text-red-600";
  }

  if (raw === "offered") {
    bgColor = "bg-blue-100";
    textColor = "text-blue-700";
  }

  if (raw === "created") {
    bgColor = "bg-gray-100";
    textColor = "text-gray-700";
  }

  if (raw === "reject") {
    bgColor = "bg-red-100";
    textColor = "text-red-700";
  }

  if (raw === "verified") {
    bgColor = "bg-green-100";
    textColor = "text-green-700";
  }

  if (raw === "completed") {
    bgColor = "bg-blue-100";
    textColor = "text-blue-700";
  }

  if (raw === "joining") {
    bgColor = "bg-purple-100";
    textColor = "text-purple-700";
  }

  if (raw === "accepted") {
    bgColor = "bg-orange-100";
    textColor = "text-orange-700";
  }

  if (raw === "submitted") {
    bgColor = "bg-yellow-100";
    textColor = "text-yellow-700";
  }


  const sizeStyles = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  };

  return (
    <span
      className={clsx(
        "inline-block rounded-full font-medium",
        bgColor,
        textColor,
        sizeStyles[size]
      )}
    >
      {label}
    </span>
  );
};


export default StatusBadge;
