import React from "react";
import { GraduationCap, Award, Inbox } from "lucide-react";

export default function EducationSection({ education, certifications }) {
  const edu = education || [];
  const certs = certifications || [];

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-[13.5px] font-bold text-slate-900 flex items-center gap-2">
          <GraduationCap size={15} className="text-slate-400" /> Education
        </h2>
      </div>
      <div className="p-5">
        {edu.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Inbox size={20} className="text-slate-300 mb-2" />
            <div className="text-[12.5px] text-slate-500">No education history was extracted.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {edu.map((e, i) => (
              <div key={i} className="text-[12.5px]">
                <div className="font-semibold text-slate-900">
                  {e.degree}
                  {e.field ? <span className="text-slate-500 font-normal"> in {e.field}</span> : null}
                </div>
                <div className="text-slate-500">
                  {e.institution}
                  {e.graduation_year ? <span> · Class of {e.graduation_year}</span> : null}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
            <Award size={12} /> CERTIFICATIONS
          </div>
          {certs.length === 0 ? (
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
