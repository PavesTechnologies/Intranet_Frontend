export const PM_REQUESTED_DEMAND_ONLY_MESSAGE =
  "Project Managers can delete only REQUESTED demands.";

export const PM_EDITABLE_DEMAND_MESSAGE =
  "Project Managers can edit only DRAFT or REQUESTED demands.";

export const normalizeRole = (role = "") =>
  String(role)
    .toUpperCase()
    .replace(/^ROLE[-_]/, "")
    .replace(/[^A-Z0-9]/g, "");

export const isProjectManagerRole = (role = "") => {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === "PROJECTMANAGER" || normalizedRole === "MANAGER";
};

export const getDemandStatus = (demand = {}) =>
  String(
    demand.lifecycleState ||
    demand.demandStatus ||
    demand.status ||
    demand.LifecycleState ||
    demand.demand_status ||
    "",
  )
    .toUpperCase()
    .trim();

export const isRequestedDemand = (demand = {}) =>
  getDemandStatus(demand) === "REQUESTED";

export const isDraftDemand = (demand = {}) => getDemandStatus(demand) === "DRAFT";

export const canProjectManagerEditDemand = (demand = {}) =>
  isDraftDemand(demand) || isRequestedDemand(demand);

export const canProjectManagerMutateDemand = (demand = {}) =>
  isRequestedDemand(demand);
