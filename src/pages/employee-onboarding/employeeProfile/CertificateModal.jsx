import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Loader2 } from "lucide-react";
import { skillService } from "../../../services/skillService";

const CustomSelect = ({ label, value, onChange, options, disabled, placeholder }) => (
  <div className="flex-1 min-w-[130px]">
    {label && <label className="block text-gray-400 mb-1 uppercase text-xs tracking-wider">{label}</label>}
    <select
      value={value || ""}
      onChange={onChange}
      disabled={disabled}
      className={`w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white ${
        disabled ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""
      }`}
    >
      <option value="" disabled>{placeholder || "Select"}</option>
      {options.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {opt.name || opt.certificateName}
        </option>
      ))}
    </select>
  </div>
);

const CustomInput = ({ label, value, onChange, type = "text", min, placeholder }) => (
  <div className="w-32 shrink-0">
    {label && <label className="block text-gray-400 mb-1 uppercase text-xs tracking-wider">{label}</label>}
    <input
      type={type}
      min={min}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
    />
  </div>
);

export default function CertificateModal({ employeeId, onClose, onSaveSuccess }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [tree, setTree] = useState([]);
  const [proficiencies, setProficiencies] = useState([]);
  const [allCertificates, setAllCertificates] = useState([]);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [treeRes, profRes, certsRes, profileCerts] = await Promise.all([
          skillService.getSkillTree(),
          skillService.getProficiencies(),
          skillService.getCertificates(),
          skillService.getEmployeeCertificates(employeeId),
        ]);

        const treeData = treeRes?.data || treeRes || [];
        setTree(Array.isArray(treeData) ? treeData : []);

        const profData = profRes?.data || profRes || [];
        setProficiencies(Array.isArray(profData) ? profData : []);

        const certsData = certsRes?.data || certsRes || [];
        setAllCertificates(Array.isArray(certsData) ? certsData : []);

        const existing = profileCerts?.data || profileCerts || [];

        if (Array.isArray(existing) && existing.length > 0) {
          const mappedRows = existing.map((item) => {
            const certId = item.certificateId || item.certificate?.id;
            const proficiencyId = item.proficiencyId || item.proficiencyLevel?.id || item.proficiency?.id;
            const issuedDate = item.issuedDate ? item.issuedDate.split("T")[0] : "";

            // Find category
            let categoryId = item.categoryId || item.category?.id;
            if (!categoryId && certId) {
                const certObj = (Array.isArray(certsData)?certsData:[]).find(c => c.id === certId);
                if (certObj && certObj.categoryId) categoryId = certObj.categoryId;
            }

            return {
              id: Math.random().toString(36).substr(2, 9),
              categoryId: categoryId || "",
              certificateId: certId || "",
              proficiencyId: proficiencyId || "",
              issuedDate: issuedDate,
            };
          });
          setRows(mappedRows);
        } else {
          addRow();
        }

      } catch (err) {
        console.error("Error fetching cert data:", err);
        setError("Failed to load data. Please check console.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [employeeId]);

  const addRow = () => {
    setRows([
      ...rows,
      {
        id: Math.random().toString(36).substr(2, 9),
        categoryId: "",
        certificateId: "",
        proficiencyId: "",
        issuedDate: "",
      },
    ]);
  };

  const removeRow = (id) => setRows(rows.filter((r) => r.id !== id));

  const updateRow = (id, field, value) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updated = { ...r, [field]: value };
          if (field === "categoryId") updated.certificateId = "";
          return updated;
        }
        return r;
      })
    );
  };

  const handleSave = async () => {
    setError(null);
    for (const row of rows) {
      if (!row.categoryId || !row.certificateId || !row.proficiencyId) {
        setError("Please fill all required fields in all rows.");
        return;
      }
    }

    const certIds = rows.map((r) => r.certificateId);
    if (new Set(certIds).size !== certIds.length) {
      setError("Please remove duplicate certificates before saving.");
      return;
    }

    setSaving(true);
    try {
      // API payload normally assigns certificates individually
      // If there's a bulk API, we would use it, else loop:
      for (const row of rows) {
        await skillService.assignCertificate({
          resourceId: employeeId,
          certificateId: row.certificateId,
          proficiencyId: row.proficiencyId,
          issuedDate: row.issuedDate ? new Date(row.issuedDate).toISOString() : null
        }).catch(err => console.error("Error assigning cert", err));
      }

      onSaveSuccess();
    } catch (err) {
      setError(err.message || "Failed to save certificates.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-sm text-gray-600">Loading certificates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center flex-col justify-center z-50 p-4">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center px-8 py-5 border-b shrink-0 bg-indigo-50/50 rounded-t-2xl">
          <h3 className="text-xl font-medium text-indigo-900">Manage Certifications</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition">
            <X size={22} />
          </button>
        </div>

        <div className="px-8 py-6 flex-1 overflow-y-auto space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-md text-sm mb-4">
              {error}
            </div>
          )}

          {rows.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-sm border-2 border-dashed rounded-xl">
              No certs added yet. Click &quot;Add Certificate&quot; to begin.
            </div>
          ) : (
             <div className="space-y-4">
               <div className="flex items-center gap-4 px-2 hidden sm:flex">
                 <div className="flex-1 min-w-[130px] text-xs font-semibold text-gray-500 uppercase tracking-widest">Category</div>
                 <div className="flex-1 min-w-[130px] text-xs font-semibold text-gray-500 uppercase tracking-widest">Certificate</div>
                 <div className="flex-1 min-w-[130px] text-xs font-semibold text-gray-500 uppercase tracking-widest">Proficiency</div>
                 <div className="w-32 shrink-0 text-xs font-semibold text-gray-500 uppercase tracking-widest">Issued Date</div>
                 <div className="w-8 shrink-0"></div>
               </div>

               {rows.map((row) => {
                 const certOptions = allCertificates.filter(c => c.categoryId === row.categoryId || c.category?.id === row.categoryId);

                 return (
                   <div key={row.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-gray-50 p-3 sm:p-2 sm:bg-transparent rounded-lg border sm:border-none border-gray-100">
                     <CustomSelect
                       value={row.categoryId}
                       onChange={(e) => updateRow(row.id, "categoryId", e.target.value)}
                       options={tree}
                       placeholder="Select Category"
                     />
                     <CustomSelect
                       value={row.certificateId}
                       onChange={(e) => updateRow(row.id, "certificateId", e.target.value)}
                       options={certOptions}
                       placeholder="Select Certificate"
                       disabled={!row.categoryId}
                     />
                     <CustomSelect
                       value={row.proficiencyId}
                       onChange={(e) => updateRow(row.id, "proficiencyId", e.target.value)}
                       options={proficiencies.map(p => ({id: p.id, name: p.levelName || p.name}))}
                       placeholder="Select Level"
                     />
                     <CustomInput
                       type="date"
                       value={row.issuedDate}
                       onChange={(e) => updateRow(row.id, "issuedDate", e.target.value)}
                       placeholder="Date"
                     />
                     <button
                       onClick={() => removeRow(row.id)}
                       className="p-2 text-red-500 hover:bg-red-50 rounded-md transition mt-1 sm:mt-0"
                     >
                       <Trash2 size={18} />
                     </button>
                   </div>
                 );
               })}
             </div>
          )}

          <div className="pt-2">
            <button
               onClick={addRow}
               className="flex items-center gap-2 text-sm text-indigo-600 font-medium hover:text-indigo-800 transition px-2 py-1"
            >
               <Plus size={16} /> Add Certificate
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-4 px-8 py-5 border-t bg-gray-50 rounded-b-2xl shrink-0">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-2 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || rows.length === 0}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 transition flex items-center gap-2 disabled:bg-indigo-400 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            Save Certifications
          </button>
        </div>
      </div>
    </div>
  );
}
