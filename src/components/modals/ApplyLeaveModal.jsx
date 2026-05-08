import React, { useState } from 'react';
import Modal from '../Modal';
import FilterListbox from '../filter/FilterListbox';



const ApplyLeaveModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Basic validation
    const newErrors = {};
    if (!formData.leaveType) newErrors.leaveType = 'Leave type is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.endDate) newErrors.endDate = 'End date is required';
    if (!formData.reason.trim()) newErrors.reason = 'Reason is required';
    
    if (formData.startDate && formData.endDate && new Date(formData.startDate) > new Date(formData.endDate)) {
      newErrors.endDate = 'End date must be after start date';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onSubmit(formData);
      setFormData({ leaveType: '', startDate: '', endDate: '', reason: '' });
      setErrors({});
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear error when user starts typing
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: ''
      });
    }
  };

  const calculateDays = () => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    }
    return 0;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Apply for Leave">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Leave Type *
          </label>
          <FilterListbox
            options={[
              { value: "", label: "Select Leave Type" },
              { value: "Annual Leave", label: "Annual Leave" },
              { value: "Sick Leave", label: "Sick Leave" },
              { value: "Personal Leave", label: "Personal Leave" },
              { value: "Maternity Leave", label: "Maternity Leave" },
              { value: "Paternity Leave", label: "Paternity Leave" },
              { value: "Emergency Leave", label: "Emergency Leave" },
            ]}
            value={formData.leaveType}
            onChange={(val) => handleChange({ target: { name: "leaveType", value: val } })}
          />
          {errors.leaveType && <p className="text-red-500 text-xs mt-1">{errors.leaveType}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date *
            </label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#263383] focus:border-transparent ${
                errors.startDate ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date *
            </label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#263383] focus:border-transparent ${
                errors.endDate ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>}
          </div>
        </div>

        {calculateDays() > 0 && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              Total days: {calculateDays()} day{calculateDays() !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason *
          </label>
          <textarea
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            rows={4}
            placeholder="Please provide a reason for your leave request..."
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#263383] focus:border-transparent ${
              errors.reason ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.reason && <p className="text-red-500 text-xs mt-1">{errors.reason}</p>}
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
            className="px-4 py-2 bg-[#b22a4f] text-white rounded-lg hover:bg-[#d23369] transition-colors"
          >
            Submit Application
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ApplyLeaveModal;