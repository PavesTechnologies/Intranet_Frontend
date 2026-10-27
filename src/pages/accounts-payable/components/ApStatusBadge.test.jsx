import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ApStatusBadge from "./ApStatusBadge";

const badge = () => screen.getByTestId("ap-status-badge");

// jsdom normalises inline hex colours to rgb().
const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

const expectColors = ([background, text]) => {
  expect(badge().style.backgroundColor).toBe(rgb(background));
  expect(badge().style.color).toBe(rgb(text));
};

describe("ApStatusBadge — invoice status", () => {
  it.each([
    ["Approved", ["#D1FAE5", "#047857"]],
    ["Paid", ["#DCFCE7", "#15803D"]],
    ["Ready for Payment", ["#EEF2FF", "#4338CA"]],
    ["Pending Approval", ["#FEF3C7", "#92400E"]],
    ["Rejected", ["#FEE2E2", "#B91C1C"]],
    ["Returned for Review", ["#F1F5F9", "#475569"]],
  ])("shows %s in its specified colours", (status, colors) => {
    render(<ApStatusBadge status={status} />);
    expect(badge()).toHaveTextContent(status);
    expectColors(colors);
  });

  it("resolves a status code and an already-displayed label to the same badge", () => {
    const { unmount } = render(<ApStatusBadge status="READY_FOR_PAYMENT" />);
    expect(badge()).toHaveTextContent("Ready for Payment");
    expectColors(["#EEF2FF", "#4338CA"]);
    unmount();

    render(<ApStatusBadge status="OCR_REVIEW_PENDING" />);
    // The existing plain-word display label is kept.
    expect(badge()).toHaveTextContent("To review");
  });

  it("falls back to a neutral badge showing the raw value for an unknown status", () => {
    render(<ApStatusBadge status="SOMETHING_NEW" />);
    expect(badge()).toHaveTextContent("SOMETHING_NEW");
    expectColors(["#F3F4F6", "#374151"]);
  });

  it("shows a dash for a missing status", () => {
    render(<ApStatusBadge status={null} />);
    expect(badge()).toHaveTextContent("—");
  });
});

describe("ApStatusBadge — TDS status", () => {
  it.each([
    ["TDS_PENDING", "TDS Pending", ["#FFF7ED", "#C2410C"]],
    ["TDS_DEDUCTED", "TDS Deducted", ["#EDE9FE", "#6D28D9"]],
    ["TDS_DEPOSITED", "TDS Deposited", ["#DBEAFE", "#1D4ED8"]],
    ["TDS_FILED", "TDS Return Filed", ["#CCFBF1", "#0F766E"]],
  ])("shows %s as %s", (status, label, colors) => {
    render(<ApStatusBadge type="tds" status={status} determinationStatus="VERIFIED" />);
    expect(badge()).toHaveTextContent(label);
    expectColors(colors);
  });

  it("shows one Awaiting Verification badge for a pending, unverified determination", () => {
    render(
      <ApStatusBadge type="tds" status="TDS_PENDING" label="TDS Pending" determinationStatus="DETERMINED" />,
    );
    expect(badge()).toHaveTextContent("Awaiting Verification");
    expect(screen.queryByText("TDS Pending")).not.toBeInTheDocument();
    expectColors(["#FFF7ED", "#C2410C"]);
  });

  it("does not relabel a status past TDS Pending", () => {
    render(<ApStatusBadge type="tds" status="TDS_DEDUCTED" determinationStatus="DETERMINED" />);
    expect(badge()).toHaveTextContent("TDS Deducted");
  });

  it("prefers the backend's label and falls back to neutral for an unknown code", () => {
    render(<ApStatusBadge type="tds" status="TDS_SOMETHING" label="Backend Label" />);
    expect(badge()).toHaveTextContent("Backend Label");
    expectColors(["#F3F4F6", "#374151"]);
  });
});

describe("ApStatusBadge — dimensions and long labels", () => {
  it("renders every badge with the same fixed pill classes", () => {
    const { unmount } = render(<ApStatusBadge status="Paid" />);
    const invoiceClasses = badge().className;
    unmount();
    render(<ApStatusBadge type="tds" status="TDS_FILED" />);

    expect(badge().className).toBe(invoiceClasses);
    for (const cls of [
      "w-[145px]", "h-8", "inline-flex", "items-center", "justify-center", "rounded-full",
      "text-xs", "font-medium", "box-border", "whitespace-nowrap", "max-w-full",
    ]) {
      expect(badge()).toHaveClass(cls);
    }
  });

  it("truncates a long label while keeping the full text in the DOM and the tooltip", () => {
    const long = "An exceptionally long backend status label that cannot fit";
    render(<ApStatusBadge type="tds" status="TDS_X" label={long} />);

    expect(badge()).toHaveAttribute("title", long);
    expect(badge().firstChild).toHaveClass("truncate");
    expect(badge()).toHaveTextContent(long);
  });
});
