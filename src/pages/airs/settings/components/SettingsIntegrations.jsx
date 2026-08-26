import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { CheckCircle2 } from "lucide-react";
import Button from "@/components/Button/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import { getMicrosoftStatus, connectMicrosoft, getGoogleStatus, connectGoogle } from "../services/oauthService";

const PROVIDERS = [
  { key: "microsoft", label: "Microsoft Calendar", getStatus: getMicrosoftStatus, connect: connectMicrosoft },
  { key: "google", label: "Google Calendar", getStatus: getGoogleStatus, connect: connectGoogle },
];

// Whether Teams/Meet meeting links get generated automatically when
// scheduling an interview (see InterviewScheduleModal.jsx's platform note)
// depends on these being connected. A low-traffic settings page — plain
// fetch-on-mount is enough, no need for a cache to invalidate.
export default function SettingsIntegrations() {
  const [status, setStatus] = useState({ microsoft: null, google: null }); // null = still loading
  const [connectingKey, setConnectingKey] = useState(null);

  useEffect(() => {
    PROVIDERS.forEach(async (provider) => {
      try {
        const connected = await provider.getStatus();
        setStatus((s) => ({ ...s, [provider.key]: connected }));
      } catch {
        setStatus((s) => ({ ...s, [provider.key]: false }));
      }
    });
  }, []);

  const handleConnect = async (provider) => {
    setConnectingKey(provider.key);
    try {
      const authUrl = await provider.connect();
      if (!authUrl) throw new Error("No auth URL returned");
      window.location.href = authUrl;
    } catch {
      toast.error(`Couldn't start the ${provider.label} connection. Please try again.`);
      setConnectingKey(null);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <div className="font-bold text-[14px] text-slate-900 mb-1">Calendar integrations</div>
      <p className="text-[11px] text-slate-400 mb-2">
        Connect a calendar provider so scheduled interviews get a real Teams/Meet link automatically.
      </p>

      <div className="divide-y divide-slate-100">
        {PROVIDERS.map((provider) => (
          <div key={provider.key} className="flex items-center justify-between py-3">
            <span className="text-[13px] font-semibold text-slate-900">{provider.label}</span>

            {status[provider.key] === null ? (
              <LoadingSpinner size="sm" text="" />
            ) : status[provider.key] ? (
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-600">
                <CheckCircle2 size={15} /> Connected
              </span>
            ) : (
              <Button
                variant="outline"
                size="small"
                onClick={() => handleConnect(provider)}
                loading={connectingKey === provider.key}
                loadingText="Redirecting..."
              >
                Connect {provider.label}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
