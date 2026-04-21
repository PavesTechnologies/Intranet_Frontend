import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  Clock3,
  DollarSign,
  Users,
  Search,
} from "lucide-react";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import Pagination from "../../../../components/Pagination/pagination";
import { getOperationalProjectDetail } from "../services/operationalProjectsService";

const ITEMS_PER_PAGE = 5;

const formatMetric = (value, suffix = "") => {
  const number = Number(value);
  return Number.isFinite(number) ? `${number}${suffix}` : "--";
};

const normalizeDetailPayload = (payload, projectId) => {
  const detail = payload?.data || payload;
  const project = detail?.project || detail?.projectInfo || detail?.projectDetails || detail || {};
  const resources = detail?.resources || detail?.projectResources || detail?.allocations || [];

  const billableHours = Number(project.billableHours ?? project.billable ?? project.billableHour ?? 0);
  const nonBillableHours = Number(project.nonBillableHours ?? project.nonBillable ?? project.nonBillableHour ?? 0);
  const resourceHours = Number(
    project.resourceHours ?? project.totalResourceHours ?? project.totalHours ?? billableHours + nonBillableHours,
  );
  const internalHours = Math.max(resourceHours - billableHours - nonBillableHours, 0);
  const totalBillingBase = billableHours + nonBillableHours + internalHours;

  return {
    project: {
      id: project.projectId || project.pmsProjectId || projectId,
      name: project.projectName || project.project || project.name || "Unnamed Project",
      clientName: project.clientName || project.client?.client_name || project.client || "Client Project",
      plannedHours: Number(project.plannedHours ?? project.planned ?? 0),
      actualHours: Number(project.actualHours ?? project.actual ?? 0),
      pendingHours: Number(project.pendingHours ?? project.pending ?? 0),
      utilization: Number(project.utilization ?? project.utilizationPercentage ?? project.utilizationPercent ?? 0),
      billableHours,
      nonBillableHours,
      internalHours,
      billablePercentage: totalBillingBase > 0 ? Number(((billableHours / totalBillingBase) * 100).toFixed(1)) : 0,
      nonBillablePercentage: totalBillingBase > 0 ? Number(((nonBillableHours / totalBillingBase) * 100).toFixed(1)) : 0,
      internalPercentage: totalBillingBase > 0 ? Number(((internalHours / totalBillingBase) * 100).toFixed(1)) : 0,
    },
    resources: Array.isArray(resources) ? resources : [],
  };
};

const getResourceName = (resource) =>
  resource.fullName || resource.resourceName || resource.employeeName || resource.name || `Resource ${resource.resourceId || ""}`.trim();

const getResourceEmail = (resource) => resource.email || resource.employeeEmail || resource.mail || "--";

const getBillableHours = (resource) =>
  resource.billableHours ?? resource.billableHour ?? resource.billable ?? resource.billableUtilization ?? null;

const getNonBillableHours = (resource) =>
  resource.nonBillableHours ?? resource.nonBillableHour ?? resource.nonBillable ?? resource.nonBillableUtilization ?? null;

const OperationalProjectDetailPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [projectDetail, setProjectDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const loadProjectDetail = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await getOperationalProjectDetail(projectId);
        setProjectDetail(normalizeDetailPayload(response, projectId));
      } catch (err) {
        console.error("Failed to fetch operational project detail", err);
        setError(err?.response?.data?.message || "Failed to fetch project detail.");
      } finally {
        setLoading(false);
      }
    };

    loadProjectDetail();
  }, [projectId]);

  const filteredResources = useMemo(() => {
    const resources = projectDetail?.resources || [];
    return resources.filter((resource) =>
      getResourceName(resource).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getResourceEmail(resource).toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [projectDetail?.resources, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredResources.length / ITEMS_PER_PAGE));

  const paginatedResources = useMemo(() => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    return filteredResources.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredResources, page]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFDFE] p-6">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <LoadingSpinner text="Projects Loading..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FDFDFE] p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-700">
          {error}
        </div>
      </div>
    );
  }

  const project = projectDetail?.project;

  return (
    <div className="min-h-screen bg-[#FDFDFE] p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/resource-management/bench/utilization-performance", { state: { activeTab: "projects" } })}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-all hover:bg-slate-50"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{project?.name}</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {project?.clientName}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Project Name", value: project?.name, icon: Briefcase },
            { label: "Hours (Act / Plan)", value: `${formatMetric(project?.actualHours)} / ${formatMetric(project?.plannedHours, "h")}`, icon: Clock3 },
            { label: "Utilization", value: formatMetric(project?.utilization, "%"), icon: Users },
            { label: "Billing Strip", value: `${formatMetric(project?.billableHours, "h")} B / ${formatMetric(project?.nonBillableHours, "h")} NB`, icon: DollarSign },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <card.icon size={18} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{card.label}</p>
              <p className="mt-2 text-sm font-bold text-slate-900">{card.value || "--"}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Overall Billing Strip</p>
            <div className="mt-4 overflow-hidden rounded-full bg-slate-100">
              <div className="flex h-3 w-full">
                <div className="bg-indigo-600" style={{ width: `${project?.billablePercentage || 0}%` }} />
                <div className="bg-indigo-300" style={{ width: `${project?.nonBillablePercentage || 0}%` }} />
                <div className="bg-slate-300" style={{ width: `${project?.internalPercentage || 0}%` }} />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] font-bold text-slate-600">
              <span>{formatMetric(project?.billableHours, "h")} Billable</span>
              <span>{formatMetric(project?.nonBillableHours, "h")} Non-Billable</span>
              <span>{formatMetric(project?.pendingHours, "h")} Pending</span>
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Resources Under This Project</h2>
              <p className="text-sm text-slate-500">Simple resource-wise billable and non-billable view.</p>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search resources..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          {filteredResources.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center text-sm font-medium text-slate-500">
              No resources available for this project.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-bold">Resource</th>
                      <th className="px-4 py-3 font-bold text-center">Billable Hours</th>
                      <th className="px-4 py-3 font-bold text-center">Non-Billable Hours</th>
                      <th className="px-4 py-3 font-bold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedResources.map((resource, index) => (
                      <tr key={resource.resourceId || resource.id || `${getResourceName(resource)}-${index}`} className="hover:bg-slate-50/60">
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-bold text-slate-900">{getResourceName(resource)}</p>
                            <p className="text-[11px] text-slate-500">{getResourceEmail(resource)}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center font-bold text-indigo-700">
                          {formatMetric(getBillableHours(resource), "h")}
                        </td>
                        <td className="px-4 py-4 text-center font-bold text-slate-700">
                          {formatMetric(getNonBillableHours(resource), "h")}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600">
                            {resource.allocationStatus || resource.status || "Active"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPrevious={() => setPage((prev) => Math.max(prev - 1, 1))}
                  onNext={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                  className="justify-end py-0"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OperationalProjectDetailPage;
