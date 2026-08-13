import React, { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  Activity, AlertOctagon, AlertTriangle, BarChart3, Briefcase, CheckCircle2,
  FileUp, Globe, Hourglass, ScrollText, Search, Users,
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
import DsarPanel from "./components/DsarPanel";
import CollapsibleSection from "./components/CollapsibleSection";
import PlatformHealthStrip from "./components/PlatformHealthStrip";
import {
  EmptyState, SectionError, SkeletonTiles,
} from "./components/DashboardStates";
import {
  getDashboardCampaigns, getHrAdminSummary, getRecruiterSummary,
} from "./services/dashboardService";

const fmtDate = (d) => (d ? new Date(d).toLocaleString() : null);

// Global KPICard supplies the tile itself; this only adds the click-through
// (every metric must navigate, never be a dead number).
//
// `muted` drops a zero to grey: on an attention row, "0 AI failures" is good
// news and should not compete for the eye with a real count.
function MetricTile({ label, value, to, icon: Icon, color, muted = false }) {
  const isZero = value === 0 || value === null || value === undefined;
  const card = (
    <KPICard
      label={label}
      value={value ?? "—"}
      icon={Icon ? <Icon className="h-5 w-5" /> : null}
      color={muted && isZero ? "bg-slate-50 text-slate-400" : color}
      className="h-full hover:border-indigo-300 hover:shadow-md transition"
    />
  );
  return to ? <Link to={to} className="block h-full">{card}</Link> : card;
}

// A labelled band of tiles. Naming the groups is what turns an awkward 4+3
// wrap into two rows that each mean something.
function MetricGroup({ title, children, cols = "md:grid-cols-4" }) {
  return (
    <div>
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
        {title}
      </h2>
      <div className={`grid grid-cols-2 ${cols} gap-4`}>{children}</div>
    </div>
  );
}

export default function AirsDashboardPage() {
  const { user, hasRole } = useAuth();
  const isHRAdmin = hasRole(["HR_ADMIN"]);
  const isRecruiter = hasRole(["RECRUITER"]);

  // Two independent sections: a summary failure must not hide the campaigns,
  // And vice versa.
  const summaryFetcher = useCallback(
    () => (isHRAdmin ? getHrAdminSummary() : getRecruiterSummary()),
    [isHRAdmin],
  );
  const summary = useDashboardSection(summaryFetcher, [isHRAdmin]);

  // Search is debounced so typing doesn't fire a request per keystroke;
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
      {/* Identity header. Name and role come from the UMS-issued JWT;
          no lookup or decryption is involved. */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900">
              Welcome back, {user?.name || "there"}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {isHRAdmin ? "HR Admin" : "Recruiter"}
              {lastLogin && <> · Last sign-in {lastLogin}</>}
            </p>
          </div>
          {/* Service health lives in the header rather than its own card: when
              everything is fine it is one line, not a full row of green pills. */}
          {isHRAdmin && s && (
            <div className="shrink-0">
              <PlatformHealthStrip breakers={s.platform_health} />
            </div>
          )}
        </div>
        <div className="mt-3">
          <NavBadges />
        </div>
      </div>

      {/* Warnings sit directly under the header — they were previously below
          the campaign table, i.e. below the fold on most screens, which is the
          one place an alert must never be. */}
      {isHRAdmin && <OverrideRateAlerts />}

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
          <MetricGroup title="Hiring activity">
            <MetricTile label="Active Campaigns" value={s.active_campaigns}
              to="/airs/campaigns?status=ACTIVE" icon={Briefcase} />
            <MetricTile label="Submitted (7 days)" value={s.candidates_last_7_days}
              to="/airs/campaigns" icon={FileUp} />
            <MetricTile label="Shortlisted" value={s.shortlisted_candidates}
              to="/airs/campaigns" icon={CheckCircle2} color="bg-sky-50 text-sky-600" />
            <MetricTile label="Awaiting HM Review" value={s.hm_review_pending}
              to="/airs/campaigns" icon={Users} color="bg-teal-50 text-teal-600" />
          </MetricGroup>

          {/* Separated because these are the numbers you act on, not the ones
              you report. A zero here is good news and is greyed accordingly. */}
          <MetricGroup title="Needs attention" cols="md:grid-cols-3">
            <MetricTile label="Campaigns With Stalls" value={s.campaigns_with_stall_warnings}
              to="/airs/campaigns" icon={Hourglass} color="bg-amber-50 text-amber-600" muted />
            <MetricTile label="AI Failures" value={s.ai_evaluation_failures}
              to="/airs/campaigns" icon={AlertOctagon} color="bg-rose-50 text-rose-600" muted />
            <MetricTile label="Skills To Review" value={s.pending_unknown_skills}
              to="/airs/skill-ontology" icon={Activity} color="bg-indigo-50 text-indigo-600" muted />
          </MetricGroup>
        </>
      )}

      {!summary.loading && !summary.error && s && !isHRAdmin && (
        <>
          <MetricGroup title="My activity" cols="md:grid-cols-3">
            <MetricTile label="Campaigns I Upload To" value={s.campaigns_uploaded_to}
              to="/airs/campaigns" icon={Briefcase} />
            <MetricTile label="Campaigns I Created" value={s.campaigns_created}
              to="/airs/campaigns" icon={Briefcase} />
            <MetricTile label="Resumes (7 days)" value={s.resumes_last_7_days}
              to="/airs/resume-intake" icon={FileUp} />
          </MetricGroup>

          <MetricGroup title="Outcomes" cols="md:grid-cols-2">
            <MetricTile label="Shortlisted From My Uploads" value={s.shortlisted_from_my_uploads}
              to="/airs/campaigns" icon={CheckCircle2} color="bg-emerald-50 text-emerald-600" />
            <MetricTile label="Uploads Needing Attention" value={s.failed_bulk_jobs}
              to="/airs/resume-intake" icon={AlertTriangle} color="bg-rose-50 text-rose-600" muted />
          </MetricGroup>
        </>
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

          {/* Search matches campaign name or JD title */}
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

        {/* A filtered-to-empty result is a different situation from
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

      {/* ── Tools ──────────────────────────────────────────────
          Everything below is occasional-use, so it collapses by default and
          stops competing with the campaign table for the top of the page. */}
      <div className="pt-2">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
          Tools
        </h2>
        <div className="space-y-3">
          {/* Reach is scoped server-side, so both roles can search.
              Adding to a campaign is HR_ADMIN-only, matching M13's endpoint. */}
          <CollapsibleSection
            title="Cross-Campaign Candidate Search"
            description="Find candidates by skill across every campaign you can access"
            icon={Globe}
          >
            <CrossCampaignSearch canAdd={isHRAdmin} />
          </CollapsibleSection>

          {/* Pointless with fewer than two campaigns */}
          {isHRAdmin && !campaigns.loading && !campaigns.error && cards.length >= 2 && (
            <CollapsibleSection
              title="Compare Campaigns"
              description="Put two to four pipeline funnels side by side"
              icon={BarChart3}
            >
              <CompareCampaigns campaigns={cards} />
            </CollapsibleSection>
          )}

          {/* Compliance workflow, HR_ADMIN only */}
          {isHRAdmin && (
            <CollapsibleSection
              title="Data Subject Access Request"
              description="Export everything held about one candidate"
              icon={ScrollText}
            >
              <DsarPanel />
            </CollapsibleSection>
          )}
        </div>
      </div>
    </div>
  );
}
