// src/components/ProjectDashboard/ProjectDetailDrawer.jsx
import React, { useEffect, useState } from "react";
import api from "../../api/axiosInstance";
import { showStatusToast } from "../toastfy/toast";
import LoadingSpinner from "../LoadingSpinner";
import DetailRow from "./DetailRow";
import PersonRow from "./PersonRow";
import SectionTitle from "./SectionTitle";

const ProjectDetailDrawer = ({ projectId, onClose, navigate, getStatusStyles, formatDate, formatCurrency, canSeeFinancials }) => {
  const [detail,  setDetail]  = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    const token   = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };
    const base    = window.__APP_CONFIG__.PMS_BASE_URL;

    Promise.all([
      api.get(`${base}/api/projects/${projectId}`,                    { headers }),
      api.get(`${base}/api/projects/${projectId}/members-with-owner`, { headers }),
    ])
      .then(([projRes, membersRes]) => {
        setDetail(projRes.data);
        setMembers(Array.isArray(membersRes.data) ? membersRes.data : []);
      })
      .catch(() => showStatusToast("Failed to load project details.", "error"))
      .finally(() => setLoading(false));
  }, [projectId]);

  const p = detail;

  // look up a member object by numeric ID (covers both id and userId fields)
  const findMember = (id) =>
    id ? members.find((m) => m.id === id || m.userId === id) : null;

  // resolve display name from a member object or a nested person object
  const resolveName = (obj) =>
    obj?.name ?? (obj?.firstName ? `${obj.firstName} ${obj.lastName ?? ""}`.trim() : null);

  // prefer nested objects (full API), fall back to ID-based member lookup
  const pmObj           = p?.projectManager ?? p?.owner ?? p?.projectOwner ?? findMember(p?.ownerId);
  const projectManager  = resolveName(pmObj);
  const pmEmail         = pmObj?.email;

  const rmObj           = p?.resourceManager ?? p?.rm ?? findMember(p?.rmId);
  const resourceManager = resolveName(rmObj);
  const rmEmail         = rmObj?.email;

  const doObj           = p?.deliveryOwner ?? p?.deliveryManager ?? findMember(p?.deliveryOwnerId);
  const deliveryOwner   = resolveName(doObj);
  const doEmail         = doObj?.email;

  const clientName      = p?.client?.clientName ?? p?.clientName ?? p?.client?.name;
  const clientEmail     = p?.client?.email ?? p?.clientEmail;

  // exclude key-role people from the generic team members list
  const keyIds = new Set([
    p?.ownerId, p?.rmId, p?.deliveryOwnerId,
    pmObj?.id, pmObj?.userId,
    rmObj?.id, rmObj?.userId,
    doObj?.id, doObj?.userId,
  ].filter(Boolean));

  const teamMembers = members.filter((m) => !keyIds.has(m.id) && !keyIds.has(m.userId));

  const CloseIcon = () => (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Project Details</h2>
            {p && <p className="text-xs text-slate-400 font-mono mt-0.5">{p.projectKey}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-5"><LoadingSpinner text="Loading details..." /></div>
          ) : !p ? (
            <p className="p-5 text-sm text-slate-400">No data available.</p>
          ) : (
            <div className="divide-y divide-slate-100">

              {/* ── Identity ── */}
              <div className="px-5 py-4 space-y-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">{p.name}</h3>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {p.status && (
                    <span className={`px-2.5 py-0.5 text-[11px] font-bold uppercase rounded-full border ${getStatusStyles(p.status)}`}>
                      {p.status.replace(/_/g, " ")}
                    </span>
                  )}
                  {p.riskLevel && (
                    <span className={`px-2.5 py-0.5 text-[11px] font-bold uppercase rounded-full border ${
                      p.riskLevel === "HIGH"   ? "bg-red-50 text-red-700 border-red-200" :
                      p.riskLevel === "MEDIUM" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                "bg-teal-50 text-teal-700 border-teal-200"}`}>
                      {p.riskLevel} Risk
                    </span>
                  )}
                  {(p.priority ?? p.priorityLevel) && (
                    <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase rounded-full border bg-violet-50 text-violet-700 border-violet-200">
                      {p.priority ?? p.priorityLevel}
                    </span>
                  )}
                </div>
                {p.description && (
                  <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-wrap">{p.description}</p>
                )}
              </div>

              {/* ── Timeline & Delivery ── */}
              <div className="px-5 py-4">
                <SectionTitle>Timeline & Delivery</SectionTitle>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-2">
                  <DetailRow label="Start Date"   value={formatDate(p.startDate)} />
                  <DetailRow label="End Date"     value={formatDate(p.endDate)} />
                  <DetailRow label="Stage"        value={p.currentStage?.replace(/_/g, " ")} />
                  <DetailRow label="Methodology"  value={p.deliveryModel ?? p.methodology} />
                  <DetailRow label="Location"     value={p.primaryLocation} />
                  <DetailRow label="Created"      value={formatDate(p.createdAt)} />
                </div>
              </div>

              {/* ── Team Members ── */}
              {(members.length > 0 || projectManager || deliveryOwner || resourceManager) && (
                <div className="px-5 py-4">
                  <SectionTitle>Team Members</SectionTitle>
                  <div className="mt-1">
                    <PersonRow role="Project Manager"  name={projectManager}  email={pmEmail} roleColor="indigo" />
                    <PersonRow role="Delivery Owner"   name={deliveryOwner}   email={doEmail} roleColor="violet" />
                    <PersonRow role="Resource Manager" name={resourceManager} email={rmEmail} roleColor="blue" />
                    {members.filter((m) => !keyIds.has(m.id) && !keyIds.has(m.userId)).map((m, i) => {
                      const name = resolveName(m) ?? m.email ?? `Member ${i + 1}`;
                      const role = m.role ?? m.designation ?? m.projectRole ?? m.memberRole;
                      return <PersonRow key={m.id ?? m.userId ?? i} name={name} email={m.email} role={role} />;
                    })}
                  </div>
                </div>
              )}

              {/* ── Client Details ── */}
              {(clientName || p.organizationName || clientEmail) && (
                <div className="px-5 py-4">
                  <SectionTitle>Client</SectionTitle>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-2">
                    <DetailRow label="Client Name"   value={clientName} />
                    <DetailRow label="Organization"  value={p.organizationName} />
                    <DetailRow label="Client Email"  value={clientEmail} />
                  </div>
                </div>
              )}

              {/* ── Budget (managers only) ── */}
              {canSeeFinancials && (p.projectBudget != null || p.projectBudgetCurrency) && (
                <div className="px-5 py-4">
                  <SectionTitle>Budget</SectionTitle>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-2">
                    <DetailRow label="Amount"      value={formatCurrency(p.projectBudget, p.projectBudgetCurrency)} />
                    <DetailRow label="Currency"    value={p.projectBudgetCurrency} />
                    <DetailRow label="Budget Type" value={p.projectBudgetType} />
                  </div>
                </div>
              )}

              {/* ── Tags ── */}
              {p.tags?.length > 0 && (
                <div className="px-5 py-4">
                  <SectionTitle>Tags</SectionTitle>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {p.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer */}
        {p && (
          <div className="px-5 py-4 border-t border-slate-200 shrink-0">
            <button
              onClick={() => { navigate(`/projects/${p.id}`); onClose(); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
            >
              Open Project
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default ProjectDetailDrawer;
