import React, { useEffect, useState } from "react";
import api from "../../../../api/axiosInstance";
import FilterListbox from "../../../../components/filter/FilterListbox";
import Button from "../../../../components/Button/Button";

const CreateEpic = ({ onClose }) => {
  const [projects, setProjects] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "TODO",
    priority: "LOW",
    progressPercentage: 0,
    dueDate: "",
    projectId: 0,
  });
  const [showSuccess, setShowSuccess] = useState(false);

  // Get token from localStorage (or wherever you store it)
  const token = localStorage.getItem("token");

  // Axios default header for Authorization
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

  useEffect(() => {
    api
      .get(`${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects`)
      .then((response) => {
        const content = response.data.content || response.data;
        if (Array.isArray(content)) {
          setProjects(content);
        } else {
          console.error("Unexpected projects format", response.data);
        }
      })
      .catch((error) => {
        console.error("Failed to fetch projects:", error);
      });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "progressPercentage" || name === "projectId"
          ? Number(value)
          : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const payload = {
      ...formData,
      dueDate: formData.dueDate ? formData.dueDate + "T00:00:00" : null,
    };

    api
      .post(`${window.__APP_CONFIG__.PMS_BASE_URL}/api/epics`, payload)
      .then((res) => {
        console.log("Epic created:", res.data);
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          onClose();
        }, 2000);
      })
      .catch((err) => {
        console.error("Failed to create epic:", err);
        alert("Failed to create epic. Check console for details.");
      });
  };

  return (
    <div className="relative p-4 max-w-lg mx-auto bg-white shadow-md rounded">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-gray-600 hover:text-red-600 text-xl font-bold"
        aria-label="Close form"
      >
        &times;
      </button>

      <h2 className="text-xl font-bold mb-4 text-center">Create Epic</h2>

      {showSuccess && (
        <div className="mb-4 p-2 bg-green-100 text-green-800 border border-green-300 rounded">
          ✅ Epic created successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Epic Name */}
        <div>
          <label htmlFor="name" className="block font-semibold mb-1">
            Epic Name
          </label>
          <input
            type="text"
            name="name"
            id="name"
            placeholder="Enter epic name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full border p-2 rounded"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block font-semibold mb-1">
            Description
          </label>
          <textarea
            name="description"
            id="description"
            placeholder="Enter description"
            value={formData.description}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />
        </div>

        {/* Status */}
        <div>
          <label htmlFor="status" className="block font-semibold mb-1">
            Status
          </label>
          <FilterListbox
            options={[{value:"TODO",label:"TODO"},{value:"IN_PROGRESS",label:"IN_PROGRESS"},{value:"DONE",label:"DONE"}]}
            value={formData.status}
            onChange={(val) => handleChange({ target: { name: "status", value: val } })}
          />
        </div>

        {/* Priority */}
        <div>
          <label htmlFor="priority" className="block font-semibold mb-1">
            Priority
          </label>
          <FilterListbox
            options={[{value:"LOW",label:"LOW"},{value:"MEDIUM",label:"MEDIUM"},{value:"HIGH",label:"HIGH"},{value:"CRITICAL",label:"CRITICAL"}]}
            value={formData.priority}
            onChange={(val) => handleChange({ target: { name: "priority", value: val } })}
          />
        </div>

        {/* Progress Percentage */}
        <div>
          <label
            htmlFor="progressPercentage"
            className="block font-semibold mb-1"
          >
            Progress (%)
          </label>
          <input
            type="number"
            name="progressPercentage"
            id="progressPercentage"
            placeholder="Progress"
            value={formData.progressPercentage}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            min={0}
            max={100}
          />
        </div>

        {/* Due Date */}
        <div>
          <label htmlFor="dueDate" className="block font-semibold mb-1">
            Due Date
          </label>
          <input
            type="date"
            name="dueDate"
            id="dueDate"
            value={formData.dueDate}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />
        </div>

        {/* Project Selector */}
        <div>
          <label htmlFor="projectId" className="block font-semibold mb-1">
            Project
          </label>
          <FilterListbox
            options={[{value:0,label:"Select Project"},...projects.map(project=>({value:project.id,label:project.name}))]}
            value={formData.projectId}
            onChange={(val) => handleChange({ target: { name: "projectId", value: val } })}
          />
        </div>

        {/* Submit Button */}
        <div className="text-right">
          <Button variant="primary" type="submit">
            Create Epic
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateEpic;
