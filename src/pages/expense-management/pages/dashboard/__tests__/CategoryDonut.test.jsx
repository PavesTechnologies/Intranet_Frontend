import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CategoryDonut from "@/components/ui/CategoryDonut";
import { categoryColor } from "@/components/ui/categoryColors";

const SLICES = [
  { key: "Meals", label: "Meals", count: 1, amount: 1000 },
  { key: "Travel", label: "Travel", count: 2, amount: 650 },
  { key: "Lodging", label: "Lodging", count: 1, amount: 250 },
];

const legendRow = (container, key) => container.querySelector(`[data-legend="${key}"]`);
const sliceColor = (container, key) => container.querySelector(`circle[data-slice="${key}"]`).getAttribute("stroke");

describe("category donut", () => {
  it("lists each category with its amount and share of the total", () => {
    const { container } = render(<CategoryDonut slices={SLICES} currency="INR" claimed={1900} />);
    expect(within(legendRow(container, "Meals")).getByText("Meals")).toBeInTheDocument();
    expect(legendRow(container, "Meals").textContent).toMatch(/1,000/);
    expect(legendRow(container, "Meals").textContent).toMatch(/53%/);
    expect(legendRow(container, "Travel").textContent).toMatch(/650/);
    expect(legendRow(container, "Travel").textContent).toMatch(/34%/);
    expect(legendRow(container, "Lodging").textContent).toMatch(/13%/);
  });

  it("shows the claimed total in the centre, and the period above it", () => {
    const { container } = render(<CategoryDonut slices={SLICES} currency="INR" claimed={1900} period="All time, all submitted reports" />);
    expect(container.querySelector('[data-donut="centre"]').textContent).toMatch(/1,900/);
    expect(container.querySelector('[data-donut="period"]').textContent).toMatch(/Period: All time, all submitted reports/);
  });

  it("gives each category the colour its name maps to, and the same colour in the legend", () => {
    const { container } = render(<CategoryDonut slices={SLICES} currency="INR" claimed={1900} />);
    SLICES.forEach((s) => {
      expect(sliceColor(container, s.key)).toBe(categoryColor(s));
      expect(legendRow(container, s.key).querySelector("span[aria-hidden]").style.background).not.toBe("");
    });
  });

  it("shows a single category as the whole ring at 100%", () => {
    const { container } = render(
      <CategoryDonut slices={[{ key: "Travel", label: "Travel", count: 3, amount: 1900 }]} currency="INR" claimed={1900} />,
    );
    expect(legendRow(container, "Travel").textContent).toMatch(/100%/);
    expect(sliceColor(container, "Travel")).toBe(categoryColor({ key: "Travel", label: "Travel" }));
    expect(container.querySelector('[data-donut="empty"]')).toBeNull();
  });

  it("shows an empty state when nothing has been claimed", () => {
    const { container } = render(<CategoryDonut slices={[]} currency="INR" claimed={0} />);
    expect(screen.getByText("No claimed expenses yet")).toBeInTheDocument();
    expect(container.querySelector("circle[data-slice]")).toBeNull();
    expect(container.querySelector('[data-donut="empty"]')).not.toBeNull();
  });

  it("treats categories with zero amount as nothing claimed", () => {
    render(<CategoryDonut slices={[{ key: "Meals", label: "Meals", count: 1, amount: 0 }]} currency="INR" />);
    expect(screen.getByText("No claimed expenses yet")).toBeInTheDocument();
  });

  it("falls back to the sum of the categories when no claimed total is given", () => {
    const { container } = render(<CategoryDonut slices={SLICES} currency="INR" />);
    expect(container.querySelector('[data-donut="centre"]').textContent).toMatch(/1,900/);
  });

  it("marks a category too small to round as <1%, not 0%", () => {
    const { container } = render(
      <CategoryDonut
        slices={[{ key: "Big", label: "Big", count: 1, amount: 100000 }, { key: "Tiny", label: "Tiny", count: 1, amount: 10 }]}
        currency="INR"
      />,
    );
    expect(legendRow(container, "Tiny").textContent).toMatch(/<1%/);
  });
});
