import React, { useState } from "react";
import { toast } from "react-toastify";
import Button from "../../../../components/Button/Button";
import { exportDsar } from "../../campaigns/services/exportService";

/**
 * Data Subject Access Request.
 * The email is sent once to compute the lookup hash server-side and is never
 * stored, so this form deliberately keeps no history of what was searched and
 * clears itself after a successful export.
 */
export default function DsarPanel() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const value = email.trim();
    if (!value || !value.includes("@")) {
      toast.error("Enter the candidate's email address.");
      return;
    }
    setBusy(true);
    try {
      await exportDsar(value);
      setEmail("");
      toast.success("DSAR report downloaded.");
    } catch (err) {
      const status = err?.response?.status;
      toast.error(
        status === 404
          ? "No candidate found for that email address."
          : err?.response?.data?.message || "Could not generate the report.",
      );
    } finally {
      setBusy(false);
    }
  };

  // Card and title come from the surrounding CollapsibleSection.
  return (
    <div className="pt-3">
      <p className="text-[11px] text-slate-500 mb-3">
        Produces every record held about one candidate across all campaigns — profile,
        resumes, applications, extracted skills and consent history. The email address is
        used only to locate the record and is never stored.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="candidate@example.com"
          className="flex-1 min-w-[220px] px-3 py-2 border border-slate-200 rounded-lg text-xs
                     focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <Button variant="primary" size="small" onClick={submit}
          loading={busy} loadingText="Generating...">
          Generate report
        </Button>
      </div>
    </div>
  );
}
