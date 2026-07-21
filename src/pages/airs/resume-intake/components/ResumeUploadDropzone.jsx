import React, { useRef, useState } from "react";
import { toast } from "react-toastify";
import { UploadCloud, Upload, Layers } from "lucide-react";
import Button from "../../../../components/Button/Button";

const RESUME_ACCEPT = ".pdf,.docx";
const ZIP_ACCEPT = ".zip";

function isResumeFile(file) {
  const name = file.name.toLowerCase();
  return name.endsWith(".pdf") || name.endsWith(".docx");
}

export default function ResumeUploadDropzone({ onUploadFile, onUploadZip }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const zipInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer?.files || []);
    if (dropped.length === 0) return;
    dropped.slice(0, 5).forEach((file) => {
      const name = file.name.toLowerCase();
      if (name.endsWith(".zip")) onUploadZip(file);
      else if (isResumeFile(file)) onUploadFile(file);
      else toast.error(`"${file.name}" is not a supported format. Only PDF, DOCX, and ZIP files are accepted.`);
    });
  };

  const handleFileInputChange = (e) => {
    const selected = Array.from(e.target.files || []);
    selected.forEach((file) => {
      if (isResumeFile(file)) onUploadFile(file);
      else toast.error(`"${file.name}" is not a supported format. Only PDF and DOCX files are accepted.`);
    });
    e.target.value = "";
  };

  const handleZipInputChange = (e) => {
    const selected = Array.from(e.target.files || []);
    selected.forEach((file) => {
      if (file.name.toLowerCase().endsWith(".zip")) onUploadZip(file);
      else toast.error(`"${file.name}" is not a supported format. Only ZIP archives are accepted.`);
    });
    e.target.value = "";
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className="rounded-xl p-8 border-2 border-dashed text-center transition-colors"
      style={{ borderColor: isDragging ? "#2563EB" : "#E6E9F0", background: isDragging ? "#DBEAFE" : "#EAF0FD" }}
    >
      <input ref={fileInputRef} type="file" accept={RESUME_ACCEPT} multiple hidden onChange={handleFileInputChange} />
      <input ref={zipInputRef} type="file" accept={ZIP_ACCEPT} hidden onChange={handleZipInputChange} />

      <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center mx-auto mb-3 shadow-sm">
        <UploadCloud size={24} className="text-blue-600" />
      </div>
      <div className="font-bold text-[14px] text-slate-900">Drag & drop resumes or ZIP archives</div>
      <div className="text-[12.5px] mt-1 mb-4 text-slate-500">
        Supports PDF, DOCX, and ZIP up to 500MB · Duplicate detection runs automatically
      </div>
      <div className="flex justify-center gap-2">
        <Button variant="primary" size="small" onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4 mr-1.5" /> Browse files
        </Button>
        <Button variant="ghost" size="small" onClick={() => zipInputRef.current?.click()}>
          <Layers className="h-4 w-4 mr-1.5" /> Bulk ZIP upload
        </Button>
      </div>
    </div>
  );
}
