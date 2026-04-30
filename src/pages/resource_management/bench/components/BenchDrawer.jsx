import React, { useState, useEffect } from "react";
import { Briefcase, CalendarDays, MapPin, ShieldAlert, X, Loader2 } from "lucide-react";
import { getAgingTone, isSkillStale } from "../models/benchModel";
// import { getBenchMatches } from "../services/benchService";

const statCardClassName = "relative group overflow-hidden rounded-2xl border border-white/40 bg-gradient-to-br from-white/60 to-white/30 px-5 py-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-0.5";
const cardIconWrapperClass = "absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br opacity-20 transition-all group-hover:scale-110";

const BenchDrawer = ({ open, resource, onClose, onAllocate, onMoveToPool, liveMatches, loadingMatches }) => {
  console.log("Resource from Bench Drawer: ", resource);

  if (!open || !resource) return null;

  const agingTone = getAgingTone(resource.agingDays);

  const matchData = (liveMatches || []).find(m => Number(m.resourceId) === Number(resource.employeeId || resource.resourceId || resource.id));
  const resourceDemands = matchData?.demands || [];

  return (
    <div className="fixed inset-0 z-[120] flex justify-end bg-slate-900/40 backdrop-blur-sm transition-all duration-300">
      <button type="button" className="flex-1 cursor-default" onClick={onClose} aria-label="Close drawer" />
      <div className="flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-white/20 bg-slate-50 shadow-2xl animate-in slide-in-from-right duration-500 ease-out">
        
        {/* Header - Glassmorphic Gradient */}
        <div className="relative border-b border-indigo-100 bg-gradient-to-br from-indigo-50/90 via-white/80 to-indigo-50/40 px-6 py-6 backdrop-blur-md">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-200 rounded-full blur-3xl opacity-30 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                {resource.name || "Unknown Resource"}
                {resource.riskLevel === 'HIGH' && <ShieldAlert className="h-5 w-5 text-rose-500" />}
              </h2>
              <div className="mt-2 flex items-center gap-3 text-sm font-medium text-indigo-900/60">
                <span className="flex items-center gap-1"><Briefcase className="h-4 w-4" /> {resource.role || "Consultant"}</span>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {resource.location || "Remote"}</span>
              </div>
            </div>
            <button type="button" onClick={onClose} className="rounded-xl p-2.5 text-slate-500 bg-white shadow-sm border border-slate-100 transition-all hover:bg-slate-50 hover:text-slate-800 hover:scale-105 active:scale-95">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6 bg-slate-50/50 no-scrollbar">
          {/* Quick KPI Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className={statCardClassName}>
              <div className={`${cardIconWrapperClass} from-blue-400 to-indigo-500`} />
              <p className="relative z-10 text-[10px] font-bold uppercase tracking-widest text-slate-500">Utilization</p>
              <p className="relative z-10 mt-2 text-3xl font-black text-slate-900 tracking-tighter">{resource.allocation}<span className="text-lg text-slate-400 font-bold ml-0.5">%</span></p>
            </div>
            <div className={statCardClassName}>
              <div className={`${cardIconWrapperClass} from-rose-400 to-orange-500`} />
              <p className="relative z-10 text-[10px] font-bold uppercase tracking-widest text-slate-500">Bench Aging</p>
              <div className="relative z-10 mt-3 flex items-center">
                <span className={`inline-flex rounded-xl border px-3 py-1.5 text-[11px] font-bold tracking-widest uppercase shadow-sm ${agingTone.className}`}>
                  {agingTone.label}
                </span>
              </div>
            </div>
            <div className={statCardClassName}>
              <div className={`${cardIconWrapperClass} from-emerald-400 to-teal-500`} />
              <p className="relative z-10 text-[10px] font-bold uppercase tracking-widest text-slate-500">Current Category</p>
              <p className="relative z-10 mt-2 text-xl font-black text-slate-900 tracking-tight leading-tight">{resource.category || "Unassigned"}</p>
            </div>
            <div className={statCardClassName}>
              <div className={`${cardIconWrapperClass} from-amber-400 to-yellow-500`} />
              <p className="relative z-10 text-[10px] font-bold uppercase tracking-widest text-slate-500">Gross Exposure</p>
              <p className={`relative z-10 mt-2 text-2xl font-black tracking-tight ${resource.warnings?.highCost || resource.warnings?.longAging ? "text-rose-600" : "text-slate-900"}`}>
                {resource.costExposure === null ? "—" : `₹${resource.costExposure.toLocaleString()}`}
              </p>
            </div>
          </div>

          {/* Skill Inventory Section */}
          <div className="rounded-2xl border border-white bg-white/70 p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] backdrop-blur-sm">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> Skill & Capability Profile
            </h3>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {resource.skills?.length === 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-1.5 text-[11px] font-bold text-amber-700 backdrop-blur">
                  <ShieldAlert className="h-3 w-3" /> No proven capabilities
                </span>
              ) : (
                resource.skills?.map((skill) => {
                  const stale = isSkillStale(resource.skillLastUsed?.[skill]);
                  return (
                    <span
                      key={`${resource.id}-${skill}`}
                      className={`inline-flex items-center rounded-xl border px-3 py-1.5 text-[11px] font-bold shadow-sm transition-all hover:scale-105 ${stale
                        ? "border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700"
                        : "border-slate-200 bg-gradient-to-r from-white to-slate-50 text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
                        }`}
                    >
                      {skill} <span className="mx-1.5 text-slate-300">|</span> <span className="opacity-70">{resource.proficiency?.[skill] || "Beginner"}</span>
                    </span>
                  );
                })
              )}
            </div>
            
            {resource.missingSkills?.length > 0 && (
              <div className="mt-5 rounded-xl bg-orange-50/50 border border-orange-100 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600 flex items-center gap-1.5">
                  <ShieldAlert className="h-3 w-3" /> Identified Skill Gaps
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {resource.missingSkills.map((skill) => (
                    <span key={skill} className="inline-flex rounded-lg border border-orange-200 bg-white px-2.5 py-1 text-[10px] font-bold text-orange-700 tracking-tight shadow-sm">
                      {skill} Required
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Administrative Insights */}
          <div className="rounded-2xl border border-white bg-white/70 p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] backdrop-blur-sm">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-rose-400" /> Operational Insights
            </h3>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Last Active</p>
                  <p className="text-[12px] font-semibold text-slate-800 mt-0.5">{resource.lastAllocationDate ?? "Never allocated"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
                <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Burn Rate (Per Day)</p>
                  <p className="text-[12px] font-semibold text-slate-800 mt-0.5">{resource.costPerDay === null ? "Unavailable" : `₹${resource.costPerDay.toLocaleString()}`}</p>
                </div>
              </div>
            </div>
          </div>

          {/* <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Last Project</p>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-slate-400" />
                <span>{resource.lastProject?.name || "-"} | {resource.lastProject?.client || "-"}</span>
              </div>
              <p>Ended on: {resource.lastProject?.endDate || "-"}</p>
              <p>Transition reason: {resource.transitionReason || resource.lastProject?.reason || "-"}</p>
            </div>
          </div> */}

          {/* DEMAND MATCHING SECTION */}
          <div className="rounded-2xl border border-white bg-white/70 p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] backdrop-blur-sm relative overflow-hidden">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-100 blur-3xl opacity-50 pointer-events-none" />
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2 relative z-10">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Demand Matrix
            </h3>
            <div className="mt-4 space-y-3 relative z-10">
              {loadingMatches ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full border-2 border-indigo-200 animate-ping opacity-20"></div>
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                  </div>
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-widest">Running ML Matrix...</p>
                </div>
              ) : resourceDemands.length === 0 ? (
                <div className="py-6 text-center text-[12px] font-medium text-slate-400 border border-dashed border-slate-200 bg-white/50 rounded-xl">
                  No high-confidence pipeline opportunities identified
                </div>
              ) : (
                resourceDemands.map((match, idx) => (
                  <button
                    key={match.demandId || idx}
                    type="button"
                    onClick={() => onAllocate(resource, match)}
                    className="w-full text-left group flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-indigo-300 active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between w-full">
                      <div className="pr-4">
                        <p className="font-bold text-slate-800 text-[14px] leading-tight group-hover:text-indigo-600 transition-colors">
                          {match.demandName || "Strategic Project Requirement"}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${matchData?.availability === 'Available' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {matchData?.availability || "Availability TBD"}
                          </span>
                          <span className="text-[11px] font-medium text-slate-400">
                            {match.demandId ? `ID: ${match.demandId.toString().slice(-6)}` : "Internal Demand"}
                          </span>
                        </div>
                      </div>
                      
                      <div className="shrink-0 flex flex-col items-end">
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${(match.matchScore || 0) >= 70 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : (match.matchScore || 0) >= 40 ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                          <span className="text-[14px] font-black">{match.matchScore || 0}%</span>
                          <span className="text-[9px] font-bold uppercase tracking-widest opacity-80">Match</span>
                        </div>
                      </div>
                    </div>

                    {match.matchedSkills && match.matchedSkills.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 w-full">
                        <span className="text-[10px] font-semibold text-slate-400 mr-1">Overlapping Skills:</span>
                        {match.matchedSkills.slice(0, 4).map((sk, sidx) => (
                          <span key={sidx} className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                            {sk}
                          </span>
                        ))}
                        {match.matchedSkills.length > 4 && (
                          <span className="text-[10px] font-medium text-slate-400">+{match.matchedSkills.length - 4} more</span>
                        )}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-200 bg-white px-6 py-5 shadow-[0_-10px_20px_rgb(0,0,0,0.02)] relative z-20">
          <div className="flex gap-3">
            <button type="button" onClick={() => onAllocate(resource, null)} className="h-12 flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 text-[13px] font-bold text-white shadow-md shadow-indigo-500/20 transition-all hover:from-indigo-700 hover:to-indigo-600 hover:shadow-lg focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 active:scale-[0.98]">
              ALLOCATE RESOURCE
            </button>
            {!resource.poolType && (
              <button type="button" onClick={() => onMoveToPool(resource)} className="h-12 flex-1 rounded-xl border border-slate-200 bg-white px-6 text-[13px] font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 border-b-2 hover:border-b-slate-300 focus:ring-2 focus:ring-slate-200 active:scale-[0.98]">
                TRANSFER TO POOL
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BenchDrawer;
