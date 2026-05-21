export const initialSkillTaxonomy = [
  {
    id: "cat-frontend",
    name: "Frontend",
    isActive: true,
    skills: [
      {
        id: "skill-react",
        name: "React",
        isActive: true,
        subSkills: [
          { id: "sub-hooks", name: "Hooks", isActive: true },
          { id: "sub-redux", name: "Redux", isActive: true },
          { id: "sub-zustand", name: "Zustand", isActive: true },
        ],
      },
      {
        id: "skill-angular",
        name: "Angular",
        isActive: true,
        subSkills: [{ id: "sub-rxjs", name: "RxJS", isActive: true }],
      },
      {
        id: "skill-vue",
        name: "Vue",
        isActive: false,
        subSkills: [{ id: "sub-pinia", name: "Pinia", isActive: true }],
      },
    ],
  },
  {
    id: "cat-backend",
    name: "Backend",
    isActive: true,
    skills: [
      {
        id: "skill-java",
        name: "Java",
        isActive: true,
        subSkills: [
          { id: "sub-spring-boot", name: "Spring Boot", isActive: true },
          { id: "sub-hibernate", name: "Hibernate", isActive: false },
        ],
      },
      {
        id: "skill-node",
        name: "Node.js",
        isActive: true,
        subSkills: [{ id: "sub-express", name: "Express", isActive: true }],
      },
    ],
  },
];

export const modalTabs = [
  { id: "taxonomy", label: "Skill Taxonomy" },
  { id: "upload", label: "Bulk Upload" },
];
