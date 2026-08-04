import { useState, useEffect } from "react";
import api from "../../api/axiosInstance";
import { showStatusToast } from "../toastfy/toast";
import Button from "../Button/Button";
import Modal from "../Modal/modal";
import FormDatePicker from "../forms/FormDatePicker";


export const CreateTaskModal = ({
  open,
  onClose,
  defaultStatusId,
  projectId,
  onCreated,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setStartDate("");
      setDueDate("");
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
      const res = await api.post(
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
        <FormDatePicker label="Start Date" name="startDate" value={startDate} onChange={setStartDate} min={today} />

        <FormDatePicker label="Due Date" name="dueDate" value={dueDate} onChange={setDueDate} min={today} />

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