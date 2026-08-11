import React, { useState } from "react";
import { toast } from "react-toastify";
import { FileText, Download, GitCompare, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Button from "@/components/Button/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorState from "@/pages/airs/skill-ontology/components/ErrorState";
import { getResumeDownloadUrl, compareResumeVersions } from "../../../service/resumeIntake";
import { formatApiError } from "../../../campaigns/services/campaignservice";
import useResumeVersions from "../../hooks/useResumeVersions";
import ResumeCompareModal from "../components/ResumeCompareModal";

const PARSE_STATUS_TONE = {
  PARSED: "bg-emerald-50 text-emerald-700",
  PARSING: "bg-indigo-50 text-indigo-700",
  PENDING: "bg-slate-100 text-slate-600",
  FAILED: "bg-rose-50 text-rose-700",
};

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");

const fmtConfidence = (c) => {
  if (c == null) return null;
  const pct = c <= 1 ? c * 100 : c;
  return `${Math.round(pct)}%`;
};

// A resume version's identifier isn't in the task's display-field list (that
// list is what to SHOW, not the full row shape) — every version is backed
// by its own resume row, so resume_id/id is read defensively here since
// download and compare both key off it.
const resumeIdOf = (v) => v.resume_id ?? v.id;

// Resume Versions tab — one card per version, mirroring the same
// bordered-card-row pattern already used for Bulk Uploads
// (CampaignDetails.jsx's UploadsTab): icon + title + status badge on top,
// meta line below, actions on the right. Backed by the real
// GET /resumes/candidate/{candidate_id}/versions API; selection/compare
// stays purely a display concern — no scoring or active-version logic here.
export default function ResumeVersionsTab({ candidateId }) {
  const { versions, loading, error, refetch } = useResumeVersions(candidateId);

  const [selectedIds, setSelectedIds] = useState([]);
  const [downloadingId, setDownloadingId] = useState(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState(null);
  const [compareData, setCompareData] = useState(null);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) {
        toast.info("You can only select 2 resume versions to compare — deselect one first.");
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleDownload = async (resumeId) => {
    setDownloadingId(resumeId);
    try {
      const response = await getResumeDownloadUrl(resumeId);
      const data = response?.data ?? response;
      const url = data?.download_url || data?.url || data?.signed_url;
      if (!url) throw new Error("No download URL returned by the server.");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(formatApiError(err, "Failed to get the resume download link."));
    } finally {
      setDownloadingId(null);
    }
  };

  const runCompare = async () => {
    if (selectedIds.length !== 2) return;
    setCompareOpen(true);
    setCompareLoading(true);
    setCompareError(null);
    try {
      const response = await compareResumeVersions(selectedIds[0], selectedIds[1]);
      setCompareData(response?.data ?? response);
    } catch (err) {
      setCompareError(err);
      toast.error(formatApiError(err, "Failed to compare the selected resume versions."));
    } finally {
      setCompareLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <LoadingSpinner text="Loading resume versions..." />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Couldn't load resume versions"
        message="Something went wrong while loading this candidate's resume history. Please try again."
        onRetry={refetch}
      />
    );
  }

  if (versions.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm text-center">
        <p className="text-xs font-bold text-slate-700">No resume versions yet</p>
        <p className="text-[11px] text-slate-400 mt-1">Uploaded resumes for this candidate will appear here.</p>
      </div>
    );
  }

  const selectedVersions = versions.filter((v) => selectedIds.includes(resumeIdOf(v)));

  return (
    <div className="space-y-2">
      {versions.map((v, i) => {
        const id = resumeIdOf(v);
        const isSelected = selectedIds.includes(id);
        const confidence = fmtConfidence(v.parse_confidence);
        const campaigns = v.campaigns || [];

        return (
          <div
            key={id ?? i}
            className={`bg-white border rounded-xl p-3.5 shadow-sm transition-colors ${
              isSelected ? "border-indigo-300 ring-1 ring-indigo-100" : "border-slate-200"
            }`}
          >
            <div className="flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="text-[12.5px] font-bold text-slate-900">Version {v.version_number}</span>
                {i === 0 && (
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-bold px-2 py-0.5 text-[10px]">Latest</Badge>
                )}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-slate-100 text-slate-600">
                  {v.file_format}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${PARSE_STATUS_TONE[v.parse_status] || "bg-slate-100 text-slate-600"}`}>
                  {v.parse_status}
                </span>
                {confidence && <span className="text-[10.5px] text-slate-400">Confidence: {confidence}</span>}
              </div>
              <span className="text-[10px] text-slate-400">
                Uploaded by {v.uploaded_by || "Unknown"} · {fmtDate(v.created_at)}
              </span>
            </div>

            <div className="mt-2 text-[11px] text-slate-500">
              {campaigns.length === 0 ? (
                <span className="text-slate-400">Not used in any campaign</span>
              ) : (
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {campaigns.map((c, j) => (
                    <span key={j}>
                      Used in: <span className="font-semibold text-slate-700">{c.campaign_name}</span>
                      {c.pipeline_stage ? ` — ${c.pipeline_stage}` : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mt-2.5">
              <Button
                variant="outline"
                size="small"
                loading={downloadingId === id}
                loadingText="Preparing..."
                onClick={() => handleDownload(id)}
              >
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
              <Button
                variant={isSelected ? "primary" : "outline"}
                size="small"
                onClick={() => toggleSelect(id)}
              >
                {isSelected && <Check className="h-3.5 w-3.5" />} {isSelected ? "Selected" : "Select to Compare"}
              </Button>
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] text-slate-400">{selectedIds.length}/2 versions selected</span>
        <Button variant="primary" size="small" disabled={selectedIds.length !== 2} onClick={runCompare}>
          <GitCompare className="h-3.5 w-3.5" /> Compare Versions
        </Button>
      </div>

      <ResumeCompareModal
        isOpen={compareOpen}
        onClose={() => setCompareOpen(false)}
        loading={compareLoading}
        error={compareError}
        data={compareData}
        versionA={selectedVersions[0]}
        versionB={selectedVersions[1]}
        onRetry={runCompare}
      />
    </div>
  );
}
