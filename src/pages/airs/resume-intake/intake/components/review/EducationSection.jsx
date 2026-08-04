import React from "react";
import { GraduationCap, Award, Inbox, Plus, Trash2 } from "lucide-react";
import { Input } from "../../../../../../components/ui/input";

export default function EducationSection({ education, certifications, isEditing, onChange }) {
  const edu = education || [];
  const certs = certifications || [];

  const handleUpdateEdu = (index, key, val) => {
    const updated = [...edu];
    updated[index] = { ...updated[index], [key]: val };
    onChange({ education: updated });
  };

  const handleAddEdu = () => {
    const newEdu = {
      degree: "Degree Name",
      institution: "Institution",
      field: "",
      graduation_year: new Date().getFullYear(),
    };
    onChange({ education: [...edu, newEdu] });
  };

  const handleDeleteEdu = (index) => {
    const updated = edu.filter((_, idx) => idx !== index);
    onChange({ education: updated });
  };

  const handleCertChange = (e) => {
    const arr = e.target.value
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    onChange({ certifications: arr });
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-[13.5px] font-bold text-slate-900 flex items-center gap-2">
          <GraduationCap size={15} className="text-slate-400" /> Education
        </h2>
      </div>
      <div className="p-5">
        {edu.length === 0 && !isEditing ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Inbox size={20} className="text-slate-300 mb-2" />
            <div className="text-[12.5px] text-slate-500">No education history was extracted.</div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              {edu.map((e, i) => (
                <div key={i} className="text-[12.5px] border-b border-slate-100 last:border-0 pb-3 last:pb-0">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-slate-400">EDUCATION #{i + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteEdu(i)}
                          className="text-rose-600 hover:text-rose-800 transition"
                          title="Delete education record"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={e.degree || ""}
                          onChange={(evt) => handleUpdateEdu(i, "degree", evt.target.value)}
                          placeholder="e.g. B.S. or B.Tech"
                          className="h-8 text-xs"
                        />
                        <Input
                          value={e.field || ""}
                          onChange={(evt) => handleUpdateEdu(i, "field", evt.target.value)}
                          placeholder="e.g. Computer Science"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={e.institution || ""}
                          onChange={(evt) => handleUpdateEdu(i, "institution", evt.target.value)}
                          placeholder="Institution Name"
                          className="h-8 text-xs"
                        />
                        <Input
                          type="number"
                          value={e.graduation_year || ""}
                          onChange={(evt) => {
                            const val = evt.target.value === "" ? null : parseInt(evt.target.value);
                            handleUpdateEdu(i, "graduation_year", val);
                          }}
                          placeholder="Graduation Year"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="font-semibold text-slate-900">
                        {e.degree}
                        {e.field ? <span className="text-slate-500 font-normal"> in {e.field}</span> : null}
                      </div>
                      <div className="text-slate-500">
                        {e.institution}
                        {e.graduation_year ? <span> · Class of {e.graduation_year}</span> : null}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            {isEditing && (
              <button
                type="button"
                onClick={handleAddEdu}
                className="w-full py-1.5 border border-dashed border-slate-300 rounded-lg text-xs font-semibold text-blue-600 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition"
              >
                <Plus size={13} /> Add Education
              </button>
            )}
          </div>
        )}

        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
            <Award size={12} /> CERTIFICATIONS
          </div>
          {isEditing ? (
            <div>
              <Input
                value={certs.join(", ")}
                onChange={handleCertChange}
                placeholder="AWS Architect, CKA, PMP (comma separated)"
                className="h-8 text-xs"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">List certifications separated by commas.</span>
            </div>
          ) : certs.length === 0 ? (
            <div className="text-[12px] text-slate-400">No certifications listed.</div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {certs.map((c) => (
                <span key={c} className="px-2.5 py-1 rounded-full text-[11.5px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
