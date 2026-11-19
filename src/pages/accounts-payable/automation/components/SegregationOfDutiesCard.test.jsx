import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import SegregationOfDutiesCard from "./SegregationOfDutiesCard";
import { useSegregationOfDuties, useSetSegregationOfDuties } from "../hooks/useApAutomation";

vi.mock("../hooks/useApAutomation", () => ({ useSegregationOfDuties: vi.fn(), useSetSegregationOfDuties: vi.fn() }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const RULES = [
  { key: "SOD_PREPARER_CANNOT_APPROVE", label: "Preparer cannot approve", description: "Uploader can't approve.", enabled: true, default: true },
  { key: "SOD_RELEASER_CANNOT_PAY", label: "Maker-checker on payment", description: "Releaser can't pay.", enabled: false, default: false },
];

describe("SegregationOfDutiesCard", () => {
  const mutateAsync = vi.fn().mockResolvedValue([]);
  beforeEach(() => {
    vi.clearAllMocks();
    useSegregationOfDuties.mockReturnValue({ data: RULES, isLoading: false, isError: false });
    useSetSegregationOfDuties.mockReturnValue({ mutateAsync, isPending: false });
  });

  it("shows each rule with its state", () => {
    render(<SegregationOfDutiesCard />);
    expect(screen.getByRole("switch", { name: "Preparer cannot approve" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("switch", { name: "Maker-checker on payment" })).toHaveAttribute("aria-checked", "false");
  });

  it("asks for confirmation, then flips only that rule", async () => {
    render(<SegregationOfDutiesCard />);
    await userEvent.click(screen.getByRole("switch", { name: "Maker-checker on payment" }));
    expect(mutateAsync).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Switch on" }));
    expect(mutateAsync).toHaveBeenCalledWith({ SOD_RELEASER_CANNOT_PAY: true });
  });
});
