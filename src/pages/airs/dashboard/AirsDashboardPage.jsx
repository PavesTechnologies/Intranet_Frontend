import React, { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  Activity, AlertOctagon, AlertTriangle, Briefcase, CheckCircle2,
  FileUp, Hourglass, Search, Users,
} from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import Button from "../../../components/Button/Button";
import FilterListbox from "../../../components/filter/FilterListbox";
import { KPICard } from "../../../components/kpi/KPI";
import useDashboardSection from "./hooks/useDashboardSection";
import CampaignTable from "./components/CampaignTable";
import NavBadges from "./components/NavBadges";
import CompareCampaigns from "./components/CompareCampaigns";
import CrossCampaignSearch from "./components/CrossCampaignSearch";
import OverrideRateAlerts from "./components/OverrideRateAlerts";
import {
  EmptyState, SectionError, SkeletonTiles,
} from "./components/DashboardStates";
import {
  getDashboardCampaigns, getHrAdminSummary, getRecruiterSummary,
} from "./services/dashboardService";

const fmtDate = (d) => (d ? new Date(d).toLocaleString() : null);

const BREAKER_TONE = {
  CLOSED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  HALF_OPEN: "bg-amber-50 text-amber-700 border-amber-200",
  OPEN: "bg-rose-50 text-rose-700 border-rose-200",
};

// Global KPICard supplies the tile itself; this only adds the click-through
// that S01-T02/T03 require (every metric must navigate, never be a dead number).
function MetricTile({ label, value, to, icon: Icon, color }) {
  const card = (
    <KPICard
      label={label}
      value={value ?? "—"}
      icon={Icon ? <Icon className="h-5 w-5" /> : null}
      color={color}
      className="h-full hover:border-indigo-300 hover:shadow-md transition"
    />
  );
  return to ? <Link to={to} className="block h-full">{card}</Link> : card;
}

export default function AirsDashboardPage() {
  const { user, hasRole } = useAuth();
  const isHRAdmin = hasRole(["HR_ADMIN"]);
  const isRecruiter = hasRole(["RECRUITER"]);

  // Two independent sections: a summary failure must not hide the campaigns,
  // and vice versa (S05-T03).
  const summaryFetcher = useCallback(
    () => (isHRAdmin ? getHrAdminSummary() : getRecruiterSummary()),
    [isHRAdmin],
  );
  const summary = useDashboardSection(summaryFetcher, [isHRAdmin]);

  // S02-T03: search is debounced so typing doesn't fire a request per keystroke;
  // status applies immediately since it's a discrete choice.
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("All");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const campaignsFetcher = useCallback(
    () => getDashboardCampaigns({
      limit: 12,
      search: debouncedSearch || undefined,
      status,
      // "Closed" is only reachable by asking for it explicitly
      show_closed: status === "CLOSED",
    }),
    [debouncedSearch, status],
  );
  const campaigns = useDashboardSection(campaignsFetcher, [debouncedSearch, status]);

  // HIRING_MANAGER has no dashboard of its own — send them to the campaign
  // list they are already scoped to rather than rendering an empty shell.
  if (!isHRAdmin && !isRecruiter) return <Navigate to="/airs/campaigns" replace />;

  const s = summary.data;
  const lastLogin = fmtDate(s?.last_login_at);
  const cards = campaigns.data || [];
  const hasFilters = Boolean(debouncedSearch) || status !== "All";

  return (
    <div className="bg-[#F8FAFC] text-slate-900 font-sans min-h-screen p-6 space-y-6">
      {/* S01-T01 — identity header. Name and role come from the UMS-issued JWT;
          no lookup or decryption is involved. */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">
          Welcome back, {user?.name || "there"}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {isHRAdmin ? "HR Admin" : "Recruiter"}
          {lastLogin && <> · Last sign-in {lastLogin}</>}
        </p>
        <div className="mt-3">
          <NavBadges />
        </div>
      </div>

      {/* ── Activity summary ───────────────────────────────── */}
      {summary.loading && <SkeletonTiles count={isHRAdmin ? 7 : 5} />}

      {!summary.loading && summary.error && (
        <SectionError
          message="Your activity summary could not be loaded."
          onRetry={summary.retry}
        />
      )}

      {!summary.loading && !summary.error && s && isHRAdmin && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricTile label="Active Campaigns" value={s.active_campaigns}
              to="/airs/campaigns" icon={Briefcase} />
            <MetricTile label="Submitted (7 days)" value={s.candidates_last_7_days}
              to="/airs/campaigns" icon={FileUp} />
            <MetricTile label="Shortlisted" value={s.shortlisted_candidates}
              to="/airs/campaigns" icon={CheckCircle2} color="bg-sky-50 text-sky-600" />
            <MetricTile label="Awaiting HM Review" value={s.hm_review_pending}
              to="/airs/campaigns" icon={Users} color="bg-teal-50 text-teal-600" />
            <MetricTile label="Campaigns With Stalls" value={s.campaigns_with_stall_warnings}
              to="/airs/campaigns" icon={Hourglass} color="bg-amber-50 text-amber-600" />
            <MetricTile label="AI Failures" value={s.ai_evaluation_failures}
              to="/airs/campaigns" icon={AlertOctagon} color="bg-rose-50 text-rose-600" />
            <MetricTile label="Pending Unknown Skills" value={s.pending_unknown_skills}
              to="/airs/skill-ontology" icon={Activity} color="bg-indigo-50 text-indigo-600" />
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-900 mb-3">
              Platform Health
            </h2>
            {s.platform_health?.length ? (
              <div className="flex flex-wrap gap-2">
                {s.platform_health.map((b) => (
                  <span key={b.service_name}
                    className={`text-[11px] font-bold px-3 py-1.5 rounded-full border ${BREAKER_TONE[b.state] || "bg-slate-50 text-slate-600 border-slate-200"}`}
                    title={b.state === "OPEN"
                      ? `Open since ${fmtDate(b.opened_at)} · retry after ${fmtDate(b.retry_after)}`
                      : `${b.failure_count} recorded failure(s)`}>
                    {b.service_name}: {b.state}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400">
                No breaker state recorded yet for the monitored services.
              </p>
            )}
          </div>
        </>
      )}

      {!summary.loading && !summary.error && s && !isHRAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <MetricTile label="Campaigns I Upload To" value={s.campaigns_uploaded_to}
            to="/airs/campaigns" icon={Briefcase} />
          <MetricTile label="Campaigns I Created" value={s.campaigns_created}
            to="/airs/campaigns" icon={Briefcase} />
          <MetricTile label="Resumes (7 days)" value={s.resumes_last_7_days}
            to="/airs/resume-intake" icon={FileUp} />
          <MetricTile label="Shortlisted From My Uploads" value={s.shortlisted_from_my_uploads}
            to="/airs/campaigns" icon={CheckCircle2} color="bg-emerald-50 text-emerald-600" />
          <MetricTile label="Uploads Needing Attention" value={s.failed_bulk_jobs}
            to="/airs/resume-intake" icon={AlertTriangle} color="bg-rose-50 text-rose-600" />
        </div>
      )}

      {/* ── Campaign cards ─────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h2 className="text-sm font-bold text-slate-900 shrink-0">
            {isHRAdmin ? "Campaigns" : "My Campaigns"}
            {!campaigns.loading && !campaigns.error && (
              <span className="ml-2 text-[11px] font-bold text-slate-400">
                {cards.length}
              </span>
            )}
          </h2>

          {/* S02-T03 — search matches campaign name or JD title */}
          <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
            <div className="relative w-full max-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search campaigns or JD..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="w-36 shrink-0">
              <FilterListbox
                options={[
                  { value: "All", label: "All Statuses" },
                  { value: "ACTIVE", label: "Active" },
                  { value: "PAUSED", label: "Paused" },
                  { value: "CLOSED", label: "Closed" },
                ]}
                value={status}
                onChange={setStatus}
              />
            </div>
            <Link to="/airs/campaigns" className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 shrink-0">
              View all
            </Link>
          </div>
        </div>

        {campaigns.loading && <CampaignTable campaigns={[]} loading />}

        {!campaigns.loading && campaigns.error && (
          <SectionError message="Campaign data could not be loaded." onRetry={campaigns.retry} />
        )}

        {/* S05-T01 — a filtered-to-empty result is a different situation from
            having no campaigns at all, and needs a way back rather than
            onboarding advice. */}
        {!campaigns.loading && !campaigns.error && cards.length === 0 && (
          hasFilters ? (
            <EmptyState
              icon={Search}
              title="No campaigns match your current filters"
              message="Try a different search term or status."
              action={
                <Button variant="outline" size="small"
                  onClick={() => { setSearch(""); setStatus("All"); }}>
                  Clear Filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Briefcase}
              title="No campaigns to display yet"
              message={isHRAdmin
                ? "Create a campaign from a verified job description to start screening."
                : "Ask your HR Admin to assign you to a campaign, or start uploading to an existing one."}
              action={
                <Link to={isHRAdmin ? "/airs/campaigns" : "/airs/resume-intake"}>
                  <Button variant="primary" size="small">
                    {isHRAdmin ? "Go to Campaigns" : "Start Uploading"}
                  </Button>
                </Link>
              }
            />
          )
        )}

        {!campaigns.loading && !campaigns.error && cards.length > 0 && (
          <div className="overflow-x-auto">
            <CampaignTable campaigns={cards} />
          </div>
        )}
      </div>

      {/* M11-E04-S04-T03 — renders only when a campaign is actually flagged */}
      {isHRAdmin && <OverrideRateAlerts />}

      {/* S04-T03 — HR_ADMIN only, and pointless with fewer than two campaigns */}
      {isHRAdmin && !campaigns.loading && !campaigns.error && cards.length >= 2 && (
        <CompareCampaigns campaigns={cards} />
      )}

      {/* M11-E03-S04 — reach is scoped server-side, so both roles can search.
          Adding to a campaign is HR_ADMIN-only, matching M13's endpoint. */}
      <CrossCampaignSearch canAdd={isHRAdmin} />
    </div>
  );
}
