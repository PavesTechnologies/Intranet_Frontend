// Realistic Technologies & Skills catalog
const SKILLS_CATALOG = [
  "Java", "Spring Boot", "Python", "FastAPI", "React", "Angular", "NodeJS", 
  "AWS", "Azure", "Docker", "Kubernetes", "Redis", "Kafka", "PostgreSQL", 
  "MongoDB", "TensorFlow", "PyTorch", "TypeScript", "GraphQL", "Sass",
  "HTML5", "CSS3", "Git", "CI/CD", "Terraform", "Jenkins", "SQL Server"
];

const JURISDICTIONS = ["USA", "EU", "India", "UK", "Global"];
const EXPERIENCE_LEVELS = ["1-3 years", "3-5 years", "5-8 years", "8+ years"];
const EDUCATION_LEVELS = ["Bachelor's Degree", "Master's Degree", "PhD", "Associate Degree"];
const SOURCES = ["Manual", "PDF Upload", "DOCX Upload"];
const STATUSES = ["Draft", "Pending Review", "Parsing", "Ready", "Closed"];
const CREATORS = ["Sarah Connor", "John Doe", "Alex Mercer", "Diana Prince", "Bruce Wayne"];

const MAPPED_CANONICALS = {
  "Spring Boot": "Spring Framework",
  "React": "ReactJS",
  "FastAPI": "FastAPI (Python)",
  "Kubernetes": "K8s Container Orchestration",
  "PostgreSQL": "Postgres SQL Database",
  "PyTorch": "PyTorch ML Framework",
  "TensorFlow": "TensorFlow DL Framework"
};

// Generates a mock raw text for a job description
function generateRawText(title, skills, exp, edu, jurisdiction) {
  return `### Job Title: ${title}
### Location: ${jurisdiction} (Remote / Hybrid)
### Experience Required: ${exp}
### Education: ${edu}

#### About the Role
We are seeking a talented and motivated ${title} to join our growing enterprise team. You will be responsible for building scalable, high-performance applications and cooperating with cross-functional product teams.

#### Key Responsibilities
- Architect, build, and maintain efficient, reusable, and reliable components and services.
- Optimize application performance for maximum speed and scalability.
- Work closely with designers, product managers, and developers to deliver premium quality features.
- Participate in code reviews, testing, and continuous integration/deployment cycles.

#### Required Technical Skills
${skills.map(s => `- Proficient in **${s}** and related software ecosystems.`).join("\n")}

#### Qualifications & Soft Skills
- Effective communication and collaborative problem-solving skills.
- Solid understanding of software development life cycle (SDLC) best practices.
- Strong analytical and debugging capabilities.`;
}

// Generate skills mapping objects
function generateSkillsList(selectedSkills) {
  return selectedSkills.map((skill, index) => {
    const isMandatory = index < 3; // First 3 skills are mandatory
    const isVerified = Math.random() > 0.3; // 70% verified
    const weight = Math.floor(Math.random() * 30) + 10; // 10% to 40%
    const confidence = Math.floor(Math.random() * 30) + 70; // 70% to 100%
    const mappedTo = MAPPED_CANONICALS[skill] || skill;
    
    // Mapping types
    let mappingType = "Alias";
    if (Math.random() > 0.8) mappingType = "Unknown";
    else if (Math.random() > 0.5) mappingType = "Vector";
    else if (Math.random() > 0.3) mappingType = "Fuzzy";

    return {
      name: skill,
      mandatory: isMandatory,
      verified: isVerified,
      weight,
      confidence,
      mappedTo,
      mappingType
    };
  });
}

function generateHistory(title, skills, exp, edu, jurisdiction, currentVersion) {
  const history = [];
  for (let v = 1; v < currentVersion; v++) {
    const olderSkills = skills.slice(0, skills.length - (currentVersion - v));
    const olderRawText = generateRawText(title, olderSkills, exp, edu, jurisdiction) + `\n\n*(Note: This is Version ${v} raw text)*`;
    history.push({
      version: v,
      title: `${title} (v${v})`,
      updatedDate: `2026-0${v}-15`,
      updatedBy: CREATORS[v % CREATORS.length],
      changesSummary: `Updated version ${v}: Initial draft and added baseline skills list.`,
      experience: exp,
      education: edu,
      jurisdiction,
      rawText: olderRawText,
      skills: generateSkillsList(olderSkills)
    });
  }
  return history;
}

// Generate the 100 Job Descriptions
const generateJDs = () => {
  const jds = [];
  const roles = [
    { title: "Senior React Engineer", skills: ["React", "TypeScript", "NodeJS", "Sass", "Git"] },
    { title: "Java Spring Boot Developer", skills: ["Java", "Spring Boot", "PostgreSQL", "Docker", "CI/CD"] },
    { title: "Python Backend Developer", skills: ["Python", "FastAPI", "Redis", "Docker", "PostgreSQL"] },
    { title: "Machine Learning Scientist", skills: ["Python", "PyTorch", "TensorFlow", "FastAPI", "Kubernetes"] },
    { title: "DevOps & Cloud Specialist", skills: ["AWS", "Kubernetes", "Docker", "Terraform", "Jenkins"] },
    { title: "Angular Frontend Developer", skills: ["Angular", "TypeScript", "GraphQL", "HTML5", "CSS3"] },
    { title: "Data Integration Engineer", skills: ["Kafka", "PostgreSQL", "Redis", "NodeJS", "Docker"] },
    { title: "Full Stack Software Architect", skills: ["Java", "React", "AWS", "Docker", "PostgreSQL"] },
    { title: "Senior Database Administrator", skills: ["PostgreSQL", "Redis", "SQL Server", "Linux", "Docker"] },
    { title: "Cloud Native Engineer", skills: ["Azure", "Kubernetes", "Docker", "CI/CD", "TypeScript"] }
  ];

  for (let i = 1; i <= 100; i++) {
    const roleTemplate = roles[(i - 1) % roles.length];
    const jurisdiction = JURISDICTIONS[i % JURISDICTIONS.length];
    const experience = EXPERIENCE_LEVELS[i % EXPERIENCE_LEVELS.length];
    const education = EDUCATION_LEVELS[i % EDUCATION_LEVELS.length];
    const source = SOURCES[i % SOURCES.length];
    
    // Distribute statuses realistically
    let status = "Ready";
    if (i <= 5) status = "Draft";
    else if (i > 5 && i <= 15) status = "Pending Review";
    else if (i > 15 && i <= 20) status = "Parsing";
    else if (i > 20 && i <= 85) status = "Ready";
    else status = "Closed";

    // Random version number 1-3
    const version = (i % 3) + 1;
    const skillsList = generateSkillsList(roleTemplate.skills);
    const title = `${roleTemplate.title} ${i > 10 ? `(Tier ${(i % 3) + 1})` : ""}`;
    const rawText = generateRawText(title, roleTemplate.skills, experience, education, jurisdiction);
    const creator = CREATORS[i % CREATORS.length];
    
    const confidence = status === "Parsing" ? 0 : Math.floor(Math.random() * 15) + 82; // 82% to 97%
    const campaignCount = status === "Closed" ? 0 : (i % 4);
    
    const dateOffset = i * 2; // Create a staggered timeline
    const createdDate = new Date(2026, 0, 1 + dateOffset).toISOString().split('T')[0];
    const updatedDate = new Date(2026, 4, 1 + (dateOffset / 2)).toISOString().split('T')[0];

    jds.push({
      id: `JD-${String(i).padStart(4, '0')}`,
      title,
      version,
      status,
      source,
      jurisdiction,
      experience,
      education,
      skills: skillsList,
      mandatorySkills: skillsList.filter(s => s.mandatory).map(s => s.name),
      campaignCount,
      createdBy: creator,
      createdDate,
      updatedDate,
      parseStatus: status === "Parsing" ? "In_Progress" : (i === 13 ? "Failed" : "Success"), // Create a deliberate parser fail
      confidence,
      rawText,
      history: generateHistory(title, roleTemplate.skills, experience, education, jurisdiction, version),
      auditTimeline: [
        { event: "Created", date: createdDate, user: creator, description: `Initial JD draft uploaded via ${source}.` },
        { event: "Parsed", date: createdDate, user: "AIRS Parser Engine", description: `Automatic text parsing completed with ${confidence}% confidence.` },
        { event: "Skills Updated", date: updatedDate, user: creator, description: `Skills taxonomy verified and updated.` },
        { event: "Version Created", date: updatedDate, user: creator, description: `Version ${version} published for campaign readiness.` },
        ...(campaignCount > 0 ? [{ event: "Campaign Linked", date: updatedDate, user: "Talent Recruiter", description: `Campaign initiated and linked to this active JD.` }] : [])
      ]
    });
  }
  return jds;
};

export const MOCK_JDS = generateJDs();

// Helper functions for mock CRUD in local state
export const getJdById = (id) => MOCK_JDS.find(jd => jd.id === id);

export const MOCK_CAMPAIGNS = [
  { id: "CMP-001", name: "High-Priority React Core Team", status: "Active", candidates: 14, createdDate: "2026-05-10" },
  { id: "CMP-002", name: "Enterprise Java Platform Expansion", status: "Active", candidates: 28, createdDate: "2026-05-12" },
  { id: "CMP-003", name: "FastAPI Backend Migration", status: "Paused", candidates: 9, createdDate: "2026-05-18" },
  { id: "CMP-004", name: "Global Cloud Native DevOps Drive", status: "Active", candidates: 42, createdDate: "2026-05-22" },
  { id: "CMP-005", name: "ML PyTorch Research Pipeline", status: "Draft", candidates: 0, createdDate: "2026-06-01" }
];
