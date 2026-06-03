import React, { useRef, useState } from "react";
import { FileUp, UploadCloud } from "lucide-react";

const UploadDropzone = ({ onFilesSelected, disabled = false, fileName = "" }) => {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = (files) => {
    if (disabled || !files?.length) return;
    const file = files[0];
    onFilesSelected(file);
  };

  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault();
        if (disabled) return;
        setDragActive(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        event.preventDefault();
        setDragActive(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragActive(false);
        if (disabled) return;
        handleFiles(event.dataTransfer.files);
      }}
      className={`rounded-[24px] border-2 border-dashed p-8 text-center transition ${
        disabled
          ? "border-slate-200 bg-slate-100 opacity-70"
          : dragActive
          ? "border-indigo-400 bg-indigo-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <UploadCloud className="mx-auto h-10 w-10 text-indigo-500" />
      <p className="mt-4 text-sm font-semibold text-slate-900">
        {fileName || "Drag and drop your skill sheet here"}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Accepted columns: Category Name, Category Description, Category Active,
        Skill Name, Skill Description, Skill Active, SubSkill Name, SubSkill
        Description, SubSkill Active
      </p>
      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        >
          <FileUp className="h-4 w-4" />
          Browse File
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        disabled={disabled}
        className="hidden"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
};

export default UploadDropzone;
