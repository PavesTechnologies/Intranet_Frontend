import React, { useState } from "react";
import FormInput from "./FormInput";
import FormDatePicker from "./FormDatePicker";
import FormSelect from "./FormSelect";
import FormTextArea from "./FormTextArea";
import FileUpload from "./FileUpload";

const IntranetForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    department: "",
    description: "",
    file: null,
  });

  const departments = [
    { label: "HR", value: "hr" },
    { label: "Engineering", value: "engineering" },
    { label: "Finance", value: "finance" },
  ];

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // console.log("Form submitted:", formData);
    alert("Form submitted successfully!");
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Employee Onboarding</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormInput
          label="Full Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Enter your name"
        />
        <FormDatePicker
          label="Joining Date"
          name="date"
          value={formData.date}
          onChange={handleChange}
        />
        <FormSelect
          label="Department"
          name="department"
          options={departments}
          value={formData.department}
          onChange={handleChange}
        />
        <FormTextArea
          label="Description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Write something..."
        />
        <FileUpload
          label="Upload Document"
          name="file"
          onChange={handleChange}
        />
        <div className="pt-4">
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Submit
          </button>
        </div>
      </form>
    </div>
  );
};

export default IntranetForm;
