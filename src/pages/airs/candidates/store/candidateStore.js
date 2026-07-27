import { MOCK_CANDIDATES } from "../mock/candidateMockData";

// Bumped to v2: earlier cached candidates predate the scoreBreakdown.items
// shape (M07-E01/S05), so a v1 cache would show "No hierarchy match data
// available" forever. Bumping the key abandons stale caches and falls back
// to fresh MOCK_CANDIDATES, which always has the current shape.
export const CANDIDATE_STORAGE_KEY = "airs_candidates_pool_v2";

// Guards against a cache that was written by an older shape of this mock
// store slipping past the STORAGE_KEY bump (e.g. a partially-applied write).
const looksCurrent = (candidates) =>
  Array.isArray(candidates) && candidates.length > 0 && Array.isArray(candidates[0]?.scoreBreakdown?.items);

export const readCandidates = () => {
  try {
    const raw = localStorage.getItem(CANDIDATE_STORAGE_KEY);
    if (!raw) return MOCK_CANDIDATES;
    const parsed = JSON.parse(raw);
    return looksCurrent(parsed) ? parsed : MOCK_CANDIDATES;
  } catch {
    return MOCK_CANDIDATES;
  }
};

export const persistCandidates = (candidates) => {
  try {
    localStorage.setItem(CANDIDATE_STORAGE_KEY, JSON.stringify(candidates));
  } catch {
    // Ignore storage quota errors.
  }
};
