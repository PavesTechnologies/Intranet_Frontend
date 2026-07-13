import React, { useState } from "react";
import { UploadCloud, Upload, Layers } from "lucide-react";
import Button from "../../../../components/Button/Button";

export default function ResumeUploadDropzone({ onUploadFile, onUploadZip }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer?.files || []);
    if (dropped.length === 0) return;
    dropped.slice(0, 5).forEach((file) => {
      if (file.name.toLowerCase().endsWith(".zip")) onUploadZip();
      else onUploadFile();
    });
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
      <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center mx-auto mb-3 shadow-sm">
        <UploadCloud size={24} className="text-blue-600" />
      </div>
      <div className="font-bold text-[14px] text-slate-900">Drag & drop resumes or ZIP archives</div>
      <div className="text-[12.5px] mt-1 mb-4 text-slate-500">
        Supports PDF, DOCX, and ZIP up to 500MB · Duplicate detection runs automatically
      </div>
      <div className="flex justify-center gap-2">
        <Button variant="primary" size="small" onClick={onUploadFile}>
          <Upload className="h-4 w-4 mr-1.5" /> Browse files
        </Button>
        <Button variant="ghost" size="small" onClick={onUploadZip}>
          <Layers className="h-4 w-4 mr-1.5" /> Bulk ZIP upload
        </Button>
      </div>
    </div>
  );
}
