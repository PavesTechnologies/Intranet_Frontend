/**
 * Round-trips the backend's criteriaPattern grammar (CriteriaPatternEvaluator.java) for the visual
 * builder's supported shape: disjunctive normal form - OR of AND-groups, e.g. "(1 AND 2) OR 3".
 * The full grammar is more general (arbitrary nesting via parens: expr := term (OR term)*, term :=
 * factor (AND factor)*, factor := NUMBER | '(' expr ')'), but DNF covers every realistic admin rule
 * ("amount > X AND category = Y", "department = A OR department = B", etc.) without needing a full
 * expression-tree editor. A pattern that doesn't fit this shape (e.g. hand-written via Swagger, or a
 * deeper nesting) fails to parse here - the caller falls back to a raw-text pattern field rather
 * than silently mangling it.
 *
 * Data model: groups = [{ criteria: [{ field, operator, value }, ...] }, ...]
 * (indices are assigned fresh on serialize - callers don't need to track them.)
 */

export function serializeCriteriaGroups(groups) {
  let index = 0;
  const criteria = [];
  const groupPatterns = [];

  for (const group of groups) {
    const groupIndices = [];
    for (const c of group.criteria) {
      index += 1;
      criteria.push({ index, field: c.field, operator: c.operator, value: c.value });
      groupIndices.push(index);
    }
    if (groupIndices.length === 0) continue;
    groupPatterns.push(groupIndices.length === 1 ? `${groupIndices[0]}` : `(${groupIndices.join(" AND ")})`);
  }

  return { criteria, criteriaPattern: groupPatterns.join(" OR ") };
}

/**
 * Returns { groups } on success, or null if the pattern doesn't fit the OR-of-ANDs shape this
 * builder supports (caller should fall back to raw-text editing rather than treat null as empty).
 */
export function parseCriteriaPattern(criteriaPattern, criteria) {
  if (!criteriaPattern || !criteria?.length) return { groups: [] };

  const byIndex = new Map(criteria.map((c) => [c.index, c]));
  const groupSegments = criteriaPattern.split(/\s+OR\s+/i);
  const groups = [];

  for (const segment of groupSegments) {
    const trimmed = segment.trim().replace(/^\(/, "").replace(/\)$/, "");
    if (/[()]/.test(trimmed)) return null; // nested parens - outside DNF, bail to raw mode

    const indices = trimmed.split(/\s+AND\s+/i).map((s) => Number.parseInt(s.trim(), 10));
    if (indices.some((n) => Number.isNaN(n) || !byIndex.has(n))) return null;

    groups.push({ criteria: indices.map((n) => ({ ...byIndex.get(n) })) });
  }

  return { groups };
}
