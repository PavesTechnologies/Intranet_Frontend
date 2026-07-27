import React, { useEffect, useRef, useState } from "react";
import { UploadCloud, FileArchive, X, CheckCircle2, ChevronRight } from "lucide-react";
import { toast } from "react-toastify";
import Button from "../../../../components/Button/Button";
import { activeCampaigns, bulkUpload } from "../../service/resumeIntake";
import { ACCEPTED_BULK_FILE_TYPES, MAX_BULK_FILE_SIZE_BYTES } from "../constants/resumeIntakeConstants";

function isAcceptedZipFile(file) {
  const name = file.name.toLowerCase();
  return ACCEPTED_BULK_FILE_TYPES.some((ext) => name.endsWith(ext));
}

export default function BulkUploadPanel({ onUploaded, bare = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [campaignId, setCampaignId] = useState("");
  const [campaigns, setCampaigns] = useState([]);
  const [campaignsError, setCampaignsError] = useState("");
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);

  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef(null);

  const isFormValid = Boolean(campaignId && file && consent);

  useEffect(() => {
    const loadCampaigns = async () => {
      setIsLoadingCampaigns(true);
      setCampaignsError("");
      try {
        const res = await activeCampaigns();
        setCampaigns(res?.data || []);
      } catch (err) {
        setCampaignsError("Failed to load campaigns.");
      } finally {
        setIsLoadingCampaigns(false);
      }
    };
    loadCampaigns();
  }, []);

  const handleFile = (candidate) => {
    if (!candidate) return;
    if (!isAcceptedZipFile(candidate)) {
      setFileError(`"${candidate.name}" is not a supported format. Only ZIP archives are accepted.`);
      setFile(null);
      return;
    }
    if (candidate.size > MAX_BULK_FILE_SIZE_BYTES) {
      setFileError(`"${candidate.name}" is larger than the 200MB limit.`);
      setFile(null);
      return;
    }
    setFileError("");
    setFile(candidate);
  };

  const validate = () => {
    const next = {};
    if (!campaignId) next.campaignId = "Select a campaign.";
    if (!file) next.file = "Attach a ZIP archive of resumes.";
    if (!consent) next.consent = "Consent to process the candidates' resumes must be confirmed before upload.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("campaign_id", campaignId);
      formData.append("consent_confirmed", consent);
      formData.append("file", file);

      const res = await bulkUpload(formData);
      toast.success(res?.message || "Bulk upload submitted for parsing.");
      setFile(null);
      setConsent(false);
      setErrors({});
      onUploaded?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to submit bulk upload. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFormBody = () => (
    <>
      <div className={bare ? "space-y-5 pt-3" : "p-6 space-y-5"}>
        <div>
          <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">Campaign <span className="text-red-500">*</span></label>
          <select
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            disabled={isLoadingCampaigns}
            className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:cursor-not-allowed"
          >
            <option value="">
              {isLoadingCampaigns ? "Loading campaigns..." : "Select a campaign..."}
            </option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.campaignId && <p className="text-[11.5px] text-rose-600 mt-1">{errors.campaignId}</p>}
          {campaignsError && <p className="text-[11.5px] text-rose-600 mt-1">{campaignsError}</p>}
        </div>

        <div>
          <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">Resume ZIP file <span className="text-red-500">*</span></label>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFile(e.dataTransfer?.files?.[0]);
            }}
            onClick={() => inputRef.current?.click()}
            className="rounded-xl p-6 border-2 border-dashed text-center cursor-pointer transition-colors"
            style={{ borderColor: isDragging ? "#2563EB" : "#E6E9F0", background: isDragging ? "#DBEAFE" : "#F8FAFC" }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {!file ? (
              <>
                <UploadCloud size={22} className="text-blue-600 mx-auto mb-2" />
                <div className="text-[13px] font-semibold text-slate-900">Drag & drop, or click to browse</div>
                <div className="text-[11.5px] text-slate-500 mt-1">ZIP archives only, up to 200MB</div>
              </>
            ) : (
              <div className="flex items-center justify-between bg-white rounded-lg border border-slate-200 px-3 py-2 text-left">
                <div className="flex items-center gap-2 min-w-0">
                  <FileArchive size={16} className="text-blue-600 shrink-0" />
                  <span className="text-[12.5px] font-medium text-slate-900 truncate">{file.name}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 shrink-0"
                >
                  <X size={15} />
                </button>
              </div>
            )}
          </div>
          {fileError && <p className="text-[11.5px] text-rose-600 mt-1.5">{fileError}</p>}
          {!fileError && errors.file && <p className="text-[11.5px] text-rose-600 mt-1.5">{errors.file}</p>}
        </div>

        <div>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-[12.5px] text-slate-600">
              I confirm consent has been obtained to process and store each candidate's resume in this archive, in line with our data handling policy. <span className="text-red-500">*</span>
            </span>
          </label>
          {errors.consent && <p className="text-[11.5px] text-rose-600 mt-1 ml-6.5">{errors.consent}</p>}
        </div>
      </div>

      <div className={bare ? "flex justify-end gap-2 pt-5 mt-1 border-t border-slate-100" : "px-6 py-4 border-t border-slate-100 flex justify-end gap-2"}>
        <Button
          type="submit"
          variant="primary"
          size="medium"
          disabled={!isFormValid}
          loading={isSubmitting}
          loadingText="Submitting..."
        >
          <CheckCircle2 className="h-4 w-4 mr-1.5" /> Submit for parsing
        </Button>
      </div>
    </>
  );

  if (bare) {
    return (
      <form onSubmit={handleSubmit}>
        {renderFormBody()}
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white shadow-sm mb-6">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center gap-4 px-6 py-5 text-left ${isOpen ? "border-b border-slate-100" : ""}`}
      >
        <ChevronRight
          size={18}
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
        />
        <div>
          <h2 className="text-[15px] font-bold text-slate-900">Bulk Upload</h2>
          <p className="text-[12.5px] text-slate-500 mt-0.5">Upload a ZIP archive of candidate resumes to a campaign for automatic parsing.</p>
        </div>
      </button>

      {isOpen && renderFormBody()}
    </form>
  );
}
