import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, BadgeCheck, FolderGit2, Tags, Briefcase, ChevronDown } from "lucide-react";
import { getResumeMock, getResumeFromParsedData, hasRealResumeData } from "./resumeMock";
import ResumePreview from "./components/ResumePreview";

function AccordionSection({ icon: Icon, title, count, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-slate-200 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
          {Icon && <Icon size={15} className="text-slate-400" />}
          {title}
          {typeof count === "number" && <span className="text-[11px] font-medium text-slate-400">({count})</span>}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}

export default function ResumeTab({ candidate, onExpired }) {
  const resume = hasRealResumeData(candidate) ? getResumeFromParsedData(candidate) : getResumeMock(candidate);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-5 items-start">
      <div className="lg:sticky lg:top-4 space-y-4">
        {resume.file ? (
          <ResumePreview file={resume.file} previewPages={resume.previewPages} onExpired={onExpired} />
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-[12.5px] text-slate-400">
            Resume file preview isn't available yet.
          </div>
        )}

        {/* Fills the space left over below the preview instead of leaving it empty */}
        <div className="bg-white border border-slate-200 rounded-xl px-4">
          <AccordionSection icon={Tags} title="Skills Extracted" count={resume.skillsExtracted.length}>
            <div className="flex flex-wrap gap-1.5">
              {resume.skillsExtracted.map((s) => (
                <Badge key={s} className="bg-slate-100 text-slate-700 border-slate-200 font-medium px-2.5 py-1 text-[11px]">
                  {s}
                </Badge>
              ))}
            </div>
          </AccordionSection>
        </div>
      </div>

      <div className="min-w-0 bg-white border border-slate-200 rounded-xl px-4">
        <AccordionSection icon={Briefcase} title="Experience Extracted" count={resume.experienceExtracted.length}>
          <div className="space-y-4">
            {resume.experienceExtracted.map((exp, i) => (
              <div key={i} className={i !== resume.experienceExtracted.length - 1 ? "pb-4 border-b border-slate-100" : ""}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-semibold text-slate-900">{exp.title}</span>
                  <span className="text-[11px] text-slate-400 shrink-0">{exp.durationLabel}</span>
                </div>
                <div className="text-[11.5px] text-slate-500 mb-1.5">{exp.company}</div>
                <ul className="space-y-1">
                  {exp.highlights.map((h, j) => (
                    <li key={j} className="flex gap-2 text-[11.5px] text-slate-700 leading-relaxed">
                      <span className="mt-[6.5px] w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </AccordionSection>

        <AccordionSection icon={GraduationCap} title="Education Extracted" count={resume.educationExtracted.length}>
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
        </AccordionSection>

        <AccordionSection icon={BadgeCheck} title="Certifications" count={resume.certifications.length}>
          <ul className="text-[12.5px] text-slate-900 space-y-1.5">
            {resume.certifications.map((c) => (
              <li key={c} className="flex items-center gap-1.5">
                <BadgeCheck size={13} className="text-emerald-600 shrink-0" />
                {c}
              </li>
            ))}
          </ul>
        </AccordionSection>

        <AccordionSection icon={FolderGit2} title="Projects" count={resume.projects.length} defaultOpen={resume.projects.length > 0}>
          {resume.projects.length === 0 ? (
            <div className="text-[12px] text-slate-400">Not extracted from this resume yet.</div>
          ) : (
            <div className="space-y-3">
              {resume.projects.map((p) => (
                <div key={p.name}>
                  <div className="text-[12.5px] font-semibold text-slate-900 capitalize">{p.name}</div>
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
        </AccordionSection>
      </div>
    </div>
  );
}
