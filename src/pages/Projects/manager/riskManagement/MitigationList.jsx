import { Trash2, Pencil, Check, X } from "lucide-react";
import { useState, useMemo } from "react";
import FilterListbox from "../../../../components/filter/FilterListbox";
import api from "../../../../api/axiosInstance";

/* =========================
   Reusable Toggle Switch
========================= */
function Toggle({ checked, onChange, label, color }) {
  const colorMap = {
    blue: "bg-blue-600",
    green: "bg-green-600",
  };

  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-all
          ${checked ? colorMap[color] : "bg-slate-300"}
        `}
      >
        <span
          className={`absolute top-[2px] left-[2px] w-4 h-4 rounded-full bg-white transition-all
            ${checked ? "translate-x-4" : ""}
          `}
        />
      </div>

      <span className="text-xs text-slate-600">{label}</span>
    </label>
  );
}

export default function MitigationList({
  mitigations,
  members,
  onUpdated,
  onDelete,
}) {
  if (!mitigations.length) {
    return (
      <div className="border border-dashed rounded-lg p-6 text-sm text-slate-500 text-center">
        No mitigation plans added
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {mitigations.map((m) => (
        <MitigationRow
          key={m.id}
          mitigation={m}
          members={members}
          onUpdated={onUpdated}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

function MitigationRow({ mitigation, members, onUpdated, onDelete }) {
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState(mitigation);

  const axiosInstance = useMemo(() => {
    const instance = api.create({
      baseURL: window.__APP_CONFIG__.PMS_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    instance.interceptors.request.use(
      (config) => {
        const latestToken = localStorage.getItem("token");

        if (latestToken) {
          config.headers.Authorization = `Bearer ${latestToken}`;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    return instance;
  }, []);

  async function updateStatus(field, value) {
    try {
      await axiosInstance.patch(
        `/api/mitigation-plans/${mitigation.id}/status`,
        {
          used: field === "used" ? value : mitigation.used,
          effective: field === "effective" ? value : mitigation.effective,
        }
      );

      onUpdated({ ...mitigation, [field]: value });
    } catch (err) {
      console.error("Failed to update mitigation status", err);
    }
  }

  async function saveEdit() {
    try {
      const res = await axiosInstance.put(
        `/api/mitigation-plans/${mitigation.id}`,
        form
      );

      onUpdated(res.data);
      setEdit(false);
    } catch (err) {
      console.error("Failed to save mitigation", err);
    }
  }

  return (
    <div className="border rounded-xl p-4 bg-white hover:shadow-sm transition">
      {edit ? (
        /* ========= EDIT MODE ========= */
        <div className="space-y-3">
          <textarea
            value={form.mitigation}
            onChange={(e) =>
              setForm({ ...form, mitigation: e.target.value })
            }
            className="border rounded-lg p-2 w-full text-sm"
          />

          <textarea
            value={form.contingency || ""}
            onChange={(e) =>
              setForm({ ...form, contingency: e.target.value })
            }
            className="border rounded-lg p-2 w-full text-sm"
          />

          <FilterListbox
            options={[
              { value: "", label: "Select owner" },
              ...members.map((m) => ({
                value: m.id,
                label: m.name,
              })),
            ]}
            value={form.ownerId || ""}
            onChange={(val) =>
              setForm({
                ...form,
                ownerId: val,
              })
            }
          />

          <div className="flex gap-3 pt-2">
            <button
              onClick={saveEdit}
              className="flex items-center gap-1 text-sm text-green-600"
            >
              <Check size={16} /> Save
            </button>

            <button
              onClick={() => {
                setForm(mitigation);
                setEdit(false);
              }}
              className="flex items-center gap-1 text-sm text-slate-500"
            >
              <X size={16} /> Cancel
            </button>
          </div>
        </div>
      ) : (
        /* ========= VIEW MODE ========= */
        <>
          <div className="flex justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {mitigation.mitigation}
              </p>

              {mitigation.contingency && (
                <p className="text-xs text-slate-500 mt-1">
                  Contingency: {mitigation.contingency}
                </p>
              )}
            </div>

            <div className="flex gap-3 text-slate-500">
              <button onClick={() => setEdit(true)}>
                <Pencil size={16} />
              </button>

              <button
                onClick={() => onDelete(mitigation.id)}
                className="text-red-500"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Status toggles */}
          <div className="flex gap-6 mt-4">
            <Toggle
              label="Used"
              checked={mitigation.used}
              color="blue"
              onChange={(v) => updateStatus("used", v)}
            />

            <Toggle
              label="Effective"
              checked={mitigation.effective}
              color="green"
              onChange={(v) => updateStatus("effective", v)}
            />
          </div>
        </>
      )}
    </div>
  );
}