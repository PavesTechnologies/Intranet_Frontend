import React from "react";
import { Badge } from "../../../../components/ui/badge";
import { UPLOAD_STATUS_BADGE_TONE } from "../constants/resumeIntakeConstants";

export function filterUploads(files, { search = "", status = "All" } = {}) {
  const term = search.trim().toLowerCase();
  return files.filter((f) => {
    const matchesSearch = !term || f.name.toLowerCase().includes(term) || f.uploadedBy.toLowerCase().includes(term);
    const matchesStatus = status === "All" || f.status === status;
    return matchesSearch && matchesStatus;
  });
}

export function sortUploads(files, sortValue = "uploadedAt:desc") {
  const [field, dir] = sortValue.split(":");
  const mult = dir === "asc" ? 1 : -1;
  return [...files].sort((a, b) => {
    if (field === "name") return a.name.localeCompare(b.name) * mult;
    if (field === "progress") return (a.progress - b.progress) * mult;
    // "Just now" entries should always sort as the most recent.
    if (a.uploadedAt === "Just now") return -1 * mult;
    if (b.uploadedAt === "Just now") return 1 * mult;
    return a.uploadedAt.localeCompare(b.uploadedAt) * mult;
  });
}

export function paginate(items, page, pageSize) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, totalPages);
  const start = (current - 1) * pageSize;
  return {
    pageItems: items.slice(start, start + pageSize),
    totalPages,
    currentPage: current,
  };
}

export function computeUploadStats(files) {
  return {
    filesInQueue: files.filter((f) => f.status === "Queued" || f.status === "Parsing").length,
    parsedToday: files.filter((f) => f.status === "Parsed").length,
    duplicatesFlagged: files.filter((f) => f.status === "Duplicate flagged").length,
    failedUploads: files.filter((f) => f.status === "Failed").length,
  };
}

export function renderUploadStatusBadge(status) {
  const tone = UPLOAD_STATUS_BADGE_TONE[status] || UPLOAD_STATUS_BADGE_TONE.Queued;
  return <Badge className={`${tone} font-semibold px-2.5 py-1 text-xs`}>{status}</Badge>;
}
