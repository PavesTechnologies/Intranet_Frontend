import { projectIdForClient, projectOptionsForClient } from "../BillableClientFields";
import { crossDepartmentCostCenterLabels } from "../SplitAllocation";

const projects = [
  { projectId: "p1", projectCode: "AP-1", projectName: "Alpha", clientId: "c1" },
  { projectId: "p2", projectCode: "AP-2", projectName: "Beta", clientId: "c2" },
];

describe("projectOptionsForClient", () => {
  it("lists only the selected client's projects", () => {
    expect(projectOptionsForClient(projects, "c1")).toEqual([{ value: "p1", label: "AP-1 - Alpha" }]);
  });

  it("lists nothing until a client is chosen", () => {
    expect(projectOptionsForClient(projects, "")).toEqual([]);
  });
});

describe("projectIdForClient", () => {
  it("keeps a project that belongs to the new client", () => {
    expect(projectIdForClient(projects, "p1", "c1")).toBe("p1");
  });

  it("drops a project that belongs to another client, or when the client is cleared", () => {
    expect(projectIdForClient(projects, "p1", "c2")).toBe("");
    expect(projectIdForClient(projects, "p1", "")).toBe("");
  });
});

describe("crossDepartmentCostCenterLabels", () => {
  const costCenterOptions = [
    { value: "cc-eng", label: "ENG - Engineering", departmentUuid: "D-ENG" },
    { value: "cc-hr", label: "HR - People", departmentUuid: "d-hr" },
    { value: "cc-none", label: "GEN - General" },
  ];
  const notSplit = { enabled: false, rows: [] };
  const split = (...ids) => ({ enabled: true, rows: ids.map((costCenterId) => ({ costCenterId })) });

  it("is empty when the line's own cost center is in the home department (case-insensitive)", () => {
    expect(crossDepartmentCostCenterLabels({ split: notSplit, costCenterId: "cc-eng", costCenterOptions, homeDepartmentUuid: "d-eng" })).toEqual([]);
  });

  it("names the cost center outside the home department", () => {
    expect(crossDepartmentCostCenterLabels({ split: notSplit, costCenterId: "cc-hr", costCenterOptions, homeDepartmentUuid: "d-eng" })).toEqual([
      "HR - People",
    ]);
  });

  it("checks every split row instead of the line's own cost center when split", () => {
    expect(
      crossDepartmentCostCenterLabels({ split: split("cc-eng", "cc-hr"), costCenterId: "cc-eng", costCenterOptions, homeDepartmentUuid: "d-eng" })
    ).toEqual(["HR - People"]);
  });

  it("never counts a cost center without a department", () => {
    expect(crossDepartmentCostCenterLabels({ split: notSplit, costCenterId: "cc-none", costCenterOptions, homeDepartmentUuid: "d-eng" })).toEqual([]);
  });

  it("with the home department unknown, lists every share of a split across two departments", () => {
    expect(
      crossDepartmentCostCenterLabels({ split: split("cc-eng", "cc-hr"), costCenterId: "", costCenterOptions, homeDepartmentUuid: null })
    ).toEqual(["ENG - Engineering", "HR - People"]);
  });
});
