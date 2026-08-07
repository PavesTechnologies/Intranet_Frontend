import React from "react";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, BadgeCheck, FolderGit2 } from "lucide-react";
import { getResumeMock, getResumeFromParsedData, hasRealResumeData } from "./resumeMock";
import ResumePreview from "./components/ResumePreview";

function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-slate-900 mb-3">
        {Icon && <Icon size={14} className="text-slate-400" />}
        {title}
      </div>
      {children}
    </div>
  );
}

export default function ResumeTab({ candidate, onExpired }) {
  const resume = hasRealResumeData(candidate) ? getResumeFromParsedData(candidate) : getResumeMock(candidate);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,340px)_1fr] gap-4">
      {resume.file ? (
        <ResumePreview file={resume.file} previewPages={resume.previewPages} onExpired={onExpired} />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-[12.5px] text-slate-400 h-fit">
          Resume file preview isn't available yet.
        </div>
      )}

      <div className="space-y-4 min-w-0">
        <SectionCard title="Skills extracted">
          <div className="flex flex-wrap gap-1.5">
            {resume.skillsExtracted.map((s) => (
              <Badge key={s} className="bg-slate-100 text-slate-700 border-slate-200 font-medium px-2.5 py-1 text-[11px]">
                {s}
              </Badge>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Experience extracted">
          <div className="space-y-3">
            {resume.experienceExtracted.map((exp, i) => (
              <div key={i} className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-semibold text-slate-900">{exp.title}</span>
                  <span className="text-[11px] text-slate-400 shrink-0">{exp.durationLabel}</span>
                </div>
                <div className="text-[11.5px] text-slate-500 mb-1.5">{exp.company}</div>
                <ul className="text-[11.5px] text-slate-700 list-disc pl-4 space-y-0.5">
                  {exp.highlights.map((h, j) => (
                    <li key={j}>{h}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </SectionCard>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SectionCard icon={GraduationCap} title="Education extracted">
            <div className="space-y-2">
              {resume.educationExtracted.map((e, i) => (
                <div key={i} className="text-[12.5px] text-slate-900">
                  <div className="font-semibold">{e.degree}</div>
                  <div className="text-[11.5px] text-slate-500">
                    {e.institution} · {e.year}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard icon={BadgeCheck} title="Certifications">
            <ul className="text-[12.5px] text-slate-900 space-y-1">
              {resume.certifications.map((c) => (
                <li key={c} className="flex items-center gap-1.5">
                  <BadgeCheck size={13} className="text-emerald-600 shrink-0" />
                  {c}
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        <SectionCard icon={FolderGit2} title="Projects">
          {resume.projects.length === 0 ? (
            <div className="text-[12px] text-slate-400">Not extracted from this resume yet.</div>
          ) : (
            <div className="space-y-2.5">
              {resume.projects.map((p) => (
                <div key={p.name} className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <div className="text-[12.5px] font-semibold text-slate-900">{p.name}</div>
                  <p className="text-[11.5px] text-slate-600 mt-0.5">{p.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {p.tech.map((t) => (
                      <Badge key={t} className="bg-indigo-50 text-indigo-700 border-indigo-100 font-medium px-2 py-0.5 text-[10.5px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
