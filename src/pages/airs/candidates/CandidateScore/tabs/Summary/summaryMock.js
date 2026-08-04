// Adapts the mapped candidate record (from GET /airs/campaign-candidates/{id})
// into the shape the Summary tab renders. No values are computed here — all
// fields are read directly from the candidate record.
export function getSummaryMock(candidate) {
  return {
    currentDesignation: candidate.role,
    department: candidate.department,
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
    appliedOn: candidate.createdAt,
    status: candidate.status,
    aiCandidateSummary: candidate.aiCandidateSummary,
  };
}
