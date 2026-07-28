// Mock data for the Summary tab — high-level overview only, no scoring.
// Derived from the shared candidate record so the header and this tab never
// disagree, but nothing below is used by the scoring tabs.
export function getSummaryMock(candidate) {
  return {
    currentDesignation: candidate.role,
    department: candidate.dept,
    experienceYears: candidate.experience,
    location: candidate.location,
    contact: {
      email: candidate.email,
      phone: candidate.phone,
    },
    currentCompany: candidate.company,
    noticePeriod: candidate.notice,
    education: candidate.education,
    expectedSalary: candidate.salary,
    appliedOn: candidate.appliedOn,
    aiCandidateSummary: candidate.summary,
  };
}
