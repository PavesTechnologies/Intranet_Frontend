// Mock data for the Deterministic Score tab (M07). Everything here is
// derived from the candidate's existing score_breakdown (M07-E01/S05
// contract: items, noVerifiedSkills, score, status, mandatoryCoveragePct,
// preferredSkillBonus) plus a few M07-specific fields — experience/education
// validation and the score calculation breakdown — that don't exist on the
// shared candidate record yet.
const DETERMINISTIC_THRESHOLD = 60;

const DEGREE_REQUIREMENT_BY_DEPT = {
  Engineering: "Bachelor's in Computer Science or related field",
  "Data & AI": "Bachelor's/Master's in Computer Science, Statistics or related field",
  Product: "Bachelor's Degree (any discipline)",
  Platform: "Bachelor's in Computer Science or related field",
  Sales: "Bachelor's Degree (any discipline)",
  Design: "Bachelor's in Design, HCI or related field",
};

function requiredExperienceFor(role) {
  if (role.includes("Senior")) return 5;
  if (role.includes("II")) return 3;
  if (role.includes("Enterprise")) return 4;
  return 2;
}

export function getDeterministicMock(candidate) {
  const sb = candidate.scoreBreakdown;
  const requiredExperience = requiredExperienceFor(candidate.role);
  const experienceTolerance = 1;
  const experiencePass = candidate.experience >= requiredExperience - experienceTolerance;

  const requiredDegree = DEGREE_REQUIREMENT_BY_DEPT[candidate.dept] || "Bachelor's Degree (any discipline)";
  const equivalentExperienceApplied = !experiencePass && candidate.experience >= requiredExperience - 3;
  const educationPass = !sb.noVerifiedSkills;

  const skillsScore = sb.score;
  const experienceScore = experiencePass ? 100 : equivalentExperienceApplied ? 70 : 40;
  const educationScore = educationPass ? 100 : 50;
  // Backend weighting for the M07 composite deterministic formula — skills
  // dominate, experience/education are lighter validation gates.
  const finalScore = Math.round((skillsScore * 0.7 + experienceScore * 0.15 + educationScore * 0.15) * 100) / 100;

  const experienceValidation = {
    requiredExperience,
    candidateExperience: candidate.experience,
    toleranceYears: experienceTolerance,
    result: experiencePass ? "PASS" : "FAIL",
  };

  const educationValidation = {
    requiredDegree,
    candidateDegree: candidate.education,
    equivalentExperienceApplied,
    result: educationPass ? "PASS" : "FAIL",
  };

  const scoreCalculation = { skillsScore, experienceScore, educationScore, finalScore };

  return {
    scoreCard: {
      overallScore: sb.score,
      status: sb.status,
      threshold: DETERMINISTIC_THRESHOLD,
      coverage: sb.mandatoryCoveragePct,
    },
    hierarchy: sb,
    manualSkills: candidate.manualSkills,
    additionalSkills: candidate.additionalSkills,
    experienceValidation,
    educationValidation,
    scoreCalculation,
    // Realistic backend-shaped payload for the "expandable JSON view" — the
    // actual score_breakdown contract, snake_case, as the API would return it.
    rawJson: {
      candidate_id: candidate.id,
      score_breakdown: {
        items: sb.items.map((r) => ({
          jd_skill_name: r.jdSkillName,
          mandatory: r.mandatory,
          match_type: r.matchType,
          matched_candidate_skill: r.matchedCandidateSkill,
          jd_weight: r.jdWeight,
          candidate_scoring_weight: r.candidateScoringWeight,
          hierarchy_multiplier: r.hierarchyMultiplier,
          skill_contribution: r.skillContribution,
        })),
        no_verified_skills: sb.noVerifiedSkills,
        mandatory_coverage_pct: sb.mandatoryCoveragePct,
        preferred_skill_bonus: sb.preferredSkillBonus,
        score: sb.score,
        status: sb.status,
      },
      experience_validation: {
        required_experience_years: requiredExperience,
        candidate_experience_years: candidate.experience,
        tolerance_years: experienceTolerance,
        result: experienceValidation.result,
      },
      education_validation: {
        required_degree: requiredDegree,
        candidate_degree: candidate.education,
        equivalent_experience_applied: equivalentExperienceApplied,
        result: educationValidation.result,
      },
      score_calculation: {
        skills_score: skillsScore,
        experience_score: experienceScore,
        education_score: educationScore,
        final_deterministic_score: finalScore,
      },
    },
  };
}
