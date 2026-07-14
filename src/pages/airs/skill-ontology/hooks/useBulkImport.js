import { useState } from "react";
import { toast } from "react-toastify";
import { importSkills } from "../services/skillOntologyService";

export default function useBulkImport() {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null); // { inserted, skipped, failed }

  const upload = async () => {
    if (!file) return;
    setIsUploading(true);
    setProgress(0);
    try {
      const res = await importSkills(file, setProgress);
      const data = res?.data || res;
      setResult(data);
      toast.success(
        `Import complete: ${data.inserted ?? 0} inserted, ${data.skipped ?? 0} skipped, ${data.failed ?? 0} failed.`
      );
    } catch {
      toast.error("Bulk import failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setProgress(0);
  };

  return { file, setFile, isUploading, progress, upload, result, reset };
}
