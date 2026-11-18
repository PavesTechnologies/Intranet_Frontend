import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CollapsiblePanel from "./CollapsiblePanel";

describe("CollapsiblePanel", () => {
  it("is collapsed by default and toggles from the header", () => {
    render(
      <CollapsiblePanel title="TDS Determination" badge={<span>Verified</span>}>
        <p>Body content</p>
      </CollapsiblePanel>,
    );
    const toggle = screen.getByRole("button", { name: /TDS Determination/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.queryByText("Body content")).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Body content")).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.queryByText("Body content")).not.toBeInTheDocument();
  });

  it("respects defaultOpen", () => {
    render(
      <CollapsiblePanel title="Approval" defaultOpen>
        <p>Body content</p>
      </CollapsiblePanel>,
    );
    expect(screen.getByText("Body content")).toBeInTheDocument();
  });

  it("header actions work without toggling the card", () => {
    const onRecheck = vi.fn();
    render(
      <CollapsiblePanel title="Payment Terms" actions={<button onClick={onRecheck}>Re-check</button>}>
        <p>Body content</p>
      </CollapsiblePanel>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Re-check" }));
    expect(onRecheck).toHaveBeenCalled();
    expect(screen.queryByText("Body content")).not.toBeInTheDocument();
  });

  it("opens when an in-page link to its anchor is clicked", () => {
    render(
      <>
        <a href="#invoice-tds">Verify TDS</a>
        <CollapsiblePanel title="TDS Determination" anchorId="invoice-tds">
          <p>Body content</p>
        </CollapsiblePanel>
      </>,
    );
    fireEvent.click(screen.getByText("Verify TDS"));
    expect(screen.getByText("Body content")).toBeInTheDocument();
  });
});
