import React, { useRef, useState } from "react";
import { UploadCloud, FileText, X, CheckCircle2 } from "lucide-react";
import Button from "../../../../../components/Button/Button";
import { Input } from "../../../../../components/ui/input";
import { MOCK_CAMPAIGNS } from "../mock/intakeMockData";
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE_BYTES } from "../constants/intakeConstants";

const EMPTY_FORM = { campaignId: "", candidateName: "", candidateEmail: "", candidatePhone: "" };

function isAcceptedFile(file) {
  const name = file.name.toLowerCase();
  return ACCEPTED_FILE_TYPES.some((ext) => name.endsWith(ext));
}

export default function UploadStep({ onSubmit }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleFile = (candidate) => {
    if (!candidate) return;
    if (!isAcceptedFile(candidate)) {
      setFileError(`"${candidate.name}" is not a supported format. Only PDF and DOCX files are accepted.`);
      setFile(null);
      return;
    }
    if (candidate.size > MAX_FILE_SIZE_BYTES) {
      setFileError(`"${candidate.name}" is larger than the 15MB limit.`);
      setFile(null);
      return;
    }
    setFileError("");
    setFile(candidate);
  };

  const validate = () => {
    const next = {};
    if (!form.campaignId) next.campaignId = "Select a campaign.";
    if (!form.candidateName.trim()) next.candidateName = "Candidate name is required.";
    if (!form.candidateEmail.trim()) next.candidateEmail = "Candidate email is required.";
    else if (!/^\S+@\S+\.\S+$/.test(form.candidateEmail)) next.candidateEmail = "Enter a valid email address.";
    if (!file) next.file = "Attach a PDF or DOCX resume.";
    if (!consent) next.consent = "Candidate consent must be confirmed before upload.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ ...form, fileName: file.name, fileFormat: file.name.toLowerCase().endsWith(".docx") ? "DOCX" : "PDF" });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-[15px] font-bold text-slate-900">New resume intake</h2>
          <p className="text-[12.5px] text-slate-500 mt-0.5">Upload a candidate resume to start automatic parsing and skill extraction.</p>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">Campaign</label>
            <select
              value={form.campaignId}
              onChange={setField("campaignId")}
              className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a campaign...</option>
              {MOCK_CAMPAIGNS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.campaignId && <p className="text-[11.5px] text-rose-600 mt-1">{errors.campaignId}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">Candidate full name</label>
              <Input value={form.candidateName} onChange={setField("candidateName")} placeholder="e.g. Ananya Rao" />
              {errors.candidateName && <p className="text-[11.5px] text-rose-600 mt-1">{errors.candidateName}</p>}
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">Candidate email</label>
              <Input type="email" value={form.candidateEmail} onChange={setField("candidateEmail")} placeholder="candidate@example.com" />
              {errors.candidateEmail && <p className="text-[11.5px] text-rose-600 mt-1">{errors.candidateEmail}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">
                Candidate phone <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <Input value={form.candidatePhone} onChange={setField("candidatePhone")} placeholder="+1 555 000 1234" />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">Resume file</label>
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
                accept=".pdf,.docx"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              {!file ? (
                <>
                  <UploadCloud size={22} className="text-blue-600 mx-auto mb-2" />
                  <div className="text-[13px] font-semibold text-slate-900">Drag & drop, or click to browse</div>
                  <div className="text-[11.5px] text-slate-500 mt-1">PDF or DOCX only, up to 15MB</div>
                </>
              ) : (
                <div className="flex items-center justify-between bg-white rounded-lg border border-slate-200 px-3 py-2 text-left">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={16} className="text-blue-600 shrink-0" />
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
                I confirm the candidate has consented to their resume being processed and stored, in line with our data handling policy.
              </span>
            </label>
            {errors.consent && <p className="text-[11.5px] text-rose-600 mt-1 ml-6.5">{errors.consent}</p>}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <Button type="submit" variant="primary" size="medium">
            <CheckCircle2 className="h-4 w-4 mr-1.5" /> Submit for parsing
          </Button>
        </div>
      </div>
    </form>
  );
}
