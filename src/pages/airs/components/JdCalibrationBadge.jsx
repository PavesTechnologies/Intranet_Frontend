import { Badge } from "../../../components/ui/badge";

// JD readiness: calibration (HR_ADMIN reviewed the scoring inputs) is the main
// status; verification (every extracted skill is in the catalogue) is a detail.
const VERIFICATION_DETAIL = {
  VERIFIED: "Unknown skills resolved",
  PARTIALLY_VERIFIED: "Unknown skills pending",
  NOT_VERIFIED: "Skills not processed yet",
};

export default function JdCalibrationBadge({ calibrationStatus, calibrationVersion, verificationStatus, compact = false }) {
  const calibrated = String(calibrationStatus || "").toUpperCase() === "CALIBRATED";
  const verification = VERIFICATION_DETAIL[String(verificationStatus || "").toUpperCase()];
  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <Badge
        className={`font-semibold px-2.5 py-1 text-xs ${calibrated
          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
          : "bg-amber-50 text-amber-700 border-amber-100"}`}
        title={calibrated ? "An HR admin calibrated this JD's scoring inputs." : "An HR admin must calibrate this JD before a campaign can use it."}
      >
        {calibrated ? `Calibrated${calibrationVersion ? ` · v${calibrationVersion}` : ""}` : "Not calibrated"}
      </Badge>
      {!compact && verification && <span className="text-[10px] text-slate-500 font-medium">{verification}</span>}
    </span>
  );
}
