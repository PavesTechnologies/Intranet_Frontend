import { describe, expect, it } from "vitest";
import {
  CATEGORY_PALETTE,
  OTHER_CATEGORY_COLOR,
  categoryColor,
} from "@/components/ui/categoryColors";

describe("category colour mapping", () => {
  it("gives a category the same colour every time, whatever its position or amount", () => {
    const first = categoryColor({ key: "Travel", label: "Travel", amount: 100 });
    const later = categoryColor({ key: "Travel", label: "Travel", amount: 9000, count: 4 });
    expect(later).toBe(first);
  });

  it("ignores case and surrounding spaces in the name", () => {
    expect(categoryColor({ key: "Meals", label: "Meals" })).toBe(categoryColor({ key: "meals ", label: " MEALS" }));
  });

  it("only uses colours from the palette for named categories", () => {
    ["Meals", "Travel", "Lodging", "Fuel", "Client entertainment", "Software"].forEach((name) => {
      expect(CATEGORY_PALETTE).toContain(categoryColor({ key: name, label: name }));
    });
  });

  it("uses neutral grey for the rolled-up Other bucket and for uncategorized spend", () => {
    expect(categoryColor({ key: "other", label: "Other (3)" })).toBe(OTHER_CATEGORY_COLOR);
    expect(categoryColor({ key: "Uncategorized", label: "Uncategorized" })).toBe(OTHER_CATEGORY_COLOR);
    expect(categoryColor(null)).toBe(OTHER_CATEGORY_COLOR);
  });

  it("gives the common categories distinct colours from each other", () => {
    const common = ["Travel", "Lodging", "Meals", "Client entertainment", "Fuel", "Software", "Communication"];
    const colours = common.map((name) => categoryColor({ key: name, label: name }));
    expect(new Set(colours).size).toBe(common.length);
  });

  it("keeps the palette free of purple and of repeated colours", () => {
    expect(new Set(CATEGORY_PALETTE).size).toBe(CATEGORY_PALETTE.length);
    const blueOrViolet = CATEGORY_PALETTE.filter((hex) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      return b > r && b > g; // blue-dominant, which includes violet
    });
    expect(blueOrViolet.length).toBeLessThanOrEqual(1);
  });
});
