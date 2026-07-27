import React, { useState, useEffect } from "react";
import { useAirsStore } from "./airsStore";
import { getJDById, updateJDById, updateJDFromFile, createJD, createJDFromFile, viewJDFile } from "../service/jdservice";
import {
  FileText,
  FileUp,
  Upload,
  Eye,
  Loader2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import Button from "../../../components/Button/Button";
import CountriesList from "../../../components/CountriesList";

const JURISDICTIONS = ["USA", "EU", "India", "UK", "Global"];

const FormField = ({ label, required, error, className = "", children }) => (
  <div className={className}>
    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {error && <p className="text-red-500 text-[11px] mt-1 font-medium">{error}</p>}
  </div>
);

export default function JdForm({ editId, onSuccess, onCancel }) {
  const { addJd, updateJd } = useAirsStore();
  const isEditMode = !!editId;

  const [jdInputType, setJdInputType] = useState("text"); // 'text' | 'file'

  const [title, setTitle] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [minExperienceYears, setMinExperienceYears] = useState("");
  const [maxExperienceYears, setMaxExperienceYears] = useState("");
  const [noticePeriod, setNoticePeriod] = useState("");
  const [educationDegree, setEducationDegree] = useState("");
  const [educationField, setEducationField] = useState("");
  const [rawText, setRawText] = useState("");
  const [originalRawText, setOriginalRawText] = useState("");

  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [replacingFile, setReplacingFile] = useState(false);
  const [existingFile, setExistingFile] = useState(null); // { url, name }
  const [isLoadingExistingFile, setIsLoadingExistingFile] = useState(false);
  const [existingFileError, setExistingFileError] = useState(false);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadExistingFile = async (jdId) => {
    setIsLoadingExistingFile(true);
    setExistingFileError(false);
    try {
      const res = await viewJDFile(jdId);
      const blob = new Blob([res.data], { type: res.headers["content-type"] });
      const url = URL.createObjectURL(blob);
      let filename = "job-description";
      const disposition = res.headers["content-disposition"];
      if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }
      setExistingFile({ url, name: filename });
    } catch (err) {
      setExistingFileError(true);
    } finally {
      setIsLoadingExistingFile(false);
    }
  };

  useEffect(() => {
    if (editId) {
      const fetchJd = async () => {
        try {
          const res = await getJDById(editId);
          const data = res.data;
          if (data) {
            setTitle(data.title || "");
            setJurisdiction(data.jurisdiction || "");
            setMinExperienceYears(
              data.min_experience_years !== null && data.min_experience_years !== undefined
                ? String(data.min_experience_years)
                : ""
            );
            setMaxExperienceYears(
              data.max_experience_years !== null && data.max_experience_years !== undefined
                ? String(data.max_experience_years)
                : ""
            );
            setNoticePeriod(
              data.notice_period !== null && data.notice_period !== undefined
                ? String(data.notice_period)
                : ""
            );
            setEducationDegree(data.education_criteria?.degree || "");
            setEducationField(data.education_criteria?.field || "");
            const loadedRawText = data.rawText || data.raw_text || "";
            setRawText(loadedRawText);
            setOriginalRawText(loadedRawText);
            const resolvedType =
              data.source_format === "PDF" || data.source_format === "DOCX" ? "file" : "text";
            setJdInputType(resolvedType);
            if (resolvedType === "file") {
              loadExistingFile(editId);
            }
          }
        } catch (err) {
          toast.error("Failed to load Job Description details for editing.");
        }
      };
      fetchJd();
    }
  }, [editId]);

  useEffect(() => {
    return () => {
      if (existingFile?.url) URL.revokeObjectURL(existingFile.url);
    };
  }, [existingFile]);

  const clearError = (field) => {
    setErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleFileSelected = (file) => {
    const validExtensions = ["pdf", "docx", "txt", "jpeg", "jpg"];
    const ext = file.name.split(".").pop().toLowerCase();

    if (!validExtensions.includes(ext)) {
      toast.error("Invalid file format. Allowed formats: DOCX, TXT, PDF, JPEG.");
      return;
    }

    const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size exceeds the 3MB limit. Please upload a smaller file.");
      return;
    }

    setUploadedFile(file);
    clearError("uploadedFile");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!title.trim()) newErrors.title = "Job title is required.";
    if (!jurisdiction) newErrors.jurisdiction = "Jurisdiction is required.";
    if (minExperienceYears === "") newErrors.minExperienceYears = "Minimum experience is required.";
    if (maxExperienceYears === "") newErrors.maxExperienceYears = "Maximum experience is required.";
    if (noticePeriod === "") newErrors.noticePeriod = "Notice period is required.";
    if (!educationDegree.trim()) newErrors.educationDegree = "Education degree is required.";
    if (!educationField.trim()) newErrors.educationField = "Education field is required.";

    if (minExperienceYears !== "" && Number(minExperienceYears) < 0) {
      newErrors.minExperienceYears = "Minimum experience cannot be negative.";
    }
    if (maxExperienceYears !== "" && Number(maxExperienceYears) < 0) {
      newErrors.maxExperienceYears = "Maximum experience cannot be negative.";
    }
    if (
      minExperienceYears !== "" &&
      maxExperienceYears !== "" &&
      Number(maxExperienceYears) < Number(minExperienceYears)
    ) {
      newErrors.maxExperienceYears = "Max experience must be greater than or equal to min experience.";
    }
    if (noticePeriod !== "" && Number(noticePeriod) < 0) {
      newErrors.noticePeriod = "Notice period cannot be negative.";
    }

    if (jdInputType === "text" && !rawText.trim()) {
      newErrors.rawText = "Please enter the job description text.";
    }
    if (jdInputType === "file" && !uploadedFile && !isEditMode) {
      newErrors.uploadedFile = "Please upload a job description file (DOCX, TXT, PDF, JPEG).";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildPayload = () => {
    const payload = {
      title: title.trim(),
      jurisdiction: jurisdiction || undefined,
      min_experience_years: minExperienceYears !== "" ? Number(minExperienceYears) : undefined,
      max_experience_years: maxExperienceYears !== "" ? Number(maxExperienceYears) : undefined,
      notice_period: noticePeriod !== "" ? Number(noticePeriod) : undefined,
      education_criteria: {
        degree: educationDegree || undefined,
        field: educationField || undefined,
      },
    };

    if (jdInputType === "text") {
      // Metadata-only update: omit raw_text so the backend doesn't requeue reprocessing.
      const textChanged = !isEditMode || rawText !== originalRawText;
      if (textChanged) {
        payload.raw_text = rawText;
      }
    }

    return payload;
  };

  const buildMultipartFields = () => ({
    title: title.trim(),
    jurisdiction: jurisdiction || undefined,
    min_experience_years: minExperienceYears !== "" ? Number(minExperienceYears) : undefined,
    max_experience_years: maxExperienceYears !== "" ? Number(maxExperienceYears) : undefined,
    notice_period: noticePeriod !== "" ? Number(noticePeriod) : undefined,
    education_degree: educationDegree || undefined,
    education_field: educationField || undefined,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode) {
        const isNewFileSelected = jdInputType === "file" && replacingFile && uploadedFile;
        const res = isNewFileSelected
          ? await updateJDFromFile(editId, uploadedFile, buildMultipartFields())
          : await updateJDById(editId, buildPayload());

        const queuedForProcessing = !!res?.data?.task_id;
        if (!queuedForProcessing) {
          updateJd(editId, { title, jurisdiction, rawText });
        }
        toast.success(
          res?.message ||
          (queuedForProcessing
            ? "Job Description update submitted for reprocessing."
            : "Job Description updated successfully!")
        );
        onSuccess?.({ queuedForProcessing });
      } else {
        const payload = buildPayload();
        const res = jdInputType === "file"
          ? await createJDFromFile(uploadedFile, payload)
          : await createJD(payload);
        if (res?.data) {
          addJd(res.data);
        }
        toast.success(res?.message || "Job Description created successfully!");
        onSuccess?.({ queuedForProcessing: true });
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
        (isEditMode ? "Failed to save changes to the database." : "Failed to create Job Description.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-1.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
        <FormField label="Job Title" required error={errors.title} className="sm:col-span-2">
          <input
            type="text"
            placeholder="e.g. Senior Frontend Architect"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              clearError("title");
            }}
            className={`w-full px-3 py-2 border rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${errors.title ? "border-red-500 ring-1 ring-red-500" : "border-slate-200"
              }`}
          />
        </FormField>

        <FormField label="Region (Jurisdiction)" required error={errors.jurisdiction}>
          {/* <select
            value={jurisdiction}
            onChange={(e) => {
              setJurisdiction(e.target.value);
              clearError("jurisdiction");
            }}
            className={`w-full px-3 py-2 border rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${errors.jurisdiction ? "border-red-500 ring-1 ring-red-500" : "border-slate-200"
              }`}
          >
            <option value="">Select region</option>
            {JURISDICTIONS.map((j) => (
              <option key={j} value={j}>{j}</option>
            ))}
          </select> */}
          <CountriesList
            value={jurisdiction}
            onChange={(value) => {
              setJurisdiction(value);
              clearError("jurisdiction");
            }}
            placeholder="Select Region"
            // label="Region (Jurisdiction)"
            required
            error={errors.jurisdiction}
          />
        </FormField>

        <FormField label="Notice Period (Days)" required error={errors.noticePeriod}>
          <input
            type="number"
            min="0"
            placeholder="e.g. 30"
            value={noticePeriod}
            onChange={(e) => {
              setNoticePeriod(e.target.value);
              clearError("noticePeriod");
            }}
            className={`w-full px-3 py-2 border rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${errors.noticePeriod ? "border-red-500 ring-1 ring-red-500" : "border-slate-200"
              }`}
          />
        </FormField>

        <FormField label="Min Experience (Years)" required error={errors.minExperienceYears}>
          <input
            type="number"
            min="0"
            placeholder="e.g. 3"
            value={minExperienceYears}
            onChange={(e) => {
              setMinExperienceYears(e.target.value);
              clearError("minExperienceYears");
              clearError("maxExperienceYears");
            }}
            className={`w-full px-3 py-2 border rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${errors.minExperienceYears ? "border-red-500 ring-1 ring-red-500" : "border-slate-200"
              }`}
          />
        </FormField>

        <FormField label="Max Experience (Years)" required error={errors.maxExperienceYears}>
          <input
            type="number"
            min="0"
            placeholder="e.g. 5"
            value={maxExperienceYears}
            onChange={(e) => {
              setMaxExperienceYears(e.target.value);
              clearError("maxExperienceYears");
            }}
            className={`w-full px-3 py-2 border rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${errors.maxExperienceYears ? "border-red-500 ring-1 ring-red-500" : "border-slate-200"
              }`}
          />
        </FormField>

        <FormField label="Education Degree" required error={errors.educationDegree}>
          <input
            type="text"
            placeholder="e.g. Bachelor's Degree"
            value={educationDegree}
            onChange={(e) => {
              setEducationDegree(e.target.value);
              clearError("educationDegree");
            }}
            className={`w-full px-3 py-2 border rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${errors.educationDegree ? "border-red-500 ring-1 ring-red-500" : "border-slate-200"
              }`}
          />
        </FormField>

        <FormField label="Education Field" required error={errors.educationField}>
          <input
            type="text"
            placeholder="e.g. Computer Science"
            value={educationField}
            onChange={(e) => {
              setEducationField(e.target.value);
              clearError("educationField");
            }}
            className={`w-full px-3 py-2 border rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${errors.educationField ? "border-red-500 ring-1 ring-red-500" : "border-slate-200"
              }`}
          />
        </FormField>
      </div>

      <div className="border-t border-slate-150 mt-6 pt-6">
        {!isEditMode && (
          <>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-2">
              JD Input Type <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3 mb-4">
              <button
                type="button"
                onClick={() => {
                  setJdInputType("text");
                  clearError("uploadedFile");
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border transition ${jdInputType === "text"
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
              >
                <FileText className="h-4 w-4" /> Paste Text
              </button>
              <button
                type="button"
                onClick={() => {
                  setJdInputType("file");
                  clearError("rawText");
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border transition ${jdInputType === "file"
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
              >
                <FileUp className="h-4 w-4" /> Upload File
              </button>
            </div>
          </>
        )}

        {jdInputType === "text" && (
          <FormField label="Job Description Text" required error={errors.rawText}>
            <textarea
              rows="8"
              placeholder="Paste the full job description details, responsibilities, and required core skills..."
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                clearError("rawText");
              }}
              className={`w-full px-3 py-2 border rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition font-sans ${errors.rawText ? "border-red-500 ring-1 ring-red-500" : "border-slate-200"
                }`}
            />
          </FormField>
        )}

        {jdInputType === "file" && (
          <FormField label="Job Description File" required={!isEditMode} error={errors.uploadedFile}>
            {isEditMode && !replacingFile ? (
              <div className="border border-slate-200 rounded-xl p-4">
                {isLoadingExistingFile ? (
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading existing document...
                  </div>
                ) : existingFileError ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-rose-600">Unable to load the existing document.</span>
                    <button
                      type="button"
                      onClick={() => setReplacingFile(true)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex-shrink-0"
                    >
                      Upload New File
                    </button>
                  </div>
                ) : existingFile ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <span className="text-xs font-bold text-slate-800 truncate">{existingFile.name}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <a
                        href={existingFile.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </a>
                      <button
                        type="button"
                        onClick={() => setReplacingFile(true)}
                        className="text-xs font-bold text-slate-500 hover:text-slate-700"
                      >
                        Replace
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                {isEditMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setReplacingFile(false);
                      setUploadedFile(null);
                      clearError("uploadedFile");
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700 mb-2 inline-block"
                  >
                    &larr; Keep current file
                  </button>
                )}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition ${dragActive
                    ? "border-blue-500 bg-blue-50/50"
                    : errors.uploadedFile
                      ? "border-red-400 bg-red-50/30"
                      : "border-slate-300 hover:border-blue-400 bg-slate-50/50"
                    }`}
                >
                  {uploadedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <span className="text-xs font-bold text-slate-800">{uploadedFile.name}</span>
                      <button
                        type="button"
                        onClick={() => setUploadedFile(null)}
                        className="p-1 bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-500 rounded transition"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="max-w-xs mx-auto">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                        <Upload className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-800">Drag & drop your file here</p>
                      <p className="text-[11px] text-slate-400 mt-1">Supports DOCX, TXT, PDF, JPEG formats up to 3MB</p>
                      <div className="relative mt-3">
                        <input
                          type="file"
                          id="jd-file-upload-input"
                          className="hidden"
                          onChange={handleFileInput}
                          accept=".docx,.txt,.pdf,.jpeg,.jpg"
                        />
                        <label
                          htmlFor="jd-file-upload-input"
                          className="inline-block px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm transition"
                        >
                          Choose Local File
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </FormField>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-6 mt-2 border-t border-slate-150">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
        >
          Cancel
        </button>
        <Button type="submit" variant="primary" size="medium" disabled={isSubmitting} loading={isSubmitting}>
          {isEditMode ? "Update Job Description" : "Create Job Description"}
        </Button>
      </div>
    </form>
  );
}
