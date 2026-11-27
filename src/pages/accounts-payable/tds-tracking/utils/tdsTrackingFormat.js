/** "194J / 393(1) Table 6(iii).D(b) (1027)" — old/new section and rule code from the backend's snapshot. */
export function sectionLabel(row) {
  const section = [row.oldSection, row.newSection].filter(Boolean).join(" / ");
  return section ? `${section}${row.ruleCode ? ` (${row.ruleCode})` : ""}` : row.ruleCode || "—";
}
