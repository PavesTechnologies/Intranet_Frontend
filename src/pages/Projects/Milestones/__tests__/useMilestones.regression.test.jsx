import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const api = vi.hoisted(() => ({ fetchMilestones: vi.fn(), createMilestone: vi.fn(), deleteMilestone: vi.fn() }));
vi.mock("../api/milestoneApi", () => ({
  fetchMilestones: api.fetchMilestones,
  fetchMilestoneSummary: vi.fn(),
  fetchMilestoneHistory: vi.fn(),
  fetchProjectEpics: vi.fn(),
  createMilestone: api.createMilestone,
  updateMilestone: vi.fn(),
  changeMilestoneStatus: vi.fn(),
  completeMilestone: vi.fn(),
  deleteMilestone: api.deleteMilestone,
}));

import { useMilestoneList, useMilestoneMutations, MILESTONES_KEY } from "../hooks/useMilestones";

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retryDelay: 1 } } });
const wrapperFor = (client) => ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

beforeEach(() => Object.values(api).forEach((fn) => fn.mockReset()));

describe("milestone hooks", () => {
  it("does not retry a 403 or other client error", async () => {
    api.fetchMilestones.mockRejectedValue({ response: { status: 403 } });
    const { result } = renderHook(() => useMilestoneList(10, { page: 0 }), { wrapper: wrapperFor(makeClient()) });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(api.fetchMilestones).toHaveBeenCalledTimes(1);
  });

  it("retries a server error once", async () => {
    api.fetchMilestones.mockRejectedValue({ response: { status: 500 } });
    const { result } = renderHook(() => useMilestoneList(10, { page: 0 }), { wrapper: wrapperFor(makeClient()) });
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 3000 });
    expect(api.fetchMilestones).toHaveBeenCalledTimes(2);
  });

  it("does not query without a project id", () => {
    renderHook(() => useMilestoneList(undefined, {}), { wrapper: wrapperFor(makeClient()) });
    expect(api.fetchMilestones).not.toHaveBeenCalled();
  });

  it("refreshes the project's milestone queries after a successful write, but not after a failure", async () => {
    const client = makeClient();
    const spy = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useMilestoneMutations(10), { wrapper: wrapperFor(client) });

    api.createMilestone.mockResolvedValueOnce({ id: 1 });
    await act(async () => {
      await result.current.create.mutateAsync({ projectId: 10, payload: {} });
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: MILESTONES_KEY(10) });

    spy.mockClear();
    api.deleteMilestone.mockRejectedValueOnce({ response: { status: 409 } });
    await act(async () => {
      await result.current.remove.mutateAsync({ milestoneId: 7 }).catch(() => {});
    });
    expect(spy).not.toHaveBeenCalled();
    expect(api.deleteMilestone).toHaveBeenCalledWith(7);
  });
});
