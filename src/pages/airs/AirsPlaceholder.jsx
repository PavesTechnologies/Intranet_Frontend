import React from "react";
import { useLocation } from "react-router-dom";
import {
  Sparkles,
  Search,
  Briefcase,
  Users,
  Database,
  BarChart3,
  Settings,
  ArrowRight,
  TrendingUp,
  MailWarning
} from "lucide-react";

export default function AirsPlaceholder() {
  const location = useLocation();
  const path = location.pathname;

  // Resolve view info based on route
  const getRouteInfo = () => {
    if (path.includes("campaigns")) {
      return {
        title: "Campaign Management Hub",
        desc: "Monitor active candidate sourcing pipelines, application volume, and matching statuses.",
        icon: <Briefcase className="h-6 w-6 text-blue-600" />,
        stats: [
          { label: "Active Campaigns", value: "8" },
          { label: "Average Match Score", value: "84.2%" },
          { label: "Candidates Screened", value: "148" }
        ],
        mockData: [
          { name: "React Developer Sourcing Sprint", jd: "JD-0001", status: "Active", candidates: 14 },
          { name: "Global Cloud DevOps Engine Lead", jd: "JD-0005", status: "Active", candidates: 42 },
          { name: "FastAPI Backend Migration Team", jd: "JD-0003", status: "Paused", candidates: 9 },
          { name: "Data Analyst ML Pipeline", jd: "JD-0004", status: "Draft", candidates: 0 }
        ]
      };
    } else if (path.includes("resume-intake")) {
      return {
        title: "Resume Intake Portal",
        desc: "Ingest and process candidate files automatically. Supports bulk resume imports, email sync, and REST uploads.",
        icon: <Sparkles className="h-6 w-6 text-emerald-600" />,
        stats: [
          { label: "Total Uploaded", value: "1,245" },
          { label: "Parsed Today", value: "27" },
          { label: "Accuracy Rate", value: "98.5%" }
        ],
        mockData: [
          { name: "John_Doe_React_CV.pdf", size: "235 KB", status: "Parsed", confidence: "97%" },
          { name: "Sarah_Connor_SpringBoot.docx", size: "128 KB", status: "Parsed", confidence: "94%" },
          { name: "Bruce_Wayne_Executive.pdf", size: "480 KB", status: "Flagged", confidence: "65%" },
          { name: "Peter_Parker_Tester.docx", size: "94 KB", status: "Processing", confidence: "In-Progress" }
        ]
      };
    } else if (path.includes("candidates")) {
      return {
        title: "Candidate Screening Center",
        desc: "List of candidates categorized by automated AI skill vector matching coefficients.",
        icon: <Users className="h-6 w-6 text-indigo-600" />,
        stats: [
          { label: "Screened Profiles", value: "860" },
          { label: "Highly Matched (>=85%)", value: "48" },
          { label: "Interviewed", value: "14" }
        ],
        mockData: [
          { name: "Alex Mercer", role: "Java Spring Boot Developer", score: "94%", matchedSkills: 5 },
          { name: "Diana Prince", role: "Senior React Engineer", score: "91%", matchedSkills: 4 },
          { name: "Arthur Curry", role: "Python Backend Developer", score: "86%", matchedSkills: 4 },
          { name: "Barry Allen", role: "DevOps specialist", score: "79%", matchedSkills: 3 }
        ]
      };
    } else if (path.includes("talent-pool")) {
      return {
        title: "Enterprise Talent Pool",
        desc: "Manage archived profiles, silver medalists, and proactively query skill matching nodes for future demands.",
        icon: <Database className="h-6 w-6 text-cyan-600" />,
        stats: [
          { label: "Talent Pool Records", value: "12,450" },
          { label: "Available Instantly", value: "450" },
          { label: "Skills Tagged", value: "248" }
        ],
        mockData: [
          { poolName: "Senior Frontend Engineers (React/Vue)", count: 182, updated: "2026-06-25" },
          { poolName: "Cloud Infrastructure Specialist", count: 94, updated: "2026-06-24" },
          { poolName: "Python Machine Learning PhDs", count: 48, updated: "2026-06-20" },
          { poolName: "QA Test Automation Engineers", count: 120, updated: "2026-06-19" }
        ]
      };
    } else if (path.includes("analytics")) {
      return {
        title: "Hiring Funnel Analytics",
        desc: "Monitor sourcing metrics, skill coverage deficiencies, time-to-hire speeds, and model alignment accuracy.",
        icon: <BarChart3 className="h-6 w-6 text-purple-600" />,
        stats: [
          { label: "Overall Sourcing Velocity", value: "+14%" },
          { label: "Hiring Efficiency", value: "92%" },
          { label: "Matching Accuracy Score", value: "96.4%" }
        ],
        mockData: [
          { metric: "Automated Screen Acceptance Rate", value: "32.4%", status: "On Target" },
          { metric: "Average Time to Parse Resume", value: "1.2s", status: "Optimal" },
          { metric: "Sourcing Channel Quality", value: "8.4 / 10", status: "On Target" },
          { metric: "Hiring Team Compliance Audit", value: "100%", status: "Perfect" }
        ]
      };
    } else {
      return {
        title: "AIRS Platform Settings",
        desc: "Configure canonical mappings, customize weights coefficients, manage OCR engines, and check compliance.",
        icon: <Settings className="h-6 w-6 text-slate-600" />,
        stats: [
          { label: "OCR Engine Version", value: "v4.1" },
          { label: "Active Skill Nodes", value: "1,250" },
          { label: "Vector DB Size", value: "4.8 GB" }
        ],
        mockData: [
          { param: "Enable Automatic Skill Mapping", value: "TRUE (Vector Similarity)" },
          { param: "Confidence Score Threshold", value: "75% Minimum Match" },
          { param: "Recruiter Audit Log Duration", value: "90 Days Retention" },
          { param: "Email Parsing Notification Engine", value: "ENABLED" }
        ]
      };
    }
  };

  const info = getRouteInfo();

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
          <div className="p-2 bg-white rounded-lg border border-slate-200">{info.icon}</div>
          {info.title}
        </h1>
        <p className="text-xs text-slate-500 mt-2 max-w-xl">{info.desc}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        {info.stats.map((s, idx) => (
          <div key={idx} className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">{s.label}</span>
            <h3 className="text-2xl font-black text-slate-950 mt-2 flex items-center gap-2">
              {s.value}
              {idx === 0 && <TrendingUp className="h-4 w-4 text-emerald-500" />}
            </h3>
          </div>
        ))}
      </div>

      {/* Mock Records Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/50">
          <h3 className="text-xs font-bold text-slate-900">Active Records Feed</h3>
        </div>
        
        <div className="p-6">
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/20">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase">
                  <th className="px-6 py-3">Parameter / Name</th>
                  <th className="px-6 py-3">Primary Mapping</th>
                  <th className="px-6 py-3 text-center">Metric / Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-slate-700 font-semibold">
                {info.mockData.map((row, idx) => {
                  const keys = Object.keys(row);
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-3.5 font-bold text-slate-900">{row[keys[0]]}</td>
                      <td className="px-6 py-3.5 text-slate-500">{row[keys[1]]}</td>
                      <td className="px-6 py-3.5 text-center">
                        <span className="inline-block bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-100">
                          {row[keys[2]]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
