import { useState, useEffect } from "react";
import axios from "axios";
import { showStatusToast } from "../../../../components/toastfy/toast";
import Button from "../../../../components/Button/Button";
import Modal from "../../../../components/Modal/modal";

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

  const handleCreate = async (e) => {
    e?.preventDefault();

    if (!title.trim()) {
      showStatusToast("Title required", "error");
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
      showStatusToast("Task created", "success");
      onClose();
    } catch (err) {
      console.error(err);
      showStatusToast("Failed to create task", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Create Task">
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
          <Button type="button" variant="outline" size="small" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="small"
            loading={submitting}
            loadingText="Creating..."
          >
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
};