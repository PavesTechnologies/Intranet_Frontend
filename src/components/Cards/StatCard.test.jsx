import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Wallet } from "lucide-react";
import StatCard from "./StatCard";

describe("StatCard", () => {
  it("renders the default variant exactly as before", () => {
    const { container } = render(<StatCard title="Ready to pay" value="₹1,000" subtitle="2 invoices" icon={Wallet} />);
    const card = container.firstChild;

    expect(card).toHaveClass("relative rounded-xl border bg-white p-4 shadow-sm", { exact: true });
    expect(screen.getByText("Ready to pay")).toHaveClass("text-xs uppercase tracking-wide text-slate-500");
    expect(screen.getByText("₹1,000")).toHaveClass("mt-2 text-2xl font-bold text-slate-800", { exact: true });
    expect(screen.getByText("2 invoices")).toHaveClass("mt-1 text-xs text-slate-500", { exact: true });
    // Bare icon, no tinted box.
    // (lucide adds its own "lucide lucide-*" classes, so this one isn't an exact match.)
    expect(card.querySelector("svg")).toHaveClass("h-4", "w-4", "shrink-0", "text-slate-400");
    expect(card.querySelector("svg").parentElement).toHaveClass("flex items-start justify-between gap-2", { exact: true });
  });

  it("renders the detailed variant with a boxed icon and wrapping value/description", () => {
    const { container } = render(
      <StatCard variant="detailed" title="Total we owe vendors" value="₹12,34,56,789" subtitle="A long description" icon={Wallet} />,
    );
    const card = container.firstChild;

    expect(card).toHaveClass("flex", "h-full", "flex-col", "p-5", "border-slate-200");
    expect(card.querySelector("svg").parentElement).toHaveClass("h-9", "w-9", "rounded-lg");
    expect(screen.getByText("₹12,34,56,789")).toHaveClass("break-words", "tabular-nums");
    expect(screen.getByText("A long description")).toHaveClass("break-words");
  });
});
