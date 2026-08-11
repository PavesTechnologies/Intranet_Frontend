// Talent Pool has no dedicated candidate-list endpoint on the backend, so
// its list view runs on the same real GET /resumes endpoint (and page size)
// the Resume Intake module already uses.
export const TALENT_POOL_PAGE_SIZE = 12;
