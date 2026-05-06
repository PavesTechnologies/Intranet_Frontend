import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export const CreateTaskModal = ({
  open,
  onClose,
  defaultStatusId,
  projectId,
  onCreated,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
    }
  }, [open]);

  if (!open) return null;

  const handleCreate = async (e) => {
    e?.preventDefault();

    if (!title.trim()) {
      toast.error("Title required");
      return;
    }

    setSubmitting(true);

    try {
      const res = await axios.post(
        `${BASE}/api/tasks`,
        {
          title: title.trim(),
          description: description.trim(),
          projectId,
          statusId: defaultStatusId,
        },
        {
          headers: headersWithToken(),
        }
      );

      onCreated(res.data);
      toast.success("Task created");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg p-5">
        <h3 className="text-lg font-semibold mb-3">Create Task</h3>

        <form onSubmit={handleCreate}>
          <label className="block mb-3">
            <div className="text-sm font-medium">Title</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full border rounded px-3 py-2"
              placeholder="Enter task title"
            />
          </label>

          <label className="block mb-3">
            <div className="text-sm font-medium">Description</div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full border rounded px-3 py-2"
              rows={4}
              placeholder="Enter description"
            />
          </label>
          <FormDatePicker label="Start Date" name="startDate" value={formData.startDate || ""} onChange={onChange} min={today} />

          <FormDatePicker label="Due Date" name="dueDate" value={formData.dueDate || ""} onChange={onChange} min={today} />


          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded border"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded bg-indigo-600 text-white"
            >
              {submitting ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};