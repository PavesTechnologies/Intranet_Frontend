import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ExistingNdaReusePanel from "./ExistingNdaReusePanel";
import { isReusableNda, NDA_STATUS } from "../constants/vendorOnboarding";

const onReuse = vi.fn();
const onGenerateNew = vi.fn();

const nda = (overrides = {}) => ({
  nda_id: 41,
  status_code: NDA_STATUS.COMPLETED,
  template_version: "v1",
  valid_from: "2026-01-01",
  valid_until: "2027-01-01",
  ...overrides,
});

const renderPanel = (ndas, props = {}) =>
  render(
    <ExistingNdaReusePanel
      ndas={ndas}
      onReuse={onReuse}
      onGenerateNew={onGenerateNew}
      {...props}
    />,
  );

beforeEach(() => vi.clearAllMocks());

describe("isReusableNda — which agreements a new engagement may run on", () => {
  const now = new Date("2026-06-01T00:00:00Z");

  it("accepts a completed agreement that is still in date", () => {
    expect(isReusableNda(nda(), now)).toBe(true);
  });

  it("accepts a completed agreement with no end date recorded", () => {
    expect(isReusableNda(nda({ valid_until: null }), now)).toBe(true);
  });

  it("rejects a completed agreement that has run out", () => {
    expect(isReusableNda(nda({ valid_until: "2026-05-31" }), now)).toBe(false);
  });

  it("rejects every status short of completed", () => {
    // SIGNED is the important one: it means "received, pending internal review", so reusing
    // it would let an unreviewed document clear the RFQ gate.
    [
      NDA_STATUS.PENDING,
      NDA_STATUS.SENT,
      NDA_STATUS.SIGNED,
      NDA_STATUS.REJECTED,
      NDA_STATUS.EXPIRED,
      NDA_STATUS.NOT_REQUIRED,
    ].forEach((status_code) => {
      expect(isReusableNda(nda({ status_code }), now)).toBe(false);
    });
  });

  it("rejects nothing at all", () => {
    expect(isReusableNda(null, now)).toBe(false);
  });
});

describe("ExistingNdaReusePanel", () => {
  it("shows the reusable agreement with the metadata the lookup returned", () => {
    renderPanel([nda({ pr_id: 7 })]);

    expect(screen.getByText("NDA #41")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("#7")).toBeInTheDocument();
    expect(screen.getByText("v1")).toBeInTheDocument();
  });

  it("omits an originating PR the API did not provide rather than inventing one", () => {
    renderPanel([nda()]);

    expect(screen.getByText("NDA #41")).toBeInTheDocument();
    expect(screen.queryByText("Originating PR")).not.toBeInTheDocument();
  });

  it("renders nothing when no agreement on file is reusable", () => {
    const { container } = renderPanel([
      nda({ status_code: NDA_STATUS.EXPIRED }),
      nda({ nda_id: 42, status_code: NDA_STATUS.REJECTED }),
      nda({ nda_id: 43, status_code: NDA_STATUS.SIGNED }),
    ]);

    // The Generate flow stays the only way forward in that case.
    expect(container).toBeEmptyDOMElement();
  });

  it("excludes the NDA already in use for this scope", () => {
    const { container } = renderPanel([nda()], { currentNdaId: 41 });
    expect(container).toBeEmptyDOMElement();
  });

  it("offers reuse and generate-new as clearly separate actions", async () => {
    const user = userEvent.setup();
    renderPanel([nda()]);

    await user.click(screen.getByRole("button", { name: /use existing nda/i }));
    expect(onReuse).toHaveBeenCalledTimes(1);
    expect(onGenerateNew).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /generate new nda instead/i }));
    expect(onGenerateNew).toHaveBeenCalledTimes(1);
  });

  it("lists every valid agreement when the vendor has more than one", () => {
    renderPanel([nda(), nda({ nda_id: 42, template_version: "v2" })]);

    expect(screen.getByText("NDA #41")).toBeInTheDocument();
    expect(screen.getByText("NDA #42")).toBeInTheDocument();
    expect(screen.getByText("2 valid")).toBeInTheDocument();
    expect(screen.getByText(/the server selects the one that covers/i)).toBeInTheDocument();
  });

  it("hides generate-new from a user who may not generate", () => {
    renderPanel([nda()], { canGenerate: false });

    expect(screen.getByRole("button", { name: /use existing nda/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /generate new nda instead/i }),
    ).not.toBeInTheDocument();
  });
});
