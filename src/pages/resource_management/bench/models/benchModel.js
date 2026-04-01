import {
  CATEGORY_OPTIONS,
  DEMAND_PROFILES,
  EXCLUDE_SHADOW_FROM_BENCH,
} from "../constants/benchConstants";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const calculateAgingDays = (lastAllocationDate) => {
  const date = toDate(lastAllocationDate);
  if (!date) return 0;
  const diff = Math.floor((Date.now() - date.getTime()) / DAY_IN_MS);
  return diff > 0 ? diff : 0;
};

export const getAgingTone = (agingDays) => {
  if (agingDays <= 15) {
    return {
      label: `${agingDays} days`,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }
  if (agingDays <= 30) {
    return {
      label: `${agingDays} days`,
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }
  return {
    label: `${agingDays} days`,
    className: "border-rose-200 bg-rose-50 text-rose-700",
  };
};

export const isSkillStale = (lastUsed) => {
  const date = toDate(lastUsed);
  if (!date) return false;
  return calculateAgingDays(lastUsed) > 365;
};

export const buildSkillSummary = (resource) => {
  // Handle backend structure where skillGroups is [{ "Deep Learning": "Expert" }]
  let skills = [];
  if (Array.isArray(resource.skillGroups)) {
    skills = resource.skillGroups.flatMap(group => Object.keys(group));
  } else if (Array.isArray(resource.skills)) {
    skills = resource.skills;
  }

  if (skills.length === 0) return [];

  return skills.slice(0, 3).map((skill) => {
    // Attempt to find proficiency in skillGroups or fallback to resource.proficiency
    let proficiency = "Beginner";
    if (Array.isArray(resource.skillGroups)) {
      const group = resource.skillGroups.find(g => g[skill]);
      if (group) proficiency = group[skill];
    } else {
      proficiency = resource.proficiency?.[skill] || "Beginner";
    }

    return {
      name: skill,
      proficiency,
      stale: isSkillStale(resource.skillLastUsed?.[skill]),
    };
  });
};

export const deriveCategory = (resource) => {
  const availability = Number(resource.availability || 0);
  const skillCount = Array.isArray(resource.skills) ? resource.skills.length : 0;
  const staleSkillCount = Array.isArray(resource.skills)
    ? resource.skills.filter((skill) => isSkillStale(resource.skillLastUsed?.[skill])).length
    : 0;
  const relevance = Number(resource.skillRelevance || 0);

  if (availability <= 20) return "Not Available";
  if (relevance >= 70 && skillCount >= 2 && staleSkillCount < skillCount) return "Ready";
  if (relevance >= 45 && availability >= 45) return "Shadow";
  if (skillCount === 0 || staleSkillCount === skillCount) return "Training";
  return "Training";
};

export const isBenchEligible = (resource) => {
  if (!resource) return false;
  // Trust the source indicator first
  if (resource._source === "bench") return true; 
  
  // Fallback: If not explicit pool, and allocation is 0, consider bench
  const hasAllocation = Number(resource.allocation || resource.allocationPercentage || 0) > 0;
  return !resource.poolType && !hasAllocation;
};

export const isPoolResource = (resource) => {
  if (!resource) return false;
  if (resource._source === "pool") return true;
  return Boolean(resource.poolType);
};

export const normalizeBenchResource = (resource) => {
  // Resolve naming using the provided backend schema: employeeId, resourceName, designation
  const name = resource.resourceName || resource.name || "No detail found";
  const role = resource.designation || resource.roleName || resource.role || "No detail found";
  const location = resource.locationName || resource.baseLocation || resource.location || "No detail found";
  const rawAvail = Number.isFinite(Number(resource.availability)) 
    ? Number(resource.availability) 
    : (Number.isFinite(Number(resource.availabilityPercentage)) ? Number(resource.availabilityPercentage) : null);
  
  // If explicitly 0 and on bench, it's likely utilization, so treat as 100% available for staffing
  const availability = (rawAvail === null || (rawAvail === 0 && isBenchEligible(resource))) ? 100 : rawAvail;
  
  const agingDays = Number.isFinite(Number(resource.aging)) 
    ? Number(resource.aging) 
    : calculateAgingDays(resource.lastAllocationDate || resource.releasedOn);

  // Extract skills and proficiency map for consistent UI access
  let skills = [];
  let proficiencyMap = {};
  
  if (Array.isArray(resource.skillGroups)) {
    resource.skillGroups.forEach(group => {
      Object.entries(group).forEach(([skill, level]) => {
        if (!proficiencyMap[skill]) {
          skills.push(skill);
        }
        proficiencyMap[skill] = level;
      });
    });
  } else if (Array.isArray(resource.skills)) {
    resource.skills.forEach(skill => {
      if (!proficiencyMap[skill]) {
        skills.push(skill);
      }
      proficiencyMap[skill] = resource.proficiency?.[skill] || "Beginner";
    });
  }

  // Use subState or derive from metrics
  const rawCategory = resource.subState || resource.subStateName || resource.category;
  // Normalize category to Title Case for matching CATEGORY_OPTIONS if needed
  const normalizedCategory = typeof rawCategory === 'string'
    ? rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1).toLowerCase()
    : rawCategory;

  const category = (CATEGORY_OPTIONS.includes(normalizedCategory) || CATEGORY_OPTIONS.includes(rawCategory))
    ? (CATEGORY_OPTIONS.includes(normalizedCategory) ? normalizedCategory : rawCategory)
    : (rawCategory || deriveCategory({ ...resource, availability, skills, proficiency: proficiencyMap }));

  const topSkills = skills.slice(0, 3).map((skill) => ({
    name: skill,
    proficiency: proficiencyMap[skill] || "No detail found",
    stale: isSkillStale(resource.skillLastUsed?.[skill]),
  }));

  const costPerDay = Number.isFinite(Number(resource.costPerDay))
    ? Number(resource.costPerDay)
    : null;

  return {
    ...resource,
    name,
    role,
    location,
    availability,
    category,
    agingDays,
    topSkills,
    skills,
    proficiency: proficiencyMap,
    missingSkills: Array.isArray(resource.missingSkills) ? resource.missingSkills : [],
    warnings: {
      missingSkills: topSkills.length === 0,
      missingCost: costPerDay === null,
      longAging: agingDays > 30,
      highCost: costPerDay !== null && costPerDay > 3000,
    },
    costPerDay,
    costExposure: costPerDay !== null ? costPerDay * agingDays : null,
  };
};

export const sanitizeResources = (resources) => {
  const seen = new Set();
  return (Array.isArray(resources) ? resources : []).reduce((acc, item) => {
    if (!item) return acc;
    
    // Resilient ID resolution: employeeId, uuid, or generated
    const rawId = item.employeeId || item.resourceUuid || item.uuid || item.employee_uuid || item.id;
    if (!rawId && !item.resourceName) return acc; // Skip truly empty records
    
    const resolvedId = String(rawId || Math.random().toString(36).substr(2, 9));
    
    if (seen.has(resolvedId)) return acc;
    seen.add(resolvedId);
    
    acc.push(normalizeBenchResource({ ...item, id: resolvedId }));
    return acc;
  }, []);
};

export const filterResources = (resources, search, filters, activeTab) => {
  if (!Array.isArray(resources)) return [];
  
  const query = String(search || "").trim().toLowerCase();
  
  return resources.filter((resource) => {
    if (!resource) return false;

    // 1. Tab Visibility Check
    const isVisible = activeTab === "bench" ? isBenchEligible(resource) : isPoolResource(resource);
    if (!isVisible) return false;

    // 2. Search Matching
    if (query) {
      const searchTarget = [
        resource.name, 
        resource.resourceName,
        resource.role, 
        resource.designation,
        resource.location,
        ...(resource.skills || [])
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      
      if (!searchTarget.includes(query)) return false;
    }

    // 3. Category Filter
    if (filters.category) {
      const cat = String(resource.category || "").toLowerCase();
      const sub = String(resource.subState || "").toLowerCase();
      const filt = String(filters.category).toLowerCase();
      if (cat !== filt && sub !== filt) return false;
    }

    // 4. Location Filter
    if (filters.location && String(resource.location || "").toLowerCase() !== String(filters.location).toLowerCase()) {
      return false;
    }

    if (filters.availability) {
      const availability = Number(resource.availability || 0);
      if (filters.availability === "0-25" && !(availability <= 25)) return false;
      if (filters.availability === "26-50" && !(availability >= 26 && availability <= 50)) return false;
      if (filters.availability === "51-75" && !(availability >= 51 && availability <= 75)) return false;
      if (filters.availability === "76-100" && !(availability >= 76)) return false;
    }

    if (filters.experience) {
      const experience = Number(resource.experience || 0);
      if (filters.experience === "0-3" && !(experience <= 3)) return false;
      if (filters.experience === "4-7" && !(experience >= 4 && experience <= 7)) return false;
      if (filters.experience === "8-12" && !(experience >= 8 && experience <= 12)) return false;
      if (filters.experience === "13+" && !(experience >= 13)) return false;
    }

    if (filters.aging) {
      const agingDays = Number(resource.agingDays || 0);
      if (filters.aging === "0-15" && !(agingDays <= 15)) return false;
      if (filters.aging === "16-30" && !(agingDays >= 16 && agingDays <= 30)) return false;
      if (filters.aging === "31+" && !(agingDays >= 31)) return false;
    }

    if (filters.cost) {
      const cost = Number(resource.costPerDay || 0);
      if (filters.cost === "0-1500" && !(cost <= 1500)) return false;
      if (filters.cost === "1501-3000" && !(cost >= 1501 && cost <= 3000)) return false;
      if (filters.cost === "3001+" && !(cost >= 3001)) return false;
    }

    return true;
  });
};

export const getUniqueValues = (resources, key) =>
  Array.from(new Set(resources.map((item) => item[key]).filter(Boolean))).sort();

export const updateCategory = (resource, nextCategory) =>
  CATEGORY_OPTIONS.includes(nextCategory) ? { ...resource, category: nextCategory } : resource;

export const computeDemandMatches = (resource) => {
  const skillSet = new Set((resource.skills || []).map((skill) => skill.toLowerCase()));
  return DEMAND_PROFILES.map((demand) => {
    const overlap = demand.requiredSkills.filter((skill) => skillSet.has(skill.toLowerCase()));
    return {
      ...demand,
      overlap,
      score: Math.round((overlap.length / demand.requiredSkills.length) * 100),
    };
  }).sort((left, right) => right.score - left.score);
};

export const toCsv = (resources) => {
  const header = [
    "Resource",
    "Role",
    "Category",
    "Availability",
    "AgingDays",
    "CostPerDay",
    "CostExposure",
    "Location",
    "Experience",
    "PoolType",
    "Skills",
  ];
  const rows = resources.map((resource) => [
    resource.name,
    resource.role,
    resource.category,
    resource.availability,
    resource.agingDays,
    resource.costPerDay ?? "Cost unavailable",
    resource.costExposure ?? "Cost unavailable",
    resource.location,
    resource.experience,
    resource.poolType || "",
    (resource.skills || []).join(" | "),
  ]);

  return [header, ...rows]
    .map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
};

export const getBenchMetrics = (resources) => {
  const bench = resources.filter(isBenchEligible);
  const pool = resources.filter(isPoolResource);
  const highRisk = bench.filter((item) => item.warnings.highCost || item.warnings.longAging);
  const ready = bench.filter((item) => item.category === "Ready");

  return [
    {
      label: "Bench Resources",
      value: bench.length,
      helper: "Auto-detected from zero allocation",
      iconClassName: "border-blue-100 bg-blue-50 text-blue-700",
    },
    {
      label: "Ready Now",
      value: ready.length,
      helper: "High relevance and immediate availability",
      iconClassName: "border-emerald-100 bg-emerald-50 text-emerald-700",
    },
    {
      label: "Internal Pool",
      value: pool.length,
      helper: "Excluded from available bench supply",
      iconClassName: "border-indigo-100 bg-indigo-50 text-indigo-700",
    },
    {
      label: "Cost / Risk Watch",
      value: highRisk.length,
      helper: "High daily cost or aging above 30 days",
      iconClassName: "border-rose-100 bg-rose-50 text-rose-700",
    },
  ];
};
