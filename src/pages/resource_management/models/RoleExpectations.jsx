import React, { useEffect, useState } from "react";
import {
  getRoleExpectations,
  getSkillCategoriesTree,
  getProficiencyLevels,
} from "../services/workforceService";
import { Badge } from "@/components/ui/badge";
import Pagination from "@/components/Pagination/pagination";
import AddDeliverableRoleModal from "./AddDeliverableRoleModal";
import { AlertCircle, Briefcase, ChevronRight, Loader2, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const CARDS_PER_PAGE = 6;

const PROFICIENCY_CONFIG = {
  BEGINNER: {
    label: "Beginner",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  INTERMEDIATE: {
    label: "Intermediate",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  ADVANCED: {
    label: "Advanced",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  EXPERT: {
    label: "Expert",
    className: "border-purple-200 bg-purple-50 text-purple-700",
  },
};

// Map getRoleExpectations shape → initialData shape expected by AddDeliverableRoleModal.
// Resolves skill/proficiency names → IDs using the categories tree and proficiency list.
const buildInitialData = (role, categories, proficiencyLevels) => {
  const findProficiencyId = (name) => {
    if (!name) return "";
    const match = proficiencyLevels.find(
      (p) => (p.name || p.proficiencyName)?.toUpperCase() === name.toUpperCase(),
    );
    return match?.id || match?.proficiencyId || "";
  };

  const findProficiencyName = (name) => {
    if (!name) return "";
    const match = proficiencyLevels.find(
      (p) => (p.name || p.proficiencyName)?.toUpperCase() === name.toUpperCase(),
    );
    return match?.name || match?.proficiencyName || name;
  };

  return {
    roleId: role.dev_role_id,
    roleName: role.role,
    skills: role.skills.map((skillEntry, idx) => {
      let skillId = "";
      let subSkillDefs = [];

      for (const cat of categories) {
        const sk = cat.skills?.find(
          (s) => s.name?.toLowerCase() === skillEntry.skill?.toLowerCase(),
        );
        if (sk) {
          skillId = sk.id;
          subSkillDefs = sk.subSkills || [];
          break;
        }
      }

      const validSubSkills =
        skillEntry.subSkills?.filter((s) => s.subSkill !== null) ?? [];

      return {
        id: Date.now() + idx,
        skillId,
        skillName: skillEntry.skill,
        proficiencyId: findProficiencyId(skillEntry.proficiency),
        proficiencyName: findProficiencyName(skillEntry.proficiency),
        mandatoryFlag: skillEntry.mandatoryFlag ?? false,
        subSkills: validSubSkills.map((s, ssIdx) => {
          const subSkillObj = subSkillDefs.find(
            (ss) => ss.name?.toLowerCase() === s.subSkill?.toLowerCase(),
          );
          return {
            id: Date.now() + idx * 1000 + ssIdx,
            subSkillId: subSkillObj?.id || "",
            subSkillName: s.subSkill,
            proficiencyId: findProficiencyId(s.proficiency),
            proficiencyName: findProficiencyName(s.proficiency),
            mandatoryFlag: s.mandatoryFlag ?? false,
          };
        }),
      };
    }),
  };
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RoleExpectations() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [categories, setCategories] = useState([]);
  const [proficiencyLevels, setProficiencyLevels] = useState([]);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await getRoleExpectations();
      if (response?.success) setRoles(response.data);
    } catch {
      setError("Failed to load role expectations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
    getSkillCategoriesTree()
      .then((res) => setCategories(res.data || []))
      .catch(() => {});
    getProficiencyLevels()
      .then((res) => setProficiencyLevels(res.data.data || []))
      .catch(() => {});
  }, []);

  const handleEditClick = (role) => {
    setEditingRole(buildInitialData(role, categories, proficiencyLevels));
    setEditModalOpen(true);
  };

  const handleEditClose = () => {
    setEditModalOpen(false);
    setEditingRole(null);
  };

  const handleEditSuccess = () => {
    handleEditClose();
    fetchRoles();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-destructive">
        <AlertCircle className="h-8 w-8" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  const totalPages = Math.ceil(roles.length / CARDS_PER_PAGE);
  const paginatedRoles = roles.slice(
    (currentPage - 1) * CARDS_PER_PAGE,
    currentPage * CARDS_PER_PAGE,
  );

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">
            Role Expectations
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Skill requirements defined for each developer role
          </p>
        </div>
        <span className="rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {roles.length} {roles.length === 1 ? "role" : "roles"}
        </span>
      </div>

      {roles.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-lg border bg-card">
          <p className="text-sm text-muted-foreground">No role expectations found.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedRoles.map((role) => (
              <RoleCard
                key={role.dev_role_id}
                role={role}
                onEdit={handleEditClick}
                onDelete={(r) => console.log("delete", r)}
              />
            ))}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPrevious={() => setCurrentPage((p) => p - 1)}
            onNext={() => setCurrentPage((p) => p + 1)}
          />
        </>
      )}

      <AddDeliverableRoleModal
        open={editModalOpen}
        onClose={handleEditSuccess}
        categories={categories}
        proficiencyLevels={proficiencyLevels}
        initialData={editingRole}
      />
    </div>
  );
}

// ─── Role Card ────────────────────────────────────────────────────────────────

function RoleCard({ role, onEdit, onDelete }) {
  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="flex items-center gap-2.5 border-b px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <Briefcase className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold leading-tight text-card-foreground truncate">
            {role.role}
          </h2>
          {role.category && (
            <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
              {role.category}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit?.(role)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-blue-50 hover:text-blue-600"
            aria-label="Edit role"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete?.(role)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
            aria-label="Delete role"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="divide-y px-4 py-1">
        {role.skills.length === 0 ? (
          <p className="py-3 text-xs text-muted-foreground">No skills defined</p>
        ) : (
          role.skills.map((skillEntry, idx) => (
            <SkillRow key={idx} skillEntry={skillEntry} />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Skill Row ────────────────────────────────────────────────────────────────

function SkillRow({ skillEntry }) {
  const config = PROFICIENCY_CONFIG[skillEntry.proficiency] ?? {
    label: skillEntry.proficiency ?? "—",
    className: "border-gray-200 bg-gray-50 text-gray-600",
  };

  const validSubSkills =
    skillEntry.subSkills?.filter((s) => s.subSkill !== null) ?? [];

  return (
    <div className="py-2.5">
      <div className="mb-1 flex flex-wrap items-center gap-1.5">
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">
          {skillEntry.skill}
        </span>
        {skillEntry.proficiency && (
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
              config.className,
            )}
          >
            {config.label}
          </span>
        )}
        {skillEntry.mandatoryFlag && (
          <Badge className="rounded-full border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600 hover:bg-red-50">
            Required
          </Badge>
        )}
      </div>
      {validSubSkills.length > 0 && (
        <div className="ml-5 flex flex-wrap gap-1.5">
          {validSubSkills.map((s, idx) => (
            <span
              key={idx}
              className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
            >
              {s.subSkill}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
