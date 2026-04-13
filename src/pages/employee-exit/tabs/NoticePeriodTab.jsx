import React, { useState, useEffect } from 'react';
import { 
  Calendar,
  Clock,
  Briefcase,
  AlertCircle,
  FileText,
  DollarSign,
  Save,
  Info
} from 'lucide-react';
import { notice_period as mockNoticePeriods } from '../data/mockData';

export default function NoticePeriodTab({ exit_uuid, employee_uuid }) {
  const [noticeData, setNoticeData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(null);

  useEffect(() => {
    // Look up notice period for this exit
    const data = mockNoticePeriods.find(n => n.exit_uuid === exit_uuid);
    if (data) {
      setNoticeData(data);
      setFormData(data);
    } else {
      // Mock empty state if not found
      const emptyState = {
        start_date: '',
        end_date: '',
        notice_period_days: 0,
        served_days: 0,
        remaining_days: 0,
        buyout_option: false,
        buyout_amount: 0.0,
        kt_status: 'Not Started',
        kt_notes: '',
      };
      setNoticeData(emptyState);
      setFormData(emptyState);
    }
  }, [exit_uuid]);

  if (!noticeData || !formData) return <div className="text-gray-500 animate-pulse">Loading notice period...</div>;

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const calculateDays = () => {
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      const diffTime = Math.abs(end - start);
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const today = new Date();
      let served = 0;
      let remaining = days;

      if (today >= start) {
        if (today > end) {
          served = days;
          remaining = 0;
        } else {
          const diffServed = Math.abs(today - start);
          served = Math.ceil(diffServed / (1000 * 60 * 60 * 24));
          remaining = days - served;
        }
      }

      setFormData(prev => ({
        ...prev,
        notice_period_days: days,
        served_days: served,
        remaining_days: remaining
      }));
    }
  };

  const handleSave = () => {
    setNoticeData(formData);
    setIsEditing(false);
    // In a real app, you would dispatch an API save call here
  };

  const calculateProgress = () => {
    if (!noticeData.notice_period_days) return 0;
    return Math.min(100, Math.round((noticeData.served_days / noticeData.notice_period_days) * 100));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="text-blue-600" size={24} />
            Notice Period Management
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Track notice period duration, manage buyout options, and monitor Knowledge Transfer (KT) progress.
          </p>
        </div>
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-50 text-blue-700 font-medium rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-2"
          >
            Edit Details
          </button>
        ) : (
          <div className="flex gap-2">
            <button 
              onClick={() => {
                setFormData(noticeData);
                setIsEditing(false);
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Save size={18} />
              Save Changes
            </button>
          </div>
        )}
      </div>

      {!isEditing && noticeData.start_date && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 relative overflow-hidden">
          <div className="flex justify-between items-end relative z-10">
            <div>
              <p className="text-blue-800 font-medium mb-1">Notice Period Completion</p>
              <p className="text-3xl font-bold text-blue-900">
                {calculateProgress()}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-700 font-medium">
                {noticeData.remaining_days} days remaining out of {noticeData.notice_period_days}
              </p>
              <p className="text-xs text-blue-600/70 mt-1">Started: {new Date(noticeData.start_date).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="mt-4 bg-white/60 h-3 rounded-full overflow-hidden relative z-10">
            <div 
              className="bg-blue-600 h-full rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${calculateProgress()}%` }}
            ></div>
          </div>
          <div className="absolute right-0 top-0 opacity-5 scale-150 transform -translate-y-1/4 translate-x-1/4">
            <Clock size={180} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Dates & Timeline Card */}
        <div className="bg-white border text-left border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="border-b border-gray-100 bg-gray-50/50 p-4 flex items-center gap-2">
           <Clock className="text-gray-500" size={20} />
           <h3 className="font-semibold text-gray-800">Timeline</h3>
          </div>
          <div className="p-5 flex-1 flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                {isEditing ? (
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    onBlur={calculateDays}
                    className="w-full border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <div className="font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-xl">
                    {noticeData.start_date ? new Date(noticeData.start_date).toLocaleDateString() : 'N/A'}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
                {isEditing ? (
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                    onBlur={calculateDays}
                    className="w-full border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <div className="font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-xl">
                    {noticeData.end_date ? new Date(noticeData.end_date).toLocaleDateString() : 'N/A'}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
              <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="block text-xs text-gray-500 mb-1">Total Days</span>
                <span className="text-lg font-bold text-gray-900">{isEditing ? formData.notice_period_days : noticeData.notice_period_days}</span>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-xl border border-green-100">
                <span className="block text-xs text-green-600 mb-1">Served</span>
                <span className="text-lg font-bold text-green-700">{isEditing ? formData.served_days : noticeData.served_days}</span>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-xl border border-orange-100">
                <span className="block text-xs text-orange-600 mb-1">Remaining</span>
                <span className="text-lg font-bold text-orange-700">{isEditing ? formData.remaining_days : noticeData.remaining_days}</span>
              </div>
            </div>
            
            {isEditing && (
              <p className="text-xs text-gray-500 flex items-start gap-1.5 bg-blue-50 p-3 rounded-xl mt-auto">
                <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                Changing start or end dates will automatically calculate total, served, and remaining days.
              </p>
            )}
          </div>
        </div>

        {/* Buyout Card */}
        <div className="bg-white border text-left border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="border-b border-gray-100 bg-gray-50/50 p-4 flex items-center justify-between">
           <div className="flex items-center gap-2">
            <DollarSign className="text-gray-500" size={20} />
            <h3 className="font-semibold text-gray-800">Buyout Option</h3>
           </div>
           {!isEditing && noticeData.buyout_option && (
             <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase tracking-wider">Active</span>
           )}
          </div>
          <div className="p-5 flex-1 flex flex-col gap-5">
            <div className="flex items-center gap-3">
              {isEditing ? (
                 <label className="relative inline-flex items-center cursor-pointer">
                 <input 
                   type="checkbox" 
                   name="buyout_option"
                   checked={formData.buyout_option}
                   onChange={handleInputChange}
                   className="sr-only peer"
                 />
                 <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                 <span className="ml-3 text-sm font-medium text-gray-700">Enable Buyout</span>
               </label>
              ) : (
                <div className="flex items-center gap-2 text-sm">
                  Status: <strong className={noticeData.buyout_option ? 'text-green-600' : 'text-gray-600'}>{noticeData.buyout_option ? 'Enabled' : 'Disabled'}</strong>
                </div>
              )}
            </div>

            {((isEditing && formData.buyout_option) || (!isEditing && noticeData.buyout_option)) && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Buyout Amount / Deductions</label>
                {isEditing ? (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      name="buyout_amount"
                      value={formData.buyout_amount}
                      onChange={handleInputChange}
                      className="w-full border-gray-300 rounded-xl pl-8 pr-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                ) : (
                  <div className="font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-xl text-xl flex items-center gap-1">
                    <span className="text-gray-400 text-lg">$</span>
                    {Number(noticeData.buyout_amount).toLocaleString()}
                  </div>
                )}
              </div>
            )}
            
            {(!isEditing && !noticeData.buyout_option) && (
              <div className="bg-gray-50 rounded-xl p-4 flex flex-col items-center justify-center text-center mt-auto border border-dashed border-gray-200">
                <AlertCircle className="text-gray-400 mb-2" size={24} />
                <p className="text-sm text-gray-500">Buyout option is currently disabled.</p>
              </div>
            )}
            
            {isEditing && formData.buyout_option && (
              <p className="text-xs text-orange-600 flex items-start gap-1.5 bg-orange-50 p-3 rounded-xl mt-auto border border-orange-100">
                <Info size={14} className="flex-shrink-0 mt-0.5" />
                This amount will be deducted during final settlement. Ensure policies are followed.
              </p>
            )}
          </div>
        </div>

        {/* Knowledge Transfer Card */}
        <div className="bg-white border text-left border-gray-200 rounded-2xl shadow-sm overflow-hidden lg:col-span-2">
          <div className="border-b border-gray-100 bg-gray-50/50 p-4 flex items-center justify-between">
           <div className="flex items-center gap-2">
            <Briefcase className="text-gray-500" size={20} />
            <h3 className="font-semibold text-gray-800">Knowledge Transfer (KT)</h3>
           </div>
           {!isEditing && (
             <span className={`px-3 py-1 rounded-full text-xs font-bold ${
               noticeData.kt_status === 'Completed' ? 'bg-green-100 text-green-700' :
               noticeData.kt_status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
               'bg-gray-100 text-gray-700'
             }`}>
               {noticeData.kt_status}
             </span>
           )}
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                {isEditing ? (
                  <select
                    name="kt_status"
                    value={formData.kt_status}
                    onChange={handleInputChange}
                    className="w-full border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                ) : (
                  <div className="font-medium text-gray-900 bg-gray-50 px-3 py-2.5 rounded-xl">
                    {noticeData.kt_status}
                  </div>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">KT Notes & Remarks</label>
                {isEditing ? (
                  <textarea
                    name="kt_notes"
                    value={formData.kt_notes}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter details about current KT status, to whom it's being given, and pending actions..."
                  />
                ) : (
                  <div className="text-sm text-gray-700 bg-gray-50 px-4 py-3 rounded-xl min-h-[100px] border border-gray-100 whitespace-pre-wrap">
                    {noticeData.kt_notes || <span className="text-gray-400 italic">No notes added.</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
