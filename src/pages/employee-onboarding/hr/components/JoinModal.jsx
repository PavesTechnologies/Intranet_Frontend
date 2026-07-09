import { X } from "lucide-react";
import Button from "../../../../components/Button/Button";
import { Fonts } from "../../../../components/Fonts/Fonts";
import { DEPARTMENTS } from "../constants";
import {
  InputField,
  SearchableSelect,
  SelectField,
  TextAreaField,
} from "./form-fields";

export default function JoinModal({
  open,
  onClose,
  onSubmit,
  onPreview,
  loading,
  previewLoading,
  form,
  setForm,
  managerOptions,
  loadingManagers,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] p-6 relative flex flex-col">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
        >
          <X size={20} />
        </button>

        <h2 className={`${Fonts.heading4} mb-4`}>
          Send Joining Details
        </h2>

        <div className="space-y-4 overflow-y-auto pr-2 flex-1">
          <InputField
            label="Joining Date *"
            type="date"
            value={form.joining_date}
            onChange={(v) =>
              setForm({ ...form, joining_date: v })
            }
          />

          <InputField
            label="Reporting Time *"
            type="time"
            value={form.reporting_time}
            onChange={(v) =>
              setForm({ ...form, reporting_time: v })
            }
          />

          <InputField
            label="Location *"
            type="text"
            value={form.location}
            onChange={(v) =>
              setForm({ ...form, location: v })
            }
          />

          <SelectField
            label="Department *"
            value={form.department}
            options={DEPARTMENTS}
            onChange={(v) =>
              setForm({ ...form, department: v })
            }
          />

          <SearchableSelect
            label="Reporting Manager *"
            value={form.reporting_manager}
            options={managerOptions}
            loading={loadingManagers}
            disabled={loadingManagers}
            placeholder="Search manager"
            onChange={(v) =>
              setForm({ ...form, reporting_manager: v })
            }
          />

          <TextAreaField
            label="Additional Content"
            value={form.custom_message}
            onChange={(v) =>
              setForm({ ...form, custom_message: v })
            }
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            varient="secondary"
            size="small"
            onClick={onClose}
            disabled={loading || previewLoading}
          >
            Cancel
          </Button>

          <Button
            varient="secondary"
            size="small"
            onClick={onPreview}
            disabled={loading || previewLoading}
          >
            {previewLoading ? "Previewing..." : "Preview Joining Letter"}
          </Button>

          <Button
            varient="primary"
            size="small"
            onClick={onSubmit}
            disabled={loading || previewLoading}
          >
            {loading ? "Sending..." : "Send Email"}
          </Button>
        </div>
      </div>
    </div>
  );
}
