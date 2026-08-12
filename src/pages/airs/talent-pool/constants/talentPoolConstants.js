// Talent Pool has no dedicated candidate-list endpoint on the backend, so
// its list view runs on the same real GET /resumes endpoint (and page size)
// the Resume Intake module already uses.
export const TALENT_POOL_PAGE_SIZE = 12;

// A curated quick-filter list for the location checkbox filter — the
// backend has no "distinct candidate locations" endpoint (location is a
// free-text field extracted from each resume), so this is a fixed set of
// checkbox OPTIONS to filter BY, not real candidate data. Sent to the
// backend's `locations` param as a case-insensitive substring match, same
// as the skill filter.
export const TALENT_POOL_LOCATION_OPTIONS = [
  "Bengaluru",
  "Hyderabad",
  "Mumbai",
  "Pune",
  "Chennai",
  "Gurugram",
  "Delhi",
  "Remote",
];
