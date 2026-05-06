import { normalizeId } from "./normalize";
import { toISODate } from "./dataParser";

export const buildEpicPayload = (d) => ({
  name: d.name,
  description: d.description || null,
  statusId: Number(d.statusId),
  priority: d.priority || "MEDIUM",
  projectId: Number(d.projectId),
  reporterId: normalizeId(d.reporterId),
  assigneeId: normalizeId(d.assigneeId),
  startDate: toISODate(d.startDate),
  dueDate: toISODate(d.dueDate),
});

export const buildStoryPayload = (d) => ({
  title: d.title,
  description: d.description || null,
  acceptanceCriteria: d.acceptanceCriteria || null,
  storyPoints: Number(d.storyPoints) || 0,
  assigneeId: normalizeId(d.assigneeId),
  reporterId: normalizeId(d.reporterId),
  projectId: Number(d.projectId),
  epicId: normalizeId(d.epicId),
  sprintId: normalizeId(d.sprintId),
  statusId: Number(d.statusId),
  priority: d.priority || "LOW",
  startDate: toISODate(d.startDate),
  dueDate: toISODate(d.dueDate),
});

export const buildTaskPayload = (d, fallbackSprint) => ({
  title: d.title,
  description: d.description || null,
  statusId: Number(d.statusId),
  priority: d.priority || "MEDIUM",
  storyPoints: Number(d.storyPoints) || 0,
  startDate: toISODate(d.startDate),
  dueDate: toISODate(d.dueDate),
  projectId: Number(d.projectId),
  reporterId: normalizeId(d.reporterId),
  storyId: normalizeId(d.storyId),
  assigneeId: normalizeId(d.assigneeId),
  sprintId: normalizeId(d.sprintId) ?? normalizeId(fallbackSprint),
  billable: !!d.Billable,
});

export const buildBugPayload = (d) => ({
  title: d.title,
  description: d.description || null,
  priority: d.priority || "MEDIUM",
  status: d.status || "OPEN",
  severity: d.severity || "MINOR",
  type: d.type || null,
  reporter: normalizeId(d.reporterId),
  assignedTo: normalizeId(d.assigneeId),
  projectId: Number(d.projectId),
  sprintId: normalizeId(d.sprintId),
  epicId: normalizeId(d.epicId),
  taskId: normalizeId(d.taskId),
  stepsToReproduce: d.stepsToReproduce || null,
  expectedResult: d.expectedResult || null,
  actualResult: d.actualResult || null,
  attachments: d.attachments || null,
});
