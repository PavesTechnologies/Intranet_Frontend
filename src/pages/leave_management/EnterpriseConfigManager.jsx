import React, { useState } from 'react';
import { Plus, Save, Trash2, X, CheckCircle, AlertCircle, Edit3, Search, Filter, Download, Upload, RefreshCw, ChevronDown } from 'lucide-react';
import Button from "../../components/Button/Button";
import FormInput from "../../components/forms/FormInput";
import FormSelect from "../../components/forms/FormSelect";
import FormLabel from "../../components/forms/FormLabel";

const EnterpriseConfigManager = () => {
  const [activeTab, setActiveTab] = useState('leave');
  const [message, setMessage] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({});

  const [rules, setRules] = useState({
    leave: [
      { id: 1, actionType: 'LEAVE_APPLICATION', approverType: 'REPORTING_MANAGER', hierarchyMapping: 'DIRECT_MANAGER', level: 1, isParallel: false, status: 'Active' },
      { id: 2, actionType: 'LEAVE_CANCELLATION', approverType: 'HR_MANAGER', hierarchyMapping: 'HR_HIERARCHY', level: 2, isParallel: true, status: 'Active' },
      { id: 3, actionType: 'LEAVE_MODIFICATION', approverType: 'DEPARTMENT_HEAD', hierarchyMapping: 'CUSTOM', level: 1, isParallel: false, status: 'Active' },
    ],
    hr: [
      { id: 1, actionType: 'EMPLOYEE_ONBOARDING', approvalLevel: 1, makerRole: 'HR_ADMIN', checkerRole: 'HR_MANAGER', approvalCondition: 'ALWAYS_REQUIRED', status: 'Active' },
      { id: 2, actionType: 'SALARY_CHANGE', approvalLevel: 2, makerRole: 'HR_MANAGER', checkerRole: 'FINANCE_HEAD', approvalCondition: 'AMOUNT_BASED', status: 'Active' },
    ],
    notification: [
      { ruleId: 1, eventCode: 'LEAVE_APPROVED', ruleName: 'Leave Approval Notification', channels: ['EMAIL', 'SMS'], templateKey: 'leave_approved_template', priority: 1, status: 'Active' },
      { ruleId: 2, eventCode: 'LEAVE_REJECTED', ruleName: 'Leave Rejection Notice', channels: ['EMAIL', 'IN_APP'], templateKey: 'leave_rejected_template', priority: 2, status: 'Active' },
    ],
  });

  const tabConfig = {
    leave: {
      title: 'Leave Approval Rules',
      icon: '✈️',
      description: 'Configure leave request approval workflows',
      fields: [
        { name: 'actionType', label: 'Action Type', type: 'select', options: ['LEAVE_APPLICATION', 'LEAVE_CANCELLATION', 'LEAVE_MODIFICATION'], required: true },
        { name: 'approverType', label: 'Approver Type', type: 'select', options: ['REPORTING_MANAGER', 'HR_MANAGER', 'DEPARTMENT_HEAD', 'SKIP_LEVEL_MANAGER'], required: true },
        { name: 'hierarchyMapping', label: 'Hierarchy Mapping', type: 'select', options: ['DIRECT_MANAGER', 'HR_HIERARCHY', 'CUSTOM', 'MATRIX_HIERARCHY'], required: true },
        { name: 'level', label: 'Level', type: 'number', required: true },
        { name: 'isParallel', label: 'Parallel Approval', type: 'checkbox' },
        { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
      ],
    },
    hr: {
      title: 'HR Tools Rules',
      icon: '👥',
      description: 'Define maker-checker workflows for HR',
      fields: [
        { name: 'actionType', label: 'Action Type', type: 'select', options: ['EMPLOYEE_ONBOARDING', 'SALARY_CHANGE', 'PROMOTION', 'TRANSFER', 'TERMINATION'], required: true },
        { name: 'approvalLevel', label: 'Approval Level', type: 'number', required: true },
        { name: 'makerRole', label: 'Maker Role', type: 'select', options: ['HR_ADMIN', 'HR_MANAGER', 'DEPARTMENT_LEAD', 'RECRUITER'], required: true },
        { name: 'checkerRole', label: 'Checker Role', type: 'select', options: ['HR_MANAGER', 'FINANCE_HEAD', 'CEO', 'COO'], required: true },
        { name: 'approvalCondition', label: 'Approval Condition', type: 'text' },
        { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
      ],
    },
    notification: {
      title: 'Notification Rules',
      icon: '🔔',
      description: 'Manage notification delivery channels',
      fields: [
        { name: 'eventCode', label: 'Event Code', type: 'select', options: ['LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_PENDING', 'SALARY_UPDATED', 'PROFILE_CHANGED'], required: true },
        { name: 'ruleName', label: 'Rule Name', type: 'text', required: true },
        { name: 'channels', label: 'Channels', type: 'multiselect', options: ['EMAIL', 'SMS', 'PUSH', 'IN_APP', 'SLACK'], required: true },
        { name: 'templateKey', label: 'Template Key', type: 'text', required: true },
        { name: 'priority', label: 'Priority', type: 'number', required: true },
        { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
      ],
    },
  };

  const config = tabConfig[activeTab];
  const currentRules = rules[activeTab] || [];
  const filteredRules = currentRules.filter(rule => {
    if (!searchTerm) return true;
    return Object.values(rule).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleAddNew = () => {
    const newData = { status: 'Active' };
    config.fields.forEach(field => {
      if (field.type === 'checkbox') newData[field.name] = false;
      else if (field.type === 'multiselect') newData[field.name] = [];
      else if (field.type === 'number') newData[field.name] = 1;
      else newData[field.name] = '';
    });
    setFormData(newData);
    setShowAddModal(true);
  };

  const handleSaveNew = () => {
    const newRule = { ...formData, id: Date.now() };
    setRules({ ...rules, [activeTab]: [...currentRules, newRule] });
    setShowAddModal(false);
    setFormData({});
    setMessage({ text: 'Rule added successfully', type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleEdit = (rule) => {
    setFormData(rule);
    setEditingRow(rule.id || rule.ruleId);
    setShowAddModal(true);
  };

  const handleUpdate = () => {
    setRules({
      ...rules,
      [activeTab]: currentRules.map(r => 
        (r.id || r.ruleId) === editingRow ? formData : r
      )
    });
    setShowAddModal(false);
    setEditingRow(null);
    setFormData({});
    setMessage({ text: 'Rule updated successfully', type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this rule?')) {
      setRules({
        ...rules,
        [activeTab]: currentRules.filter(r => (r.id || r.ruleId) !== id)
      });
      setMessage({ text: 'Rule deleted successfully', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleFormChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const renderFormField = (field) => {
    const value = formData[field.name];

    if (field.type === 'select') {
      return (
        <FormSelect
          name={field.name}
          options={[
            { value: '', label: `Select ${field.label}` },
            ...field.options.map(opt => ({ value: opt, label: opt.replace(/_/g, ' ') })),
          ]}
          value={value || ''}
          onChange={(e) => handleFormChange(field.name, e.target.value)}
        />
      );
    }

    if (field.type === 'multiselect') {
      return (
        <div className="space-y-2 p-3 border border-slate-300 rounded-lg bg-slate-50 max-h-48 overflow-y-auto">
          {field.options.map(option => (
            <label key={option} className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded transition-colors">
              <input
                type="checkbox"
                checked={(value || []).includes(option)}
                onChange={(e) => {
                  const current = value || [];
                  const updated = e.target.checked
                    ? [...current, option]
                    : current.filter(v => v !== option);
                  handleFormChange(field.name, updated);
                }}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">{option}</span>
            </label>
          ))}
        </div>
      );
    }

    if (field.type === 'checkbox') {
      return (
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={value || false}
            onChange={(e) => handleFormChange(field.name, e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          <span className="ml-3 text-sm text-slate-600">Enable parallel approval</span>
        </label>
      );
    }

    if (field.type === 'number') {
      return (
        <FormInput
          type="number"
          name={field.name}
          value={value || ''}
          onChange={(e) => handleFormChange(field.name, parseInt(e.target.value) || 0)}
          inputClassName="focus:border-blue-500 text-slate-700"
          placeholder={`Enter ${field.label.toLowerCase()}`}
          required={field.required}
          min="0"
        />
      );
    }

    return (
      <FormInput
        type="text"
        name={field.name}
        value={value || ''}
        onChange={(e) => handleFormChange(field.name, e.target.value)}
        inputClassName="focus:border-blue-500 text-slate-700"
        placeholder={`Enter ${field.label.toLowerCase()}`}
        required={field.required}
      />
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Top Navigation */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                C
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Configuration Manager</h1>
                <p className="text-sm text-slate-500">Enterprise Rules Engine</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="px-4 py-2 text-slate-700 hover:bg-slate-100 flex items-center gap-2 text-sm font-medium">
                <Upload className="w-4 h-4" />
                Import
              </Button>
              <Button variant="outline" className="px-4 py-2 text-slate-700 hover:bg-slate-100 flex items-center gap-2 text-sm font-medium">
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Message */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg flex items-center gap-3 shadow-md ${
            message.type === 'success' ? 'bg-green-50 border-l-4 border-green-500' : 'bg-red-50 border-l-4 border-red-500'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
            <span className={`font-medium ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
              {message.text}
            </span>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="border-b border-slate-200">
            <div className="flex">
              {Object.entries(tabConfig).map(([key, tab]) => (
                <button
                  key={key}
                  onClick={() => {
                    setActiveTab(key);
                    setSearchTerm('');
                  }}
                  className={`flex-1 px-6 py-4 font-semibold transition-all relative ${
                    activeTab === key ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xl">{tab.icon}</span>
                    <span>{tab.title}</span>
                  </div>
                  {activeTab === key && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600"></div>}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Header with inline stats */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">{config.title}</h2>
                <p className="text-sm text-slate-500 mb-3">{config.description}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-slate-600">
                    <strong className="text-slate-900">{filteredRules.length}</strong> Total
                  </span>
                  <span className="text-green-600">
                    <strong className="text-green-700">{filteredRules.filter(r => r.status === 'Active').length}</strong> Active
                  </span>
                  <span className="text-slate-500">
                    <strong className="text-slate-700">{filteredRules.filter(r => r.status === 'Inactive').length}</strong> Inactive
                  </span>
                </div>
              </div>
              <Button
                onClick={handleAddNew}
                variant="primary"
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 flex items-center gap-2 shadow-md hover:shadow-lg font-medium"
              >
                <Plus className="w-5 h-5" />
                Add New Rule
              </Button>
            </div>

            {/* Search Bar */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search rules..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <Button variant="outline" className="px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            {/* Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100">
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase w-16">ID</th>
                      {config.fields.map(field => (
                        <th key={field.name} className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase whitespace-nowrap">
                          {field.label}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {filteredRules.map((rule, idx) => {
                      const id = rule.id || rule.ruleId;
                      return (
                        <tr key={id} className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/30 hover:bg-slate-50'}>
                          <td className="px-4 py-4 text-sm font-medium text-slate-900">#{id}</td>
                          {config.fields.map(field => {
                            const value = rule[field.name];
                            return (
                              <td key={field.name} className="px-4 py-4 text-sm text-slate-700 whitespace-nowrap">
                                {field.name === 'status' ? (
                                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    value === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                  }`}>{value}</span>
                                ) : field.type === 'checkbox' ? (
                                  <span className={`inline-flex w-6 h-6 rounded items-center justify-center ${
                                    value ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                                  }`}>{value ? '✓' : '✗'}</span>
                                ) : Array.isArray(value) ? (
                                  <div className="flex flex-wrap gap-1">
                                    {value.map(v => (
                                      <span key={v} className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">{v}</span>
                                    ))}
                                  </div>
                                ) : (
                                  value || '-'
                                )}
                              </td>
                            );
                          })}
                          <td className="px-4 py-4 text-sm">
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleEdit(rule)}
                                variant="outline"
                                size="sm"
                                className="bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center gap-1.5 text-xs font-medium"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                Edit
                              </Button>
                              <Button
                                onClick={() => handleDelete(id)}
                                variant="danger"
                                size="sm"
                                className="bg-red-100 hover:bg-red-200 text-red-700 flex items-center gap-1.5 text-xs font-medium"
                                aria-label="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredRules.length === 0 && (
                      <tr>
                        <td colSpan={config.fields.length + 2} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                              <Search className="w-8 h-8 text-slate-400" />
                            </div>
                            <p className="text-slate-500 font-medium">No rules found</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{config.icon}</span>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {editingRow ? 'Edit Rule' : 'Add New Rule'}
                  </h3>
                  <p className="text-blue-100 text-sm">{config.title}</p>
                </div>
              </div>
              <Button onClick={() => { setShowAddModal(false); setEditingRow(null); setFormData({}); }} variant="ghost" size="icon" aria-label="Close" className="text-white hover:text-white/70">
                <X className="w-6 h-6" />
              </Button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-180px)]">
              {config.fields.map(field => (
                <div key={field.name}>
                  <FormLabel className="mb-2" required={field.required}>
                    {field.label}
                  </FormLabel>
                  {renderFormField(field)}
                </div>
              ))}
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
              <Button
                onClick={() => { setShowAddModal(false); setEditingRow(null); setFormData({}); }}
                variant="outline"
                className="px-6 py-2.5 text-slate-700 font-semibold hover:bg-slate-100"
              >
                Cancel
              </Button>
              <Button
                onClick={editingRow ? handleUpdate : handleSaveNew}
                variant="primary"
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingRow ? 'Update Rule' : 'Save Rule'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnterpriseConfigManager;