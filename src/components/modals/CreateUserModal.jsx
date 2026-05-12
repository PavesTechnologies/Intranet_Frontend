import React, { useState } from 'react';
import Modal from '../Modal';
import FilterListbox from '../filter/FilterListbox';


const CreateUserModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    department: '',
    status: 'Active'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ name: '', email: '', role: '', department: '', status: 'Active' });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New User">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#263383] focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#263383] focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Role *
          </label>
          <FilterListbox
            options={[
              { value: "", label: "Select Role" },
              { value: "System Administrator", label: "System Administrator" },
              { value: "Project Manager", label: "Project Manager" },
              { value: "Developer", label: "Developer" },
              { value: "HR Manager", label: "HR Manager" },
              { value: "Designer", label: "Designer" },
              { value: "Employee", label: "Employee" },
            ]}
            value={formData.role}
            onChange={(val) => handleChange({ target: { name: "role", value: val } })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Department *
          </label>
          <FilterListbox
            options={[
              { value: "", label: "Select Department" },
              { value: "IT", label: "IT" },
              { value: "Operations", label: "Operations" },
              { value: "Engineering", label: "Engineering" },
              { value: "Human Resources", label: "Human Resources" },
              { value: "Design", label: "Design" },
              { value: "Marketing", label: "Marketing" },
              { value: "Sales", label: "Sales" },
            ]}
            value={formData.department}
            onChange={(val) => handleChange({ target: { name: "department", value: val } })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <FilterListbox
            options={[
              { value: "Active", label: "Active" },
              { value: "Inactive", label: "Inactive" },
            ]}
            value={formData.status}
            onChange={(val) => handleChange({ target: { name: "status", value: val } })}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-[#263383] text-white rounded-lg hover:bg-[#3548b6] transition-colors"
          >
            Create User
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateUserModal;