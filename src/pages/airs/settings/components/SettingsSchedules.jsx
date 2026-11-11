import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { CalendarClock } from "lucide-react";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { getSchedules } from "../services/settingsService";
import { apiErrorMessage } from "../services/aiProviderService";

// Settings phase 1: the scheduled background jobs, read-only (changing when they run needs a deploy).
export default function SettingsSchedules() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getSchedules().then(setData).catch((error) => {
      toast.error(apiErrorMessage(error, "Couldn't load the schedules."));
      setData({ jobs: [] });
    });
  }, []);

  if (!data) return <LoadingSpinner text="Loading schedules..." />;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-slate-500" /> Scheduled jobs
      </h2>
      <p className="text-[11px] text-slate-500 mt-1 max-w-2xl">
        Background jobs and when they run{data.timezone ? ` (times in ${data.timezone})` : ""}. Read-only: what
        these jobs check is set on the General tab; when they run is part of the deployment. {data.note}
      </p>
      <table className="w-full mt-4 text-xs">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
            <th className="py-1.5 pr-3 font-semibold">Job</th>
            <th className="py-1.5 font-semibold">Runs</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.jobs.map((job) => (
            <tr key={job.name}>
              <td className="py-1.5 pr-3 font-semibold text-slate-800">{job.label}</td>
              <td className="py-1.5 text-slate-600">{job.when}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
