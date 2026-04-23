// src/components/AddHolidaysModal.jsx
import React, { useState, useEffect, useRef } from "react";
import Select from "react-select";
import axios from "axios";
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
} from "lucide-react";
import * as XLSX from "xlsx";

const BASE_URL = window.__APP_CONFIG__.BASE_URL || "";

export default function AddHolidaysModal({ isOpen, onClose, onSuccess }) {
  const [holidays, setHolidays] = useState([]);
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("NATIONAL");

  const [selectedCountry, setSelectedCountry] = useState(null); // { label, value }
  const [selectedState, setSelectedState] = useState(null); // { label, value }
  const [stateOptions, setStateOptions] = useState([]);

  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef(null);

  const countries = Country.getAllCountries().map((c) => ({
    label: c.name,
    value: c.isoCode,
  }));

  // Styles: premium look + hide typed input (Option B)
  const customSelectStyles = {
    control: (base, state) => ({
      ...base,
      borderRadius: 10,
      minHeight: 44,
      paddingLeft: 6,
      borderColor: state.isFocused ? "#6366F1" : "#e5e7eb",
      boxShadow: state.isFocused ? "0 0 0 4px rgba(99,102,241,0.06)" : "none",
      "&:hover": { borderColor: "#6366F1" },
      cursor: "pointer",
      background: "#fff",
    }),
    // Hide typed input visually (Option B)
    input: (base) => ({
      ...base,
      caretColor: "white",
      margin: 0,
      padding: 0,
      width: "100%",
      background: "transparent",
    }),
    valueContainer: (base) => ({
      ...base,
      padding: "4px 8px",
    }),
    placeholder: (base) => ({ ...base, color: "#6b7280" }),
    singleValue: (base) => ({ ...base, color: "#111827", fontWeight: 500 }),
    menu: (base) => ({
      ...base,
      borderRadius: 10,
      boxShadow: "0 6px 24px rgba(15,23,42,0.12)",
      zIndex: 9999,
    }),
    option: (base, { isFocused, isSelected }) => ({
      ...base,
      background: isSelected
        ? "#4f46e5"
        : isFocused
          ? "#eef2ff"
          : "transparent",
      color: isSelected ? "#fff" : "#111827",
      padding: "10px 14px",
      borderRadius: 8,
    }),
  };

  const customTheme = (theme) => ({
    ...theme,
    colors: {
      ...theme.colors,
      primary: "#4f46e5",
      primary25: "#eef2ff",
    },
  });

  // when country changes, load states
  const handleCountryChange = (option) => {
    setSelectedCountry(option);
    if (!option) {
      setStateOptions([]);
      setSelectedState(null);
      return;
    }

    const rawStates = State.getStatesOfCountry(option.value) || [];
    const mapped = rawStates.map((s) => ({ label: s.name, value: s.isoCode }));
    setStateOptions(mapped);

    // if type != NATIONAL allow user to pick state; keep state cleared
    if (type !== "NATIONAL") setSelectedState(null);
  };

  // auto set state = ALL for National
  useEffect(() => {
    if (type === "NATIONAL") {
      setSelectedState({ label: "ALL", value: "ALL" });
    } else {
      setSelectedState(null);
    }
  }, [type]);

  // reset modal when opened
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

  // add holiday
  const handleAddHoliday = () => {
    if (!date || !description || !selectedCountry || !selectedState) {
      toast.error("Please fill all required fields.");
      return;
    }

    const newHoliday = {
      id: Date.now(),
      date,
      description,
      type,
      country: selectedCountry.label,
      state: selectedState.label,
      year: new Date(date).getFullYear(),
    };

    setHolidays((p) => [...p, newHoliday]);

    // clear inputs (preserve type)
    setDate("");
    setDescription("");
    setSelectedCountry(null);
    setSelectedState(
      type === "NATIONAL" ? { label: "ALL", value: "ALL" } : null,
    );
    setStateOptions([]);
  };

  const handleRemoveHoliday = (id) =>
    setHolidays((p) => p.filter((h) => h.id !== id));

  // download template
  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      const res = await axios.get(
        `${BASE_URL}/api/holidays/template/download`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          responseType: "blob",
        },
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = "holiday_template.xlsx";
      link.click();
      link.remove();
    } catch (err) {
      toast.error("Failed to download template.");
    } finally {
      setDownloading(false);
    }
  };

  // excel upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, {
          type: "array",
          cellDates: true,
        });
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
        console.log("holidays", parsed);
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

  // submit
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
      const res = await axios.post(`${BASE_URL}/api/holidays/add`, payload, {
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
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">Add Holidays</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="bg-gray-50 border rounded-lg p-6 space-y-6">
            <h3 className="font-semibold text-gray-700 border-b pb-2">
              Holiday Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Date */}
              <div>
                <label className="font-medium text-sm">Holiday Date *</label>
                <div className="relative mt-1">
                  <CalendarDays className="absolute left-3 top-3 text-orange-500" />
                  <input
                    type="date"
                    value={date}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2 pl-10 border rounded-lg"
                  />
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="font-medium text-sm">Holiday Name *</label>
                <div className="relative mt-1">
                  <Text className="absolute left-3 top-3 text-blue-600" />
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., Diwali"
                    className="w-full p-2 pl-10 border rounded-lg"
                  />
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="font-medium text-sm">Type *</label>
                <div className="relative mt-1">
                  <Tag className="absolute left-3 top-3 text-green-600" />
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full p-2 pl-10 border rounded-lg"
                  >
                    <option value="NATIONAL">National</option>
                    <option value="REGIONAL">Regional</option>
                    <option value="OPTIONAL">Optional</option>
                  </select>
                </div>
              </div>

              {/* Country */}
              <div>
                <label className="font-medium text-sm">Country *</label>
                <div className="relative mt-1">
                  <div className="absolute left-3 top-3 text-blue-600 pointer-events-none">
                    <Globe />
                  </div>
                  <Select
                    options={countries}
                    value={selectedCountry}
                    onChange={handleCountryChange}
                    placeholder="Search country..."
                    styles={customSelectStyles}
                    theme={customTheme}
                    isClearable
                    isSearchable
                    maxMenuHeight={220}
                  />
                </div>
              </div>

              {/* State */}
              <div>
                <label className="font-medium text-sm">State *</label>
                <div className="relative mt-1">
                  <div className="absolute left-3 top-3 text-red-500 pointer-events-none">
                    <MapPin />
                  </div>
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
                    maxMenuHeight={220}
                  />
                </div>
              </div>
            </div>

            {/* Add button */}
            <div className="flex justify-center">
              <button
                onClick={handleAddHoliday}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700"
              >
                <Plus className="inline mr-2" /> Add Holiday
              </button>
            </div>
          </div>

          {/* Excel / Template */}
          <div className="p-4 border-dashed border-2 rounded-lg text-center">
            <p className="font-semibold">Or import using Excel</p>
            <p className="text-gray-500 text-sm">Download → Fill → Upload</p>

            <div className="flex flex-col md:flex-row gap-4 justify-center mt-4">
              <button
                onClick={handleDownloadTemplate}
                disabled={downloading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg"
              >
                <Download size={18} className="inline mr-2" />
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
                className="px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                <Upload size={18} className="inline mr-2" />
                {uploading ? "Processing..." : "Upload Excel"}
              </button>
            </div>
          </div>

          {/* Holiday list */}
          {holidays.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700">
                Holidays Added ({holidays.length})
              </h3>
              <ul className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {holidays.map((h) => (
                  <li
                    key={h.id}
                    className="flex justify-between p-3 items-center"
                  >
                    <div>
                      <p className="font-semibold">{h.description}</p>
                      <p className="text-sm text-gray-500">
                        {h.date} • {h.type} • {h.country} • {h.state}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveHoliday(h.id)}
                      className="text-red-600 hover:bg-red-100 p-2 rounded-full"
                    >
                      <Trash2 size={18} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-100 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={submitting || holidays.length === 0}
            className="px-6 py-3 bg-green-600 text-white rounded-lg shadow hover:bg-green-700"
          >
            {submitting
              ? "Submitting..."
              : `Submit ${holidays.length} Holiday(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}
