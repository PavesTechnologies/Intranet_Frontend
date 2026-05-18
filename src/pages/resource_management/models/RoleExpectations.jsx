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

// Map getRoleExpectations shape → initialData shape expected by AddDeliverableRoleModal
const buildInitialData = (role) => ({
  roleId: role.dev_role_id,
  roleName: role.role,
  skills: role.skills.map((skillEntry, idx) => ({
    id: Date.now() + idx,
    skillId: "",
    skillName: skillEntry.skill,
    proficiencyId: "",
    proficiencyName: skillEntry.requirements[0]?.proficiency ?? "",
    mandatoryFlag: skillEntry.requirements[0]?.mandatoryFlag ?? false,
    subSkills: [],
  })),
});

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
  }, []);

  // Lazy-load categories and proficiency levels when the edit modal opens
  useEffect(() => {
    if (!editModalOpen) return;
    if (categories.length === 0) {
      getSkillCategoriesTree()
        .then((res) => setCategories(res.data || []))
        .catch(() => {});
    }
    if (proficiencyLevels.length === 0) {
      getProficiencyLevels()
        .then((res) => setProficiencyLevels(res.data.data || []))
        .catch(() => {});
    }
  }, [editModalOpen]);

  const handleEditClick = (role) => {
    setEditingRole(buildInitialData(role));
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
        <h2 className="flex-1 text-sm font-semibold leading-tight text-card-foreground">
          {role.role}
        </h2>
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
  return (
    <div className="py-2.5">
      <div className="mb-1.5 flex items-center gap-1.5">
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">
          {skillEntry.skill}
        </span>
        {skillEntry.subSkill && (
          <span className="text-xs text-muted-foreground">
            &mdash; {skillEntry.subSkill}
          </span>
        )}
      </div>
      <div className="ml-5 flex flex-wrap gap-1.5">
        {skillEntry.requirements.map((req, idx) => (
          <RequirementTag key={idx} requirement={req} />
        ))}
      </div>
    </div>
  );
}

function RequirementTag({ requirement }) {
  const config = PROFICIENCY_CONFIG[requirement.proficiency] ?? {
    label: requirement.proficiency ?? "—",
    className: "border-gray-200 bg-gray-50 text-gray-600",
  };

  return (
    <div className="flex items-center gap-1">
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
          config.className,
        )}
      >
        {config.label}
      </span>
      {requirement.subSkill && (
        <span className="text-[11px] text-muted-foreground">
          ({requirement.subSkill})
        </span>
      )}
      {requirement.mandatoryFlag && (
        <Badge className="rounded-full border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600 hover:bg-red-50">
          Required
        </Badge>
      )}
    </div>
  );
}
