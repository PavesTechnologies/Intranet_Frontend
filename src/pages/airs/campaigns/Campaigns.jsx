import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Briefcase, CheckCircle, PauseCircle, XCircle, Plus, Search, Calendar, Edit2,
  Sliders,
} from "lucide-react";
import Button from "../../../components/Button/Button";
import Modal from "../../../components/ui/Modal";
import FilterListbox from "../../../components/filter/FilterListbox";
import LoadingSpinner from "../../../components/LoadingSpinner";
import { KPICard } from "../../../components/kpi/KPI";
import NewCampaignForm from "./components/NewCampaignForm";
import EditCampaignModal from "./components/EditCampaignModal";
import WeightPresetsModal from "./components/WeightPresetsModal";
import useCampaignPermissions from "./hooks/useCampaignPermissions";
import { getAllJDs } from "../service/jdservice";
import {
  createCampaign,
  getAllCampaigns,
  getAllCampaignsHrAdmin,
  getCampaignsByHiringManager,
  getCampaignDetails,
  getPipelineSummary,
  getNameByRoles,
} from "./services/campaignservice";

const DEFAULT_CAMPAIGN_FORM = {
  jd_id: "",
  name: "",
  max_candidates: 1,
  deadline: "",
  weight_deterministic: 30,
  weight_semantic: 40,
  weight_ai: 30,
  semantic_threshold: 0.65,
  ai_threshold: 50,
  hiring_manager_id: "",
  recruiter_id: "",
};

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "All" },
  { label: "Active", value: "ACTIVE" },
  { label: "Paused", value: "PAUSED" },
  { label: "Closed", value: "CLOSED" },
];

const STATUS_BADGE = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  PAUSED: "bg-amber-50 text-amber-700",
  CLOSED: "bg-slate-100 text-slate-600",
  DRAFT: "bg-slate-100 text-slate-700",
};

const CAMPAIGNS_PER_PAGE = 9;

// Title-case a status enum for display, e.g. "ACTIVE" -> "Active"
const statusLabel = (s) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "—";

// Reduce a pipeline-summary payload into the three headline counts the card shows.
// Funnel stage counts are cumulative (candidates that reached that stage), so
// they map directly onto "candidates / shortlisted / selected".
const deriveStats = (summary) => {
  const stageCount = (key) =>
    (summary?.stages || []).find((s) => s.stage === key)?.count ?? 0;
  return {
    candidates: summary?.total_candidates ?? 0,
    shortlisted: stageCount("SHORTLISTED"),
    selected: stageCount("SELECTED"),
  };
};

export default function Campaigns() {
  const navigate = useNavigate();
  const {
    isHRAdmin, isHiringManager, canManageCampaigns, canManageScoring,
    canViewPipeline,
  } = useCampaignPermissions();

  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search / filter / pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  // Create-campaign modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [campaignForm, setCampaignForm] = useState(DEFAULT_CAMPAIGN_FORM);
  const [jdList, setJdList] = useState([]);

  // Edit-campaign modal (opened from a card) — needs the full detail response
  // (current candidate count + scoring config) for correct validation.
  const [editCampaignId, setEditCampaignId] = useState(null);
  const [editDetail, setEditDetail] = useState(null);
  const [editLoadingId, setEditLoadingId] = useState(null);
  const [presetsModalOpen, setPresetsModalOpen] = useState(false);

  const handleEditClick = async (e, campaign) => {
    e.stopPropagation();                 // don't trigger the card's navigate
    setEditLoadingId(campaign.id);
    try {
      const res = await getCampaignDetails(campaign.id);
      setEditDetail(res?.data || res);
      setEditCampaignId(campaign.id);
    } catch {
      toast.error("Failed to load campaign for editing.");
    } finally {
      setEditLoadingId(null);
    }
  };

  // Role decides which list endpoint we can call
  const fetchCampaigns = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = isHRAdmin
        ? await getAllCampaignsHrAdmin()
        : isHiringManager
          ? await getCampaignsByHiringManager()
          : await getAllCampaigns();
      setCampaigns(res?.data || []);
    } catch (err) {
      console.error("Failed to load campaigns:", err);
      toast.error("Failed to load campaigns.");
    } finally {
      setIsLoading(false);
    }
  }, [isHRAdmin, isHiringManager]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  // Resolve hiring-manager / recruiter user IDs to display names.
  // The campaign list returns these people as bare user IDs (e.g. "5100022"),
  // so we build an id -> name map from the role directory once on mount.
  // Best-effort: this UMS endpoint may be admin-only, so we degrade to the raw
  // ID when it isn't available for the current role.
  const [userMap, setUserMap] = useState({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results = await Promise.allSettled([
        getNameByRoles("HIRING_MANAGER"),
        getNameByRoles("RECRUITER"),
      ]);
      if (cancelled) return;
      const map = {};
      results.forEach((r) => {
        if (r.status !== "fulfilled") return;
        const list = Array.isArray(r.value) ? r.value : (r.value?.data || []);
        list.forEach((u) => {
          if (u?.user_id != null) map[String(u.user_id)] = u.employee_name || String(u.user_id);
        });
      });
      setUserMap(map);
    })();
    return () => { cancelled = true; };
  }, []);

  // JDs for the create modal's JD selector — loaded once, lazily, when the modal first opens
  useEffect(() => {
    if (!createModalOpen || jdList.length > 0) return;
    (async () => {
      try {
        const res = await getAllJDs({ page: 1, limit: 100 });
        setJdList(res?.data?.items || []);
      } catch {
        toast.error("Failed to load job descriptions.");
      }
    })();
  }, [createModalOpen, jdList.length]);

  //only verified+active jobs are campaign create eligible
  const eligibleJds = useMemo(() => jdList.filter((jd) => jd.is_active_version && (jd.is_verified || "").toUpperCase() === "VERIFIED"
    ),
    [jdList]
  );

  const jdOptions = useMemo(() => ([
    {
      value: "",
      label: eligibleJds.length === 0 && jdList.length > 0
        ? "No verified JDs available"
        : "Select a job description",
    },
    ...eligibleJds.map((jd) => ({ value: jd.id, label: jd.title })),
  ]), [eligibleJds, jdList.length]);

  // KPI counts
  const counts = useMemo(() => {
    const byStatus = (s) => campaigns.filter((c) => (c.status || "").toUpperCase() === s).length;
    return {
      total: campaigns.length,
      active: byStatus("ACTIVE"),
      paused: byStatus("PAUSED"),
      closed: byStatus("CLOSED"),
    };
  }, [campaigns]);

  // Client-side search + status filter
  const filteredCampaigns = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return campaigns.filter((c) => {
      const matchesQuery =
        (c.name || "").toLowerCase().includes(query) ||
        (c.jd_title || "").toLowerCase().includes(query) ||
        (c.hiring_manager || "").toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "All" || (c.status || "").toUpperCase() === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [campaigns, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCampaigns.length / CAMPAIGNS_PER_PAGE));
  const paginatedCampaigns = useMemo(() => {
    const start = (currentPage - 1) * CAMPAIGNS_PER_PAGE;
    return filteredCampaigns.slice(start, start + CAMPAIGNS_PER_PAGE);
  }, [filteredCampaigns, currentPage]);

  // Real candidate metrics per card come from the pipeline-summary endpoint.
  // We only fetch the campaigns visible on the current page, in parallel, and
  // cache by id so paging back and forth doesn't re-hit the API.
  //   value === undefined -> not fetched yet (loading placeholder)
  //   value === null       -> unavailable (e.g. role can't see the pipeline)
  //   value === object     -> real { candidates, shortlisted, selected }
  const [pipelineStats, setPipelineStats] = useState({});
  useEffect(() => {
    // HIRING_MANAGER can't call pipeline-summary at all (backend 403s it) —
    // don't fire a doomed request per visible card; cards fall back to the
    // "Pipeline metrics unavailable" state.
    if (!canViewPipeline) return;
    const missing = paginatedCampaigns
      .map((c) => c.id)
      .filter((id) => id && !(id in pipelineStats));
    if (missing.length === 0) return;

    let cancelled = false;
    (async () => {
      const entries = await Promise.all(missing.map(async (id) => {
          try {
            const res = await getPipelineSummary(id);
            return [id, deriveStats(res?.data ?? res)];
          } catch {
            return [id, null]; // no pipeline access / not found — degrade gracefully
          }
        })
      );
      if (!cancelled) {
        setPipelineStats((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
      }
    })();

    return () => { cancelled = true; };
  }, [paginatedCampaigns, pipelineStats, canViewPipeline]);

  // ---- Create campaign ----
  const handleCampaignFormChange = (e) => {
    const { name, value } = e.target;
    setCampaignForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleInitiateCampaign = async () => {
    const trimmedName = campaignForm.name.trim();
    if (!campaignForm.jd_id) return toast.error("Please select a job description.");
    if (!trimmedName) return toast.error("Campaign name cannot be empty.");
    if (trimmedName.length > 255) return toast.error("Campaign name must be 255 characters or fewer.");
    if (campaigns.some((c) => (c.name || "").toLowerCase() === trimmedName.toLowerCase())) {
      return toast.error(`A campaign named "${trimmedName}" already exists.`);
    }
    if (!String(campaignForm.hiring_manager_id).trim()) return toast.error("Please select a hiring manager.");
    if (!String(campaignForm.recruiter_id).trim()) return toast.error("Please select a recruiter.");
    if (campaignForm.max_candidates !== "" && campaignForm.max_candidates !== null && Number(campaignForm.max_candidates) <= 0) {
      return toast.error("Max candidates must be greater than 0.");
    }
    const weightsSum = Number(campaignForm.weight_deterministic) + Number(campaignForm.weight_semantic) + Number(campaignForm.weight_ai);
    if (Math.abs(weightsSum - 100) > 0.01) return toast.error("Scoring weights must sum to 100.00");

    const payload = {
      name: trimmedName,
      jd_id: campaignForm.jd_id,
      max_candidates: campaignForm.max_candidates === "" || campaignForm.max_candidates === null ? null : Number(campaignForm.max_candidates),
      deadline: campaignForm.deadline ? new Date(campaignForm.deadline).toISOString() : null,
      weight_deterministic: Number(campaignForm.weight_deterministic),
      weight_semantic: Number(campaignForm.weight_semantic),
      weight_ai: Number(campaignForm.weight_ai),
      semantic_threshold: Number(campaignForm.semantic_threshold),
      ai_threshold: Number(campaignForm.ai_threshold),
      hiring_manager_id: String(campaignForm.hiring_manager_id).trim(),
      recruiter_id: String(campaignForm.recruiter_id).trim(),
    };

    setIsSubmitting(true);
    try {
      const response = await createCampaign(payload);
      if (response?.success === false) {
        toast.error(response.message || "Failed to initiate campaign.");
        return;
      }
      toast.success(response?.message || "Campaign initiated successfully.");
      setCreateModalOpen(false);
      setCampaignForm(DEFAULT_CAMPAIGN_FORM);
      fetchCampaigns();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to initiate campaign.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (<div className="relative min-h-screen p-8 bg-slate-50/40 text-slate-800 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Campaigns</h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Create hiring campaigns, monitor screening pipelines, and track candidate progress.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canManageScoring && (<Button variant="outline" size="medium" onClick={() => setPresetsModalOpen(true)}>
              <Sliders className="h-4 w-4" /> Presets
            </Button>
          )}
          {canManageCampaigns && (<Button
              variant="primary"
              size="medium"
              onClick={() => {
                setCampaignForm(DEFAULT_CAMPAIGN_FORM);
                setCreateModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> New Campaign
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard label="Total Campaigns" value={counts.total} icon={<Briefcase className="h-5 w-5" />} color="bg-slate-100 text-slate-600" />
        <KPICard label="Active" value={counts.active} icon={<CheckCircle className="h-5 w-5" />} color="bg-emerald-50 text-emerald-600" />
        <KPICard label="Paused" value={counts.paused} icon={<PauseCircle className="h-5 w-5" />} color="bg-amber-50 text-amber-600" />
        <KPICard label="Closed" value={counts.closed} icon={<XCircle className="h-5 w-5" />} color="bg-slate-100 text-slate-500" />
      </div>

      {/* Toolbar: search + status filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-6">
        <div className="relative flex-1 max-w-[360px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, JD, or hiring manager..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white shadow-sm"
          />
        </div>
        <div className="w-44">
          <FilterListbox
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(value) => { setStatusFilter(value); setCurrentPage(1); }}
          />
        </div>
      </div>

      {/* Campaign cards */}
      {isLoading ? (<div className="flex justify-center py-16">
          <LoadingSpinner text="Loading campaigns..." />
        </div>
      ) : filteredCampaigns.length === 0 ? (<div className="text-center py-16 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
          <Briefcase className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-700">No campaigns found</p>
          <p className="text-[11px] text-slate-400 mt-1">
            {campaigns.length === 0
              ? "Create your first campaign to start screening candidates."
              : "Try adjusting your search or status filter."}
          </p>
        </div>
      ) : (<>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedCampaigns.map((c) => {
              const status = (c.status || "").toUpperCase();
              // Prefer a name field if the backend sends one, else resolve the
              // ID via the role directory, else show whatever we have.
              const managerName =
                c.hiring_manager_name ||
                userMap[String(c.hiring_manager)] ||
                c.hiring_manager ||
                "Unassigned";
              const initials = String(managerName).substring(0, 2).toUpperCase();

              // Real pipeline metrics (undefined = loading, null = unavailable).
              // Roles without pipeline access resolve straight to "unavailable"
              // since no fetch is ever attempted for them.
              const stats = canViewPipeline ? pipelineStats[c.id] : null;
              const hasStats = stats != null;
              const progressPct = hasStats
                ? c.max_candidates
                  ? Math.min(100, Math.round((stats.selected / c.max_candidates) * 100))
                  : stats.candidates
                    ? Math.min(100, Math.round((stats.selected / stats.candidates) * 100))
                    : 0
                : 0;

              return (<div
                  key={c.id}
                  onClick={() => navigate(`/airs/campaigns/${c.id}`)}
                  className="bg-white border border-slate-200 rounded-2xl px-6 py-5 shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-indigo-200 transition"
                >
                  <div>
                    {/* Top row: status + edit shortcut */}
                    <div className="flex justify-between items-center mb-2.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_BADGE[status] || "bg-slate-50 text-slate-600"}`}>
                        {statusLabel(status)}
                      </span>
                      {/* Edit shortcut — HR_ADMIN only, closed campaigns are read-only */}
                      {canManageCampaigns && status !== "CLOSED" && (<button
                          onClick={(e) => handleEditClick(e, c)}
                          disabled={editLoadingId === c.id}
                          title="Edit campaign"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition disabled:opacity-50"
                        >
                          {editLoadingId === c.id ? (<span className="block h-3.5 w-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                          ) : (<Edit2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Title + subtitle */}
                    <h4 className="text-base font-bold text-slate-900 leading-snug">{c.name}</h4>
                    <p className="text-xs text-slate-500 font-medium mt-1 mb-4">
                      {c.jd_title || "—"}
                      {c.max_candidates != null && ` · ${c.max_candidates} opening${c.max_candidates === 1 ? "" : "s"}`}
                    </p>

                    {/* Candidate stats + progress — real pipeline data */}
                    {stats === undefined ? (<div className="mb-4">
                        <div className="h-3 w-full bg-slate-100 rounded animate-pulse mb-2.5" />
                        <div className="h-2.5 w-full bg-slate-100 rounded-full animate-pulse" />
                      </div>
                    ) : hasStats ? (<>
                        <div className="flex justify-between items-center text-xs text-slate-500 font-semibold mb-1.5">
                          <span>{stats.candidates} candidates</span>
                          <span>{stats.shortlisted} shortlisted</span>
                          <span>{stats.selected} selected</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 mb-4 overflow-hidden">
                          <div
                            className="h-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-500 transition-all duration-500"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </>
                    ) : (<p className="text-[11px] text-slate-400 font-medium mb-4">
                        Pipeline metrics unavailable
                      </p>
                    )}
                  </div>

                  {/* Footer: manager + deadline */}
                  <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-7 w-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] uppercase shrink-0">
                        {initials}
                      </div>
                      <span className="text-xs font-bold text-slate-700 truncate">{managerName}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1 shrink-0">
                      <Calendar className="h-3 w-3" />
                      {c.deadline
                        ? `Due ${new Date(c.deadline).toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" })}`
                        : "No deadline"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (<div className="flex justify-between items-center border-t border-slate-100 pt-5 mt-6 text-xs text-slate-500 font-medium">
              <div>
                Showing <span className="font-semibold text-slate-700">{(currentPage - 1) * CAMPAIGNS_PER_PAGE + 1}</span> to{" "}
                <span className="font-semibold text-slate-700">{Math.min(currentPage * CAMPAIGNS_PER_PAGE, filteredCampaigns.length)}</span> of{" "}
                <span className="font-semibold text-slate-700">{filteredCampaigns.length}</span> campaigns
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-sm text-slate-600 font-semibold"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (<button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold transition-all shadow-sm ${currentPage === pageNum
                      ? "bg-[#0A0082] text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-sm text-slate-600 font-semibold"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Campaign Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Initiate Recruitment Campaign"
        width="520px"
        height="90vh"
      >
        <NewCampaignForm
          jdOptions={jdOptions}
          campaignForm={campaignForm}
          handleCampaignFormChange={handleCampaignFormChange}
          setLinkCampaignModalOpen={setCreateModalOpen}
          isSubmittingCampaign={isSubmitting}
          handleInitiateCampaign={handleInitiateCampaign}
        />
      </Modal>

      {canManageScoring && (<WeightPresetsModal isOpen={presetsModalOpen} onClose={() => setPresetsModalOpen(false)} />
      )}

      {/* Edit Campaign Modal (opened from a card's edit button) */}
      {editDetail && (<EditCampaignModal
          isOpen={!!editCampaignId}
          onClose={() => { setEditCampaignId(null); setEditDetail(null); }}
          campaignId={editCampaignId}
          detail={editDetail}
          existingNames={campaigns
            .filter((c) => c.id !== editCampaignId)
            .map((c) => (c.name || "").toLowerCase())}
          onSaved={() => {
            setEditCampaignId(null);
            setEditDetail(null);
            fetchCampaigns();
          }}
        />
      )}
    </div>
  );
}
