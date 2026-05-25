import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

const StatusBadge = ({ isActive }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${
      isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
    }`}
  >
    {isActive ? "Active" : "Inactive"}
  </span>
);

const DraftPreviewPanel = ({ currentDraft, taxonomy, showOnlyCurrentDraft = false }) => {
  const categoriesToShow = useMemo(() => {
    if (showOnlyCurrentDraft) {
      return currentDraft?.name ? [currentDraft] : [];
    }

    if (!currentDraft?.name) return taxonomy;

    const filtered = taxonomy.filter(
      (category) => category.name.toLowerCase() !== currentDraft.name.toLowerCase(),
    );

    return [currentDraft, ...filtered];
  }, [currentDraft, showOnlyCurrentDraft, taxonomy]);

  const [expandedCategories, setExpandedCategories] = useState({});

  useEffect(() => {
    setExpandedCategories((current) => {
      const next = {};
      categoriesToShow.forEach((category, index) => {
        next[category.id] = current[category.id] ?? index === 0;
      });
      return next;
    });
  }, [categoriesToShow]);

  const toggleCategory = (categoryId) => {
    setExpandedCategories((current) => ({
      ...current,
      [categoryId]: !current[categoryId],
    }));
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-900">Draft Summary</h3>
        <p className="mt-1 text-xs text-slate-500">
          Click a category to expand its skills and subskills with active status.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {categoriesToShow.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
            No taxonomy drafted yet
          </div>
        ) : (
          <div className="space-y-3">
            {categoriesToShow.map((category, categoryIndex) => {
              const isExpanded = expandedCategories[category.id];
              const isCurrentDraft = categoryIndex === 0 && currentDraft?.name;

              return (
                <div
                  key={category.id}
                  className={`overflow-hidden rounded-2xl border ${
                    isCurrentDraft ? "border-indigo-200 bg-indigo-50/40" : "border-slate-200 bg-slate-50/70"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/60"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="text-slate-400">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900">{category.name}</p>
                          {isCurrentDraft ? (
                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                              Current Draft
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {category.skills?.length || 0} skills
                        </p>
                      </div>
                    </div>
                    <StatusBadge isActive={category.isActive} />
                  </button>

                  {isExpanded ? (
                    <div className="space-y-3 border-t border-slate-200 bg-white px-4 py-4">
                      {category.skills?.length ? (
                        category.skills.map((skill) => (
                          <div key={skill.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-slate-800">{skill.name}</p>
                              <StatusBadge isActive={skill.isActive} />
                            </div>

                            {skill.subSkills?.length ? (
                              <div className="mt-3 space-y-2 border-l-2 border-slate-200 pl-3">
                                {skill.subSkills.map((subSkill) => (
                                  <div
                                    key={subSkill.id}
                                    className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2"
                                  >
                                    <p className="text-xs font-medium text-slate-700">{subSkill.name}</p>
                                    <StatusBadge isActive={subSkill.isActive} />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-3 text-xs text-slate-400">No subskills added.</p>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-xs text-slate-400">
                          No skills added.
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DraftPreviewPanel;
