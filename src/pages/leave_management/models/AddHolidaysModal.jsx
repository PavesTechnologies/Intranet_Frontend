// src/components/AddHolidaysModal.jsx
import React, { useState, useEffect, useRef } from "react";
import Select from "react-select";
import api from "../../../api/axiosInstance";
import { Country, State } from "country-state-city";
import { toast } from "react-toastify";
import {
  Plus,
  Trash2,
  X,
  CalendarDays,
  Text,
  Tag,
  MapPin,
  Globe,
  Download,
  Upload,
  FileSpreadsheet,
} from "lucide-react";
import * as XLSX from "xlsx";
import Button from "../../../components/Button/Button";
import FilterListbox from "../../../components/filter/FilterListbox";

const BASE_URL = window.__APP_CONFIG__.BASE_URL || "";

const TYPE_BADGE = {
  NATIONAL: "bg-indigo-100 text-indigo-700",
  REGIONAL: "bg-amber-100 text-amber-700",
  OPTIONAL: "bg-emerald-100 text-emerald-700",
};

export default function AddHolidaysModal({ isOpen, onClose, onSuccess }) {
  const [holidays, setHolidays] = useState([]);
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("NATIONAL");

  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [stateOptions, setStateOptions] = useState([]);

  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef(null);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const countries = Country.getAllCountries().map((c) => ({
    label: c.name,
    value: c.isoCode,
  }));

  const customSelectStyles = {
    control: (base, state) => ({
      ...base,
      borderRadius: 8,
      minHeight: 40,
      paddingLeft: 30,
      borderColor: state.isFocused ? "#6366F1" : "#e5e7eb",
      boxShadow: state.isFocused ? "0 0 0 3px rgba(99,102,241,0.12)" : "none",
      "&:hover": { borderColor: "#6366F1" },
      cursor: "pointer",
      background: "#fff",
      fontSize: 14,
    }),
    input: (base) => ({ ...base, margin: 0, padding: 0 }),
    valueContainer: (base) => ({ ...base, padding: "2px 6px" }),
    placeholder: (base) => ({ ...base, color: "#9ca3af", fontSize: 14 }),
    singleValue: (base) => ({ ...base, color: "#111827", fontWeight: 500, fontSize: 14 }),
    menu: (base) => ({
      ...base,
      borderRadius: 10,
      boxShadow: "0 8px 28px rgba(15,23,42,0.14)",
      zIndex: 9999,
    }),
    option: (base, { isFocused, isSelected }) => ({
      ...base,
      background: isSelected ? "#4f46e5" : isFocused ? "#eef2ff" : "transparent",
      color: isSelected ? "#fff" : "#111827",
      padding: "8px 12px",
      borderRadius: 6,
      fontSize: 14,
    }),
  };

  const customTheme = (theme) => ({
    ...theme,
    colors: { ...theme.colors, primary: "#4f46e5", primary25: "#eef2ff" },
  });

  // When country changes, reload state options
  const handleCountryChange = (option) => {
    setSelectedCountry(option);
    if (!option) {
      setStateOptions([]);
      // FIX: preserve "ALL" for NATIONAL instead of setting null
      setSelectedState(type === "NATIONAL" ? { label: "ALL", value: "ALL" } : null);
      return;
    }
    const rawStates = State.getStatesOfCountry(option.value) || [];
    setStateOptions(rawStates.map((s) => ({ label: s.name, value: s.isoCode })));
    if (type !== "NATIONAL") setSelectedState(null);
  };

  // Auto-set state when type changes
  useEffect(() => {
    if (type === "NATIONAL") {
      setSelectedState({ label: "ALL", value: "ALL" });
    } else {
      setSelectedState(null);
    }
  }, [type]);

  // Reset on open
  useEffect(() => {
    if (!isOpen) return;
    setDate("");
    setDescription("");
    setType("NATIONAL");
    setSelectedCountry(null);
    setSelectedState({ label: "ALL", value: "ALL" });
    setStateOptions([]);
    setHolidays([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [isOpen]);

  const handleAddHoliday = () => {
    if (!date || !description || !selectedCountry || !selectedState) {
      toast.error("Please fill all required fields.");
      return;
    }
    setHolidays((p) => [
      ...p,
      {
        id: Date.now(),
        date,
        description,
        type,
        country: selectedCountry.label,
        state: selectedState.label,
        year: new Date(date).getFullYear(),
      },
    ]);
    setDate("");
    setDescription("");
    setSelectedCountry(null);
    setSelectedState(type === "NATIONAL" ? { label: "ALL", value: "ALL" } : null);
    setStateOptions([]);
  };

  const handleRemoveHoliday = (id) =>
    setHolidays((p) => p.filter((h) => h.id !== id));

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`${BASE_URL}/api/holidays/template/download`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = "holiday_template.xlsx";
      link.click();
      link.remove();
    } catch {
      toast.error("Failed to download template.");
    } finally {
      setDownloading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "array", cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        const parsed = rows.map((row, idx) => ({
          id: Date.now() + idx,
          date: row.holiday_date.toISOString().split("T")[0],
          description: row.holiday_name,
          type: row.type || "NATIONAL",
          country: row.country || "India",
          state: row.state || "ALL",
          year: new Date(row.holiday_date).getFullYear(),
        }));
        setHolidays((p) => [...p, ...parsed]);
        toast.success(`${parsed.length} holidays imported.`);
      } catch {
        toast.error("Failed to parse Excel.");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSubmit = async () => {
    if (holidays.length === 0) {
      toast.error("Add at least one holiday.");
      return;
    }
    setSubmitting(true);
    const payload = holidays.map(({ id, ...rest }) => ({
      holidayName: rest.description,
      holidayDescription: rest.description,
      holidayDate: rest.date,
      type: rest.type,
      state: rest.state,
      country: rest.country,
      year: rest.year,
    }));
    try {
      const res = await api.post(`${BASE_URL}/api/holidays/add`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      toast.success(res.data.message || "Holidays added successfully!");
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit holidays.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(8px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col"
        style={{ maxHeight: "90vh", animation: "modalUp .28s cubic-bezier(.22,1,.36,1)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl flex-shrink-0 bg-indigo-600">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Add Holidays</h2>
            <p className="text-xs text-indigo-200 mt-0.5">
              {holidays.length > 0 ? `${holidays.length} holiday(s) queued` : "Fill in details and add to the list"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Form section */}
          <div className="border border-gray-100 rounded-xl p-5 space-y-4 bg-gray-50/60">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Holiday Details</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Date */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Holiday Date <span className="text-red-400">*</span></label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 pointer-events-none" />
                  <input
                    type="date"
                    value={date}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white"
                  />
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Holiday Name <span className="text-red-400">*</span></label>
                <div className="relative">
                  <Text className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 pointer-events-none" />
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Diwali"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white"
                  />
                </div>
              </div>

              {/* Type */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Type <span className="text-red-400">*</span></label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 pointer-events-none" />
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white appearance-none"
                  >
                    <option value="NATIONAL">National</option>
                    <option value="REGIONAL">Regional</option>
                    <option value="OPTIONAL">Optional</option>
                  </select>
                </div>
              </div>

              {/* Country */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Country <span className="text-red-400">*</span></label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 pointer-events-none z-10" />
                  <Select
                    options={countries}
                    value={selectedCountry}
                    onChange={handleCountryChange}
                    placeholder="Search country..."
                    styles={customSelectStyles}
                    theme={customTheme}
                    isClearable
                    isSearchable
                    maxMenuHeight={200}
                  />
                </div>
              </div>

              {/* State */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">
                  State{" "}
                  {type === "NATIONAL" ? (
                    <span className="text-gray-400 font-normal">(auto: ALL)</span>
                  ) : (
                    <span className="text-red-400">*</span>
                  )}
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 pointer-events-none z-10" />
                  <Select
                    options={stateOptions}
                    value={selectedState}
                    onChange={(opt) => setSelectedState(opt)}
                    placeholder={
                      type === "NATIONAL"
                        ? "ALL"
                        : selectedCountry
                        ? "Search state..."
                        : "Select country first"
                    }
                    styles={customSelectStyles}
                    theme={customTheme}
                    isClearable={type !== "NATIONAL"}
                    isDisabled={type === "NATIONAL" || !selectedCountry}
                    isSearchable
                    maxMenuHeight={200}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                // loading={loading}
                onClick={handleAddHoliday}
                variant="primary"
              >
                <Plus className="w-4 h-4" />
                Add to List
              </Button>
            </div>
          </div>

          {/* Excel import */}
          <div className="border border-dashed border-gray-300 rounded-xl p-4 bg-gray-50/40">
            <div className="flex items-center gap-2 mb-1">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <p className="text-sm font-semibold text-gray-700">Bulk Import via Excel</p>
            </div>
            <p className="text-xs text-gray-400 mb-3">Download the template, fill it in, then upload.</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleDownloadTemplate}
                disabled={downloading}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                {downloading ? "Downloading..." : "Download Template"}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-emerald-600 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                {uploading ? "Processing..." : "Upload Excel"}
              </button>
            </div>
          </div>

          {/* Holiday queue list */}
          {holidays.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                Queued Holidays ({holidays.length})
              </p>
              <ul className="border border-gray-100 rounded-xl divide-y divide-gray-50 overflow-hidden">
                {holidays.map((h) => (
                  <li key={h.id} className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-50 flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase leading-none">
                        {new Date(h.date).toLocaleDateString("en-US", { month: "short" })}
                      </span>
                      <span className="text-sm font-extrabold text-indigo-700 leading-tight">
                        {new Date(h.date).toLocaleDateString("en-US", { day: "2-digit" })}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{h.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {h.country} • {h.state}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${TYPE_BADGE[h.type] ?? "bg-gray-100 text-gray-600"}`}>
                      {h.type}
                    </span>
                    <button
                      onClick={() => handleRemoveHoliday(h.id)}
                      className="flex-shrink-0 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/80 rounded-b-2xl flex-shrink-0">
          <p className="text-xs text-gray-400">
            {holidays.length === 0
              ? "No holidays queued yet"
              : `${holidays.length} holiday(s) ready to submit`}
          </p>
          <Button
            onClick={handleSubmit}
            disabled={submitting || holidays.length === 0}
            variant="primary"
          >
            {submitting ? "Submitting..." : `Submit ${holidays.length > 0 ? `(${holidays.length})` : ""}`}
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes modalUp {
          from { opacity: 0; transform: translateY(14px) scale(.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
