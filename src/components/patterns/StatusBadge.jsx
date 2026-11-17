import React from "react";
import classNames from "classnames";

// Canonical semantic status badge. Resolves a free-text status string to one
// of five subtle enterprise tones. This does NOT replace
// src/components/status/statusbadge.jsx or src/components/ui/badge.jsx —
// both have many existing consumers and keep working as-is (see
// docs/ui/phase-1-canonical-ui.md). Use StatusBadge in new/migrated code.
const TONE_CLASSES = {
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  info: "bg-info-bg text-info",
  neutral: "bg-neutral-bg text-neutral",
};

const STATUS_TONE_MAP = {
  success: "success",
  approved: "success",
  completed: "success",
  complete: "success",
  active: "success",
  done: "success",
  paid: "success",
  passed: "success",
  verified: "success",

  warning: "warning",
  pending: "warning",
  draft: "warning",
  submitted: "warning",
  hold: "warning",
  "on hold": "warning",

  danger: "danger",
  rejected: "danger",
  reject: "danger",
  failed: "danger",
  fail: "danger",
  disputed: "danger",

  info: "info",
  processing: "info",
  "in progress": "info",
  "in-progress": "info",
  "ocr processing": "info",

  neutral: "neutral",
  inactive: "neutral",
  unknown: "neutral",
  created: "neutral",
  cancelled: "neutral",
  canceled: "neutral",
};

const SIZE_CLASSES = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-1",
};

function resolveTone(status) {
  const normalized = String(status || "").toLowerCase().replace(/_/g, " ").trim();
  if (STATUS_TONE_MAP[normalized]) return STATUS_TONE_MAP[normalized];

  if (normalized.includes("approve") || normalized.includes("complete") || normalized.includes("active") || normalized.includes("pass")) {
    return "success";
  }
  if (normalized.includes("pending") || normalized.includes("draft") || normalized.includes("hold")) {
    return "warning";
  }
  if (normalized.includes("reject") || normalized.includes("fail") || normalized.includes("dispute")) {
    return "danger";
  }
  if (normalized.includes("progress") || normalized.includes("processing")) {
    return "info";
  }
  // "cancel"/"cancelled"/"canceled" (and anything else unmatched above) falls
  // through to the neutral tone below.
  return "neutral";
}

export default function StatusBadge({ status, label, tone, size = "md", className = "" }) {
  const resolvedTone = tone || resolveTone(status);
  const text = label ?? status;

  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-full font-medium capitalize",
        TONE_CLASSES[resolvedTone] || TONE_CLASSES.neutral,
        SIZE_CLASSES[size] || SIZE_CLASSES.md,
        className
      )}
    >
      {text}
    </span>
  );
}
