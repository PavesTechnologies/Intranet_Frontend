import { describe, expect, it, vi, beforeEach } from "vitest";

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));
vi.mock("../../../../api/axiosInstance", () => ({ default: api }));

import * as milestoneApi from "../api/milestoneApi";

// Mocked transport: these tests pin the request contract the UI sends (verb, URL, payload). They do not prove what the
// real PMS backend accepts or authorises.
beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset().mockResolvedValue({ data: { ok: true } }));
  window.__APP_CONFIG__.PMS_BASE_URL = "http://pms.test";
});

describe("milestoneApi request contract", () => {
  it("lists milestones with paging/sort and drops empty filters", async () => {
    const data = await milestoneApi.fetchMilestones({
      projectId: 10, page: 0, size: 20, status: "", readiness: "", sortBy: "createdAt", direction: "asc",
    });
    expect(data).toEqual({ ok: true });
    expect(api.get).toHaveBeenCalledWith("http://pms.test/api/projects/10/milestones", {
      params: { page: 0, size: 20, sortBy: "createdAt", direction: "asc", status: undefined, readiness: undefined },
    });
  });

  it("passes status and readiness filters when set", async () => {
    await milestoneApi.fetchMilestones({ projectId: 10, page: 1, size: 20, status: "COMPLETED", readiness: "READY_FOR_BILLING", sortBy: "name", direction: "desc" });
    expect(api.get.mock.calls[0][1].params).toMatchObject({ status: "COMPLETED", readiness: "READY_FOR_BILLING", page: 1 });
  });

  it("reads summary, single milestone, history and epics from the PMS base URL", async () => {
    await milestoneApi.fetchMilestoneSummary(10);
    await milestoneApi.fetchMilestone(7);
    await milestoneApi.fetchMilestoneHistory(7);
    await milestoneApi.fetchProjectEpics(10);
    expect(api.get.mock.calls.map((c) => c[0])).toEqual([
      "http://pms.test/api/projects/10/milestones/summary",
      "http://pms.test/api/milestones/7",
      "http://pms.test/api/history/MILESTONE/7",
      "http://pms.test/api/projects/10/epics",
    ]);
  });

  it("creates, updates, changes status, completes and deletes with the right verbs and bodies", async () => {
    await milestoneApi.createMilestone({ projectId: 10, payload: { name: "M" } });
    await milestoneApi.updateMilestone({ milestoneId: 7, payload: { name: "M2", version: 1 } });
    await milestoneApi.changeMilestoneStatus({ milestoneId: 7, status: "ON_HOLD", version: 2 });
    await milestoneApi.completeMilestone({ milestoneId: 7, actualCompletionDate: "2026-11-01", version: 3 });
    await milestoneApi.deleteMilestone(7);

    expect(api.post).toHaveBeenCalledWith("http://pms.test/api/projects/10/milestones", { name: "M" });
    expect(api.put).toHaveBeenCalledWith("http://pms.test/api/milestones/7", { name: "M2", version: 1 });
    expect(api.patch).toHaveBeenNthCalledWith(1, "http://pms.test/api/milestones/7/status", { status: "ON_HOLD", version: 2 });
    expect(api.patch).toHaveBeenNthCalledWith(2, "http://pms.test/api/milestones/7/complete", { actualCompletionDate: "2026-11-01", version: 3 });
    expect(api.delete).toHaveBeenCalledWith("http://pms.test/api/milestones/7");
  });

  it("sends a null completion date when none is chosen", async () => {
    await milestoneApi.completeMilestone({ milestoneId: 7, actualCompletionDate: "", version: 0 });
    expect(api.patch.mock.calls[0][1]).toEqual({ actualCompletionDate: null, version: 0 });
  });

  it("does not swallow backend errors", async () => {
    const err = { response: { status: 403 } };
    api.get.mockRejectedValueOnce(err);
    await expect(milestoneApi.fetchMilestoneSummary(10)).rejects.toBe(err);
  });
});
