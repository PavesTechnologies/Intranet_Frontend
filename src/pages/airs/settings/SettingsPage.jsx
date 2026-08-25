import React, { useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Settings as SettingsIcon } from "lucide-react";
import Button from "../../../components/Button/Button";
import useAirsSettings from "./hooks/useAirsSettings";
import SettingsSystemInfo from "./components/SettingsSystemInfo";
import SettingsWeightConfig from "./components/SettingsWeightConfig";
import SettingsToggles from "./components/SettingsToggles";
import SettingsIntegrations from "./components/SettingsIntegrations";

const PROVIDER_LABEL = { microsoft: "Microsoft Calendar", google: "Google Calendar" };

export default function SettingsPage() {
  const { settings, setField, isDirty, save, reset } = useAirsSettings();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

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

    navigate(location.pathname, { replace: true });
    // Deliberately mount-only — this reads whatever the URL was redirected
    // in with, not anything that should re-run as the user navigates the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <div className="p-2 bg-white rounded-lg border border-slate-200">
              <SettingsIcon className="h-5 w-5 text-slate-600" />
            </div>
            AIRS Platform Settings
          </h1>
          <p className="text-xs text-slate-500 mt-2 max-w-xl">
            Configure canonical mappings, customize weight coefficients, manage OCR engines, and check compliance.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="small" onClick={reset}>
            Reset to defaults
          </Button>
          <Button variant="primary" size="small" onClick={save} disabled={!isDirty}>
            Save changes
          </Button>
        </div>
      </div>

      <SettingsSystemInfo />

      <div className="grid md:grid-cols-2 gap-5">
        <SettingsWeightConfig />
        <SettingsToggles settings={settings} onChange={setField} />
      </div>

      <div className="mt-5">
        <SettingsIntegrations />
      </div>
    </div>
  );
}
