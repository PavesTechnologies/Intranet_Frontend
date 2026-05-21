import React, { useRef, useState } from "react";
import { FileUp, UploadCloud } from "lucide-react";

const UploadDropzone = ({ onFilesSelected }) => {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = (files) => {
    if (!files?.length) return;
    onFilesSelected(files[0]);
  };

  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault();
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
        handleFiles(event.dataTransfer.files);
      }}
      className={`rounded-[24px] border-2 border-dashed p-8 text-center transition ${
        dragActive ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-slate-50"
      }`}
    >
      <UploadCloud className="mx-auto h-10 w-10 text-indigo-500" />
      <p className="mt-4 text-sm font-semibold text-slate-900">Drag and drop your skill sheet here</p>
      <p className="mt-1 text-xs text-slate-500">Accepted columns: Category, Skill, SubSkill</p>
      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          <FileUp className="h-4 w-4" />
          Browse File
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />
    </div>
  );
};

export default UploadDropzone;
