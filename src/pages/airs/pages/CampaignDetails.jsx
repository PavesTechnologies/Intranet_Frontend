import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  ArrowLeft, Users, Activity, AlertTriangle, Lock, Target,
  UserCog, FileText, ArrowRight, Filter, ChevronDown, Clock, Edit2,
  ExternalLink
} from "lucide-react";
import Button from "../../../components/Button/Button";
import FilterListbox from "../../../components/filter/FilterListbox";
import LoadingSpinner from "../../../components/LoadingSpinner";
import EditCampaignModal from "../modals/EditCampaignModal";
import { useAuth } from "../../../contexts/AuthContext";
import {
  getCampaignDetails, getPipelineSummary, getCampaignTimeline,
} from "../service/campaignservice";

// Colour per pipeline stage (used for the funnel bars)
const STAGE_COLORS = {
  UPLOADED: "#6366F1", SCREENING: "#3B82F6", SHORTLISTED: "#0EA5E9",
  HM_REVIEW: "#14B8A6", INTERVIEW: "#10B981", SELECTED: "#22C55E",
  HOLD: "#94A3B8", REJECTED: "#F43F5E", FRAUD_REVIEW: "#F59E0B",
};
const stageLabel = (s) =>
  s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const TIMELINE_EVENT_TYPES = [
  { value: "", label: "All Events" },
  { value: "CAMPAIGN_CREATED", label: "Campaign Created" },
  { value: "THRESHOLD_UPDATED", label: "Threshold Updated" },
  { value: "CAMPAIGN_SCORING_CONFIG_CHANGED", label: "Scoring Config Changed" },
  { value: "BULK_UPLOAD_COMPLETED", label: "Bulk Upload Completed" },
  { value: "CANDIDATE_SHORTLISTED", label: "Candidate Shortlisted" },
  { value: "STATUS_CHANGED", label: "Status Changed" },
];

// service returns the raw APIResponse ({ success, message, data }); pull out data
const unwrap = (res) => (res && res.data !== undefined ? res.data : res);
const asPct = (n) => (n == null ? "—" : `${Math.round(n)}%`);
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : "—");

export default function CampaignDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const isHRAdmin = hasRole(["HR_ADMIN"]);

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");
  const [editOpen, setEditOpen] = useState(false);

  // S06-T01 — load full campaign profile
  const loadDetail = useCallback(async () => {
    try {
      const res = await getCampaignDetails(id);
      setDetail(unwrap(res));
    } catch {
      toast.error("Failed to load campaign details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Loading campaign..." />
      </div>
    );
  }
  if (!detail) {
    return (
      <div className="p-8 min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
        <AlertTriangle className="h-12 w-12 text-rose-500 mb-4" />
        <h2 className="text-lg font-bold text-slate-800">Campaign Not Found</h2>
        <Button variant="primary" size="small" className="mt-4" onClick={() => navigate("/airs/campaigns")}>
          Back to Campaigns
        </Button>
      </div>
    );
  }

  const info = detail.campaign_info || {};
  const jd = detail.jd_configuration || {};
  const scoring = detail.scoring_configuration;      // null for HIRING_MANAGER
  const limits = detail.pipeline_limits || {};
  const hm = detail.hiring_manager;                  // null for HIRING_MANAGER

  const status = (info.status || "").toUpperCase();
  const isClosed = status === "CLOSED";
  const isActive = status === "ACTIVE";
  const canEdit = isHRAdmin && !isClosed;            // S07-T03: closed = read-only

  // Pipeline & Timeline tabs only exist for users the backend serves that data to.
  // scoring != null is a reliable proxy for "not a plain HIRING_MANAGER".
  const canSeePipeline = scoring != null;            // HR_ADMIN / RECRUITER
  const canSeeTimeline = isHRAdmin;                  // S06-T03: HR_ADMIN only

  const tabs = [
    { id: "details", label: "Details", icon: FileText, show: true },
    { id: "pipeline", label: "Pipeline", icon: Users, show: canSeePipeline },
    { id: "timeline", label: "Timeline", icon: Activity, show: canSeeTimeline },
  ].filter((t) => t.show);

  const statusStyle = {
    ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-100",
    PAUSED: "bg-amber-50 text-amber-700 border-amber-100",
    CLOSED: "bg-slate-100 text-slate-600 border-slate-200",
  }[status] || "bg-slate-50 text-slate-600 border-slate-200";

  return (
    <div className="bg-[#F8FAFC] text-slate-900 font-sans min-h-screen p-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-6 flex flex-col md:flex-row justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 shadow-sm shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${statusStyle}`}>
              {status}
            </span>
            <h1 className="text-xl font-bold text-slate-900 mt-1">{info.name}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Created by {info.created_by_name || "System"} on {fmtDate(info.created_at)}
            </p>
          </div>
        </div>
        {canEdit && (
          <div className="flex items-start">
            <Button variant="secondary" size="medium" onClick={() => setEditOpen(true)}>
              <Edit2 className="h-4 w-4" /> Edit Campaign
            </Button>
          </div>
        )}
      </div>

      {/* S07-T03: closed read-only banner */}
      {isClosed && (
        <div className="mb-6 flex items-center gap-3 bg-slate-100 border border-slate-200 rounded-xl px-5 py-3">
          <Lock className="h-4 w-4 text-slate-500" />
          <p className="text-xs font-semibold text-slate-600">
            This campaign is <b>closed</b> and read-only. Reopen the campaign to make changes.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 pb-3 text-xs font-bold border-b-2 transition ${
              activeTab === t.id ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === "details" && (
        <DetailsTab info={info} jd={jd} scoring={scoring} limits={limits} hm={hm} />
      )}
      {activeTab === "pipeline" && (
        <PipelineTab
          campaignId={id}
          isActive={isActive}
          onViewCandidates={() => navigate(`/airs/candidates?campaign=${id}`)}
        />
      )}
      {activeTab === "timeline" && <TimelineTab campaignId={id} />}

      {canEdit && (
        <EditCampaignModal
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          campaignId={id}
          detail={detail}
          onSaved={() => { setEditOpen(false); setLoading(true); loadDetail(); }}
        />
      )}
    </div>
  );
}

/* ---------------- Details Tab (S06-T01) ---------------- */
function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-fit">
      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest border-b pb-2 mb-3 flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-blue-600" />} {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <span className="text-[10px] uppercase font-bold text-slate-400 block">{label}</span>
      <span className="text-xs font-bold text-slate-800">{value ?? "—"}</span>
    </div>
  );
}

function DetailsTab({ info, jd, scoring, limits, hm }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Section title="Campaign Info" icon={FileText}>
        <Field label="Name" value={info.name} />
        <Field label="Status" value={(info.status || "").toUpperCase()} />
        <Field label="Created By" value={info.created_by_name} />
        <Field label="Created At" value={fmtDate(info.created_at)} />
        <Field label="Updated At" value={fmtDate(info.updated_at)} />
      </Section>

      <Section title="JD Configuration" icon={FileText}>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Linked JD</span>
          {jd.jd_id ? (
            <Link
              to={`/airs/jds/${jd.jd_id}`}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
            >
              {jd.jd_title} <ExternalLink className="h-3 w-3" />
            </Link>
          ) : (
            <span className="text-xs font-bold text-slate-800">{jd.jd_title ?? "—"}</span>
          )}
        </div>
        <Field label="Version" value={jd.version_number} />
        <Field label="Jurisdiction" value={jd.jurisdiction} />
        <Field label="Mandatory Skills" value={jd.mandatory_skill_count} />
      </Section>

      {/* Rendered only when backend supplied it (null for HIRING_MANAGER) */}
      {scoring && (
        <Section title="Scoring Configuration" icon={Target}>
          <Field label="Deterministic Weight" value={asPct(scoring.weight_deterministic)} />
          <Field label="Semantic Weight" value={asPct(scoring.weight_semantic)} />
          <Field label="AI Weight" value={asPct(scoring.weight_ai)} />
          <Field label="Semantic Threshold" value={scoring.semantic_threshold} />
          <Field label="AI Threshold" value={scoring.ai_threshold} />
        </Section>
      )}

      <Section title="Pipeline Limits" icon={Users}>
        <Field
          label="Max Candidates"
          value={limits.max_candidates == null ? "Unlimited" : `${limits.current_candidate_count} / ${limits.max_candidates}`}
        />
        <Field label="Current Candidates" value={limits.current_candidate_count} />
        <Field label="Deadline" value={limits.deadline ? fmtDate(limits.deadline) : "None"} />
      </Section>

      {hm && (
        <Section title="Assigned Hiring Manager" icon={UserCog}>
          <Field label="Name" value={hm.full_name} />
          <Field label="Email" value={hm.email} />
        </Section>
      )}
    </div>
  );
}

/* ---------------- Pipeline Tab (S06-T02) ---------------- */
function PipelineTab({ campaignId, isActive, onViewCandidates }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await getPipelineSummary(campaignId);
      setSummary(unwrap(res));
    } catch {
      toast.error("Failed to load pipeline summary.");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  // S06-T02: refresh in real time while the campaign is active — poll every 10s
  useEffect(() => {
    if (!isActive) return;
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [isActive, load]);

  if (loading) {
    return <div className="py-12 flex justify-center"><LoadingSpinner text="Loading pipeline..." /></div>;
  }
  if (!summary) return null;

  const stages = summary.stages || [];
  const maxCount = Math.max(1, ...stages.map((s) => s.count));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Pipeline Funnel</h3>
          <p className="text-[11px] text-slate-500">
            {summary.total_candidates} candidates submitted
            {isActive && <span className="text-emerald-600 font-semibold"> · live</span>}
          </p>
        </div>
        <Button size="small" variant="primary" onClick={onViewCandidates}>
          View All Candidates <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        {stages.map((s) => (
          <div key={s.stage}>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-bold text-slate-700">{stageLabel(s.stage)}</span>
              <div className="flex items-center gap-3">
                {s.drop_off_pct != null && (
                  <span className="text-[10px] font-semibold text-rose-500">
                    ▼ {Math.round(s.drop_off_pct)}% drop-off
                  </span>
                )}
                <span className="font-black text-slate-900 tabular-nums">{s.count}</span>
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${(s.count / maxCount) * 100}%`, backgroundColor: STAGE_COLORS[s.stage] || "#6366F1" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Timeline Tab (S06-T03) ---------------- */
function TimelineTab({ campaignId }) {
  const [events, setEvents] = useState([]);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [eventType, setEventType] = useState("");
  const [loading, setLoading] = useState(true);
  const LIMIT = 20;

  const load = useCallback(async (reset) => {
    setLoading(true);
    try {
      const off = reset ? 0 : offset;
      const res = await getCampaignTimeline(campaignId, {
        limit: LIMIT, offset: off, event_type: eventType || undefined,
      });
      const data = unwrap(res);
      const list = data.events || [];
      setEvents((prev) => (reset ? list : [...prev, ...list]));
      setTotal(data.total_events || 0);
      setOffset(off + list.length);
    } catch {
      toast.error("Failed to load timeline.");
    } finally {
      setLoading(false);
    }
  }, [campaignId, offset, eventType]);

  // Reload from scratch whenever the event-type filter changes
  useEffect(() => { load(true); /* eslint-disable-next-line */ }, [eventType]);

  const hasMore = events.length < total;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Activity Timeline</h3>
          <p className="text-[11px] text-slate-500">
            {total} event{total === 1 ? "" : "s"}{eventType ? " (filtered)" : ""}
          </p>
        </div>
        <div className="w-56 flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <div className="flex-1">
            <FilterListbox options={TIMELINE_EVENT_TYPES} value={eventType} onChange={setEventType} />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        {events.length === 0 && !loading ? (
          <p className="text-xs text-slate-400 text-center py-8">No activity recorded.</p>
        ) : (
          <div className="space-y-6 relative border-l border-slate-200 pl-6 ml-2">
            {events.map((ev, idx) => (
              <div key={idx} className="relative">
                <span className="absolute -left-[30px] top-1 w-3.5 h-3.5 rounded-full border-2 border-blue-500 bg-blue-50" />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-indigo-50 text-indigo-700 text-[9px] font-bold px-2 py-0.5 rounded border border-indigo-100 uppercase">
                    {ev.event_type}
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {fmtDate(ev.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-slate-700 mt-1">{ev.description}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">by {ev.actor_name || "System"}</p>
              </div>
            ))}
          </div>
        )}

        {loading && <div className="py-4 flex justify-center"><LoadingSpinner text="Loading..." /></div>}

        {hasMore && !loading && (
          <div className="flex justify-center mt-6">
            <Button variant="outline" size="small" onClick={() => load(false)}>
              Load More <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
