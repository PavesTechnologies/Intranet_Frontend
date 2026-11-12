import React, { useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  BellRing, Bot, CalendarClock, GitBranch, GraduationCap, LayoutTemplate, ListChecks, Mail, Plug, Scale,
  Settings as SettingsIcon, SlidersHorizontal,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import SettingsWeightConfig from "./components/SettingsWeightConfig";
import SettingsAIProviders from "./components/SettingsAIProviders";
import SettingsIntegrations from "./components/SettingsIntegrations";
import SettingsEducationFields from "./components/SettingsEducationFields";
import SettingsProfileTemplates from "./components/SettingsProfileTemplates";
import SettingsGeneral from "./components/SettingsGeneral";
import SettingsAlerts from "./components/SettingsAlerts";
import SettingsEmailTemplates from "./components/SettingsEmailTemplates";
import SettingsReasonCodes from "./components/SettingsReasonCodes";
import SettingsSchedules from "./components/SettingsSchedules";
import SettingsTransitions from "./components/SettingsTransitions";

const PROVIDER_LABEL = { microsoft: "Microsoft Calendar", google: "Google Calendar" };

// One tab per area (?tab=...). The page's route is HR_ADMIN only; every endpoint checks it too.
const TABS = [
  { value: "general", label: "General", icon: SlidersHorizontal, Component: SettingsGeneral },
  { value: "alerts", label: "Alerts", icon: BellRing, Component: SettingsAlerts },
  { value: "email-templates", label: "Email templates", icon: Mail, Component: SettingsEmailTemplates },
  { value: "reason-codes", label: "Reason codes", icon: ListChecks, Component: SettingsReasonCodes },
  { value: "stage-moves", label: "Stage moves", icon: GitBranch, Component: SettingsTransitions },
  { value: "scoring-defaults", label: "Campaign defaults", icon: Scale, Component: SettingsWeightConfig },
  { value: "profile-templates", label: "Profile templates", icon: LayoutTemplate, Component: SettingsProfileTemplates },
  { value: "education-fields", label: "Education fields", icon: GraduationCap, Component: SettingsEducationFields },
  { value: "ai-providers", label: "AI providers", icon: Bot, Component: SettingsAIProviders },
  { value: "integrations", label: "Integrations", icon: Plug, Component: SettingsIntegrations },
  { value: "schedules", label: "Schedules", icon: CalendarClock, Component: SettingsSchedules },
];

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = TABS.some((t) => t.value === searchParams.get("tab")) ? searchParams.get("tab") : "general";
  const ActiveComponent = TABS.find((t) => t.value === activeTab).Component;

  // The OAuth callback redirects back here as
  // ?connected=microsoft&status=success|error — surface that once, then
  // strip the params so a page refresh doesn't re-show the toast.
  //
  // The Schedule Interview modal's inline "Connect" button opens this same
  // flow in a popup (window.open) instead of navigating the main tab, so it
  // lands here too. `window.opener` is only set on a window opened via
  // script, so it's a reliable signal we're that popup rather than a normal
  // visit to this page — in that case there's no one to show the toast to
  // (the popup is about to disappear), the modal's own polling of /status
  // is what notices the connection, so just close.
  useEffect(() => {
    const connected = searchParams.get("connected");
    const status = searchParams.get("status");
    if (!connected) return;

    if (window.opener) {
      window.close();
      return;
    }

    const label = PROVIDER_LABEL[connected] || connected;
    if (status === "success") {
      toast.success(`${label} connected successfully.`);
    } else if (status === "error") {
      toast.error(`Couldn't connect ${label}. Please try again.`);
    }

    navigate(`${location.pathname}?tab=integrations`, { replace: true });
    // Deliberately mount-only — this reads whatever the URL was redirected
    // in with, not anything that should re-run as the user navigates the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
          <div className="p-2 bg-white rounded-lg border border-slate-200">
            <SettingsIcon className="h-5 w-5 text-slate-600" />
          </div>
          AIRS Platform Settings
        </h1>
        <p className="text-xs text-slate-500 mt-2 max-w-xl">
          Every AIRS setting an HR admin can change, one area per tab. Each change is checked before it is
          saved and recorded in the audit log.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setSearchParams({ tab: value })}>
        <TabsList className="bg-white border border-slate-200 shadow-sm mb-5 p-1 h-auto flex flex-wrap justify-start">
          {TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-none text-slate-500"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <ActiveComponent />
    </div>
  );
}
