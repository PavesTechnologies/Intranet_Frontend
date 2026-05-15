import React, { useEffect } from "react";
import { useEnums } from "@/pages/resource_management/hooks/useEnums";
import FilterListbox from "../../../../../components/filter/FilterListbox";
import "react-phone-input-2/lib/style.css";
import PhoneInput from "react-phone-input-2";

const EscalationForm = ({ formData, setFormData, onSave, onClose, loading, showButtons = true }) => {
  const { getEnumValues } = useEnums();
  const CONTACT_ROLES = getEnumValues("ContactRole");
  const ESCALATION_LEVELS = getEnumValues("EscalationLevel");
  const ESCALATION_TRIGGERS = getEnumValues("EscalationTriggerType");

  useEffect(() => {
    if (!formData.triggers) {
      setFormData((prev) => ({ ...prev, triggers: [] }));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTriggerChange = (trigger) => {
    setFormData((prev) => {
      const exists = prev.triggers?.includes(trigger);
      return {
        ...prev,
        triggers: exists
          ? prev.triggers.filter((t) => t !== trigger)
          : [...(prev.triggers || []), trigger],
      };
    });
  };

  return (
    <div className="space-y-5">
      {/* ===== ROW 1: NAME & ROLE ===== */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-5 items-start">
        {/* Contact Name */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
            Contact Name *
          </label>
          <input
            name="contactName"
            placeholder="John Doe"
            value={formData.contactName || ""}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none bg-gray-50/50"
          />
        </div>

        {/* Contact Role */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
            Contact Role *
          </label>
          <FilterListbox
            options={[
              { value: "", label: "Select Role" },
              ...CONTACT_ROLES.map((role) => ({
                value: role,
                label: role.replace(/_/g, " ").toUpperCase(),
              })),
            ]}
            value={formData.contactRole || ""}
            onChange={(val) =>
              handleChange({ target: { name: "contactRole", value: val } })
            }
          />
        </div>

        {/* ===== ROW 2: EMAIL & PHONE ===== */}
        {/* Email */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
            Email *
          </label>
          <input
            type="email"
            name="email"
            placeholder="john@example.com"
            value={formData.email || ""}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none bg-gray-50/50"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
            Phone
          </label>
          <PhoneInput
            country={"in"}
            value={formData.phone || ""}
            onChange={(value, country) => {
              const countryCode = `+${country.dialCode}`;
              const phoneNumber = value.slice(country.dialCode.length);
              setFormData({
                ...formData,
                phone: `${countryCode} ${phoneNumber}`,
              });
            }}
            inputClass="!w-full !py-2 !text-[13px] !rounded-xl !border-gray-200 !bg-gray-50/50"
            dropdownClass="custom-phone-dropdown"
            countryCodeEditable={false}
            preferredCountries={["us", "in", "gb", "ca"]}
            enableSearch
            inputProps={{
              name: "phone",
              required: true,
              autoFocus: false,
            }}
          />
        </div>

        {/* ===== ROW 3: LEVEL & STATUS ===== */}
        {/* Escalation Level */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
            Escalation Level *
          </label>
          <FilterListbox
            options={[
              { value: "", label: "Select Level" },
              ...ESCALATION_LEVELS.map((level) => ({
                value: level,
                label: level.replace(/_/g, " ").toUpperCase(),
              })),
            ]}
            value={formData.escalationLevel || ""}
            onChange={(val) =>
              handleChange({ target: { name: "escalationLevel", value: val } })
            }
          />
        </div>

        {/* Status */}
        <div className="pb-2 pt-7">
          <label htmlFor="activeFlag" className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="activeFlag"
              checked={formData.activeFlag ?? true}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  activeFlag: e.target.checked,
                }))
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            <span className="ml-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              Active Status
            </span>
          </label>
        </div>
      </div>

      {/* ===== TRIGGERS (PILL STYLE) ===== */}
      <div className="pt-2">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-3">
          Escalation Triggers
        </label>
        <div className="flex flex-wrap gap-2">
          {ESCALATION_TRIGGERS.map((trigger) => (
            <label
              key={trigger}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-all duration-200 select-none
                ${
                  formData.triggers?.includes(trigger)
                    ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                    : "bg-white border-gray-200 text-slate-500 hover:border-gray-300 hover:bg-gray-50"
                }`}
            >
              <input
                type="checkbox"
                checked={formData.triggers?.includes(trigger)}
                onChange={() => handleTriggerChange(trigger)}
                className="hidden"
              />
              {trigger.replace(/_/g, " ").toUpperCase()}
            </label>
          ))}
        </div>
      </div>

      {/* Buttons */}
      {/* {showButtons && (
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-8">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all active:scale-95 text-[12px] uppercase tracking-wider"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={loading}
            className={`px-8 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-md ${
              loading ? "opacity-50 cursor-not-allowed" : "active:scale-95"
            } text-[12px] uppercase tracking-wider`}
          >
            {loading ? "Updating..." : "Update"}
          </button>
        </div>
      )} */}
    </div>
  );
};

export default EscalationForm;
