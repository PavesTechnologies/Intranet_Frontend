import { useEnums } from "@/pages/resource_management/hooks/useEnums";
import FilterListbox from "../../../../../components/filter/FilterListbox";

const SLAForm = ({ formData, setFormData }) => {
  const { getEnumValues } = useEnums();
  const SLA_TYPES = getEnumValues("SLAType");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-5">
      {/* ===== SLA CONFIG (2-COLUMN GRID) ===== */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-5 items-end">
        {/* SLA Type */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
            SLA Type <span className="text-red-500">*</span>
          </label>
          <FilterListbox
            options={[
              { value: "", label: "SELECT TYPE" },
              ...SLA_TYPES.map((type) => ({ value: type, label: type.replace(/_/g, " ").toUpperCase() })),
            ]}
            value={formData.slaType || ""}
            onChange={(val) => handleChange({ target: { name: "slaType", value: val } })}
          />
        </div>

        {/* SLA Duration */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
            Duration (Days) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="slaDurationDays"
            value={formData.slaDurationDays || ""}
            onChange={handleChange}
            onWheel={(e) => e.target.blur()}
            placeholder="e.g. 15"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none bg-gray-50/50"
          />
        </div>

        {/* Active Status */}
        <div className="pb-2">
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

        {/* Warning Threshold */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
            Warning Threshold (Days) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="warningThresholdDays"
            value={formData.warningThresholdDays || ""}
            onChange={handleChange}
            onWheel={(e) => e.target.blur()}
            placeholder="e.g. 5"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none bg-gray-50/50"
          />
        </div>
      </div>
    </div>
  );
};

export default SLAForm;