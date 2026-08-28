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
    // Resume-parsed data (merged onto candidate by CandidateScorePage's
    // mergeResumeFields) — surfaced here too so Summary gives a quick
    // overview without needing the full Resume tab.
    skills: Array.isArray(candidate.skills) ? candidate.skills : [],
    certifications: Array.isArray(candidate.certifications) ? candidate.certifications : [],
  };
}
