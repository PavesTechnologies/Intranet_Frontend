import React from "react";

const SubSkillSelectionModal = ({
  open,
  onClose,
  subSkills = [],
  proficiencyLevels = [],
  expectations = [],
  setExpectations,
}) => {
  if (!open) return null;

  const toggleSubSkill = (sub) => {
    const exists = expectations.find(
      (e) => e.subSkillId === sub.id,
    );

    if (exists) {
      setExpectations(
        expectations.filter((e) => e.subSkillId !== sub.id),
      );
    } else {
      setExpectations([
        ...expectations,
        {
          subSkillId: sub.id,
          subSkillName: sub.name,
          proficiencyId: "",
          proficiencyName: "",
          mandatoryFlag: false,
        },
      ]);
    }
  };

  const updateExpectation = (id, updates) => {
    setExpectations(
      expectations.map((e) =>
        e.subSkillId === id ? { ...e, ...updates } : e,
      ),
    );
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-lg rounded-lg shadow-lg">
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-3 border-b">
          <h3 className="text-sm font-semibold">Select Sub Skills</h3>
          <button onClick={onClose} className="text-lg">
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3 max-h-[400px] overflow-y-auto">
          {subSkills.map((sub) => {
            const selected = expectations.find(
              (e) => e.subSkillId === sub.id,
            );

            return (
              <div
                key={sub.id}
                className="grid grid-cols-[30px_1fr_120px_160px] items-center gap-2 border-b pb-2"
              >
                {/* Select SubSkill */}
                <input
                  type="checkbox"
                  checked={!!selected}
                  onChange={() => toggleSubSkill(sub)}
                />

                {/* Name */}
                <span className="text-sm">{sub.name}</span>

                {/* Mandatory */}
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    disabled={!selected}
                    checked={selected?.mandatoryFlag || false}
                    onChange={(e) =>
                      updateExpectation(sub.id, {
                        mandatoryFlag: e.target.checked,
                      })
                    }
                  />
                  Mandatory
                </label>

                {/* Proficiency */}
                <select
                  disabled={!selected}
                  value={selected?.proficiencyId || ""}
                  onChange={(e) => {
                    const p = proficiencyLevels.find(
                      (x) => x.proficiencyId === e.target.value,
                    );
                    updateExpectation(sub.id, {
                      proficiencyId: p?.proficiencyId || "",
                      proficiencyName: p?.proficiencyName || "",
                    });
                  }}
                  className="border rounded h-8 text-xs px-2 disabled:bg-gray-100"
                >
                  <option value="">Select Proficiency</option>
                  {proficiencyLevels.map((p) => (
                    <option
                      key={p.proficiencyId}
                      value={p.proficiencyId}
                    >
                      {p.proficiencyName}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-3 border-t bg-gray-50">
          <button onClick={onClose} className="text-xs text-gray-500">
            Cancel
          </button>
          <button
            onClick={onClose}
            className="bg-[#263383] text-white px-4 py-1.5 rounded text-xs"
          >
            Save Sub Skills
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubSkillSelectionModal;
