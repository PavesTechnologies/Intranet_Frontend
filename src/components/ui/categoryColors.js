// Colour for each expense category in the employee donut. A category always gets the same colour, chosen from its
// name, so it does not move when amounts change. Common categories have fixed slots, so they are always distinct
// from each other. Other names are hashed onto the palette, so two unusual names can still share a colour.
// Navy is the only blue, and there is no purple, so the site theme leads. "Other" (the backend's roll-up beyond the top 7) and uncategorized spend are grey.

// Site theme first: navy primary (#0A0082) and pink accent (#ff3d72), then complementary hues for the rest.
export const CATEGORY_PALETTE = [
  "#0A0082", // navy (site primary)
  "#ff3d72", // pink (site accent)
  "#0d9488", // teal
  "#f59e0b", // amber
  "#16a34a", // green
  "#ea580c", // orange
  "#8b5a2b", // brown
  "#65a30d", // lime
];
export const OTHER_CATEGORY_COLOR = "#94a3b8";

// Fixed slots for the categories that appear in most expense reports.
const FIXED_SLOTS = {
  travel: 0,
  lodging: 1,
  meals: 2,
  "client entertainment": 3,
  fuel: 4,
  software: 5,
  communication: 6,
};

// Small, stable string hash (FNV-1a, 32-bit). Same input, same output, in every browser and render.
const hash = (text) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
};

/** @param {{key?: string, label?: string}} slice a backend slice; key "other" is the rolled-up bucket */
export function categoryColor(slice) {
  if (!slice) return OTHER_CATEGORY_COLOR;
  if (slice.key === "other") return OTHER_CATEGORY_COLOR;
  const name = String(slice.label || slice.key || "").trim().toLowerCase();
  if (!name || name === "uncategorized") return OTHER_CATEGORY_COLOR;
  if (Object.prototype.hasOwnProperty.call(FIXED_SLOTS, name)) return CATEGORY_PALETTE[FIXED_SLOTS[name]];
  return CATEGORY_PALETTE[hash(name) % CATEGORY_PALETTE.length];
}
