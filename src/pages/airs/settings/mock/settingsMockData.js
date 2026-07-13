// Self-contained mock data for the AIRS Settings module (AI configuration style).

export const DEFAULT_SETTINGS = {
  weights: {
    mandatorySkills: 40,
    semantic: 35,
    experience: 25,
  },
  autoSkillMapping: true,
  confidenceThreshold: 75,
  auditLogRetentionDays: 90,
  emailParsingNotifications: true,
};

export const SYSTEM_INFO = {
  ocrEngineVersion: "v4.1",
  activeSkillNodes: "1,250",
  vectorDbSize: "4.8 GB",
};

export const AUDIT_RETENTION_OPTIONS = [
  { label: "30 days", value: 30 },
  { label: "60 days", value: 60 },
  { label: "90 days", value: 90 },
  { label: "180 days", value: 180 },
  { label: "365 days", value: 365 },
];
