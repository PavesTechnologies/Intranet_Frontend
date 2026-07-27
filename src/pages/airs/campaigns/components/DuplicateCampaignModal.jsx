import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Copy, Info } from "lucide-react";
import Modal from "../../../../components/ui/Modal";
import Button from "../../../../components/Button/Button";
import FormInput from "../../../../components/forms/FormInput";
import FilterListbox from "../../../../components/filter/FilterListbox";
import { duplicateCampaign, getNameByRoles } from "../services/campaignservice";
import { getAllJDs } from "../../service/jdservice";

const EMPTY_FORM = { name: "", jd_id: "", hiring_manager_id: "", recruiter_id: "", max_candidates: "", deadline: "" };

// E03-S06 — Duplicate a Campaign Configuration (HR_ADMIN only). Copies
// scoring weights/thresholds verbatim from the source; candidate data is
// never copied. JD must be re-selected explicitly (never defaulted to the
// source's, since JD content may have changed since).
export default function DuplicateCampaignModal({ isOpen, onClose, sourceCampaign, onDuplicated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [jdOptions, setJdOptions] = useState([]);
  const [hiringManagerOptions, setHiringManagerOptions] = useState([{ value: "", label: "Keep source's hiring manager" }]);
  const [recruiterOptions, setRecruiterOptions] = useState([{ value: "", label: "Keep source's recruiter" }]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm({ ...EMPTY_FORM, name: sourceCampaign?.name ? `${sourceCampaign.name} (Copy)` : "" });

    (async () => {
      try {
        const jdRes = await getAllJDs({ page: 1, limit: 100 });
        const jds = jdRes?.data?.items || [];
        setJdOptions([{ value: "", label: "Select Job Description" }, ...jds.map((jd) => ({ value: jd.id, label: jd.title }))]);
      } catch {
        toast.error("Failed to load job descriptions.");
      }

      const [hmRes, recRes] = await Promise.allSettled([
        getNameByRoles("HIRING_MANAGER"),
        getNameByRoles("RECRUITER"),
      ]);
      if (hmRes.status === "fulfilled") {
        const list = Array.isArray(hmRes.value) ? hmRes.value : (hmRes.value?.data || []);
        setHiringManagerOptions([
          { value: "", label: "Keep source's hiring manager" },
          ...list.map((hm) => ({ value: hm.user_id?.toString() || "", label: hm.employee_name || `ID: ${hm.user_id}` })),
        ]);
      }
      if (recRes.status === "fulfilled") {
        const list = Array.isArray(recRes.value) ? recRes.value : (recRes.value?.data || []);
        setRecruiterOptions([
          { value: "", label: "Keep source's recruiter" },
          ...list.map((rec) => ({ value: rec.user_id?.toString() || "", label: rec.employee_name || `ID: ${rec.user_id}` })),
        ]);
      }
    })();
  }, [isOpen, sourceCampaign]);

  const change = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleConfirm = async () => {
    const name = form.name.trim();
    if (!name) return toast.error("Campaign name cannot be empty.");
    if (!form.jd_id) return toast.error("Please select a job description.");

    const payload = {
      name,
      jd_id: form.jd_id,
      hiring_manager_id: form.hiring_manager_id || null,
      recruiter_id: form.recruiter_id || null,
      max_candidates: form.max_candidates === "" ? null : Number(form.max_candidates),
      deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
    };

    setSubmitting(true);
    try {
      const res = await duplicateCampaign(sourceCampaign.id, payload);
      toast.success("Campaign duplicated successfully.");
      onDuplicated(res?.data || res);
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.response?.data?.detail || "Failed to duplicate campaign.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Duplicate Campaign" width="520px" height="85vh">
      <div className="space-y-4">
        <div className="flex items-start gap-2 p-3 rounded-xl bg-indigo-50 border border-indigo-100">
          <Info className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
          <p className="text-[11.5px] text-indigo-700">
            Scoring weights and thresholds are copied verbatim from <b>{sourceCampaign?.name}</b>. Candidate data is
            never copied — the new campaign starts with zero candidates.
          </p>
        </div>

        <FormInput label="New Campaign Name" name="name" value={form.name} onChange={change} maxLength={255} requiredMark />

        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
            Job Description <span className="text-red-500">*</span>
          </label>
          <FilterListbox
            options={jdOptions}
            value={form.jd_id}
            onChange={(value) => setForm((p) => ({ ...p, jd_id: value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Max Candidates" name="max_candidates" type="number" min="1" value={form.max_candidates} onChange={change} />
          <FormInput label="Deadline" name="deadline" type="datetime-local" value={form.deadline} onChange={change} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Hiring Manager</label>
            <FilterListbox
              options={hiringManagerOptions}
              value={form.hiring_manager_id}
              onChange={(value) => setForm((p) => ({ ...p, hiring_manager_id: value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Recruiter</label>
            <FilterListbox
              options={recruiterOptions}
              value={form.recruiter_id}
              onChange={(value) => setForm((p) => ({ ...p, recruiter_id: value }))}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 border-t pt-4">
          <Button variant="outline" size="small" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" size="small" onClick={handleConfirm} loading={submitting} loadingText="Duplicating...">
            <Copy className="h-4 w-4" /> Duplicate Campaign
          </Button>
        </div>
      </div>
    </Modal>
  );
}
