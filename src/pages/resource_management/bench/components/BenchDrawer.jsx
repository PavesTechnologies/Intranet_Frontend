import React, { useState, useEffect } from "react";
import { Briefcase, CalendarDays, MapPin, ShieldAlert, X, Loader2 } from "lucide-react";
import { getAgingTone, isSkillStale } from "../models/benchModel";
// import { getBenchMatches } from "../services/benchService";

const statCardClassName = "rounded-lg border border-slate-200 bg-slate-50 px-4 py-3";

const BenchDrawer = ({ open, resource, onClose, onAllocate, onMoveToPool, liveMatches, loadingMatches }) => {
  console.log("Resource from Bench Drawer: ", resource);

  if (!open || !resource) return null;

  const agingTone = getAgingTone(resource.agingDays);

  const matchData = (liveMatches || []).find(m => Number(m.resourceId) === Number(resource.employeeId || resource.resourceId || resource.id));
  const resourceDemands = matchData?.demands || [];

  return (
    <div className="fixed inset-0 z-[120] flex justify-end bg-slate-900/20 backdrop-blur-[1px]">
      <button type="button" className="flex-1 cursor-default" onClick={onClose} aria-label="Close drawer" />
      <div className="flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-gray-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <p className="text-xl font-bold text-[#081534]">{resource.name || "No detail found"}</p>
            <p className="mt-1 text-sm text-slate-500">{resource.role || "No detail found"}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div className="grid grid-cols-2 gap-3">
            <div className={statCardClassName}>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Availability</p>
              <p className="mt-2 text-lg font-black text-slate-900">{resource.allocation}%</p>
            </div>
            <div className={statCardClassName}>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Aging</p>
              <div className="mt-2">
                <span className={`inline-flex rounded-lg border px-2.5 py-1 text-[11px] font-black tracking-tight ${agingTone.className}`}>
                  {agingTone.label}
                </span>
              </div>
            </div>
            <div className={statCardClassName}>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Category</p>
              <p className="mt-2 text-lg font-black text-slate-900">{resource.category}</p>
            </div>
            <div className={statCardClassName}>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Cost Exposure</p>
              <p className={`mt-2 text-lg font-black ${resource.warnings.highCost || resource.warnings.longAging ? "text-rose-600" : "text-slate-900"}`}>
                {resource.costExposure === null ? "Cost unavailable" : `${resource.costExposure.toLocaleString()}`}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Skill Inventory</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {resource.skills.length === 0 ? (
                <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">No skills available</span>
              ) : (
                resource.skills.map((skill) => {
                  const stale = isSkillStale(resource.skillLastUsed?.[skill]);
                  return (
                    <span
                      key={`${resource.id}-${skill}`}
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${stale
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                        }`}
                    >
                      {skill} | {resource.proficiency?.[skill] || "Beginner"}
                    </span>
                  );
                })
              )}
            </div>
            {resource.missingSkills.length > 0 ? (
              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Skill Gaps</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {resource.missingSkills.map((skill) => (
                    <span key={skill} className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      Missing: {skill}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Aging And Cost Details</p>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                <span>Last allocation date: {resource.lastAllocationDate ?? "Never allocated"}</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-slate-400" />
                <span>Daily cost: {resource.costPerDay === null ? "Cost unavailable" : `${resource.costPerDay.toLocaleString()} / day`}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span>{resource.location} | {resource.experience} years experience</span>
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
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Demand Matching</p>
            <div className="mt-3 space-y-3">
              {loadingMatches ? (
                <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-widest italic">Calculating Scores...</p>
                </div>
              ) : resourceDemands.length === 0 ? (
                <div className="py-4 text-center text-[11px] font-medium text-slate-400 italic bg-slate-50 rounded-lg">
                  No high-confidence matches found
                </div>
              ) : (
                resourceDemands.map((match, idx) => (
                  <div key={match.demandId || idx} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-900 text-[13px] uppercase tracking-tight">{match.demandName || "Unnamed Demand"}</p>
                        <div className="flex items-center gap-2">
                          <p className={`text-[10px] font-bold uppercase tracking-widest ${matchData?.availability === 'Available' ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {matchData?.availability || "Check Status"}
                          </p>
                          <div className="h-1 w-1 rounded-full bg-slate-300" />
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {match.matchScore === 100 ? "Perfect Fit" : "Potential Fit"}
                          </p>
                        </div>
                      </div>
                      <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${(match.matchScore || 0) >= 70
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : (match.matchScore || 0) >= 40
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-slate-200 bg-slate-100 text-slate-700"
                        }`}>
                        {match.matchScore || 0}% match
                      </span>
                    </div>
                    {match.matchedSkills && match.matchedSkills.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">Skills:</span>
                        {match.matchedSkills.map((sk, sidx) => (
                          <span key={sidx} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {sk}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="border-t border-gray-200 bg-white px-5 py-4">
          <div className="flex gap-2">
            <button type="button" onClick={() => onAllocate(resource)} className="h-10 flex-1 rounded-md bg-[#081534] px-4 text-sm font-medium text-white transition-colors hover:bg-[#10214f]">
              Allocate
            </button>
            {!resource.poolType ? (
              <button type="button" onClick={() => onMoveToPool(resource)} className="h-10 flex-1 rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 hover:text-[#081534]">
                Move To Pool
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BenchDrawer;
