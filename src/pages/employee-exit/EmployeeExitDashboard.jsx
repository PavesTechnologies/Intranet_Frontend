import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Filter, 
  ChevronRight,
  ClipboardList,
  CheckCircle,
  Clock,
  Briefcase
} from 'lucide-react';
import { exit_list, employees } from './data/mockData';

export default function EmployeeExitDashboard() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Enriched data combining exit_list and employees
  const enrichedExits = exit_list.map(exit => {
    const emp = employees.find(e => e.employee_uuid === exit.employee_uuid);
    return { ...exit, employee: emp };
  });

  const filteredExits = enrichedExits.filter(exit => {
    const matchesSearch = exit.employee?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          exit.employee?.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || exit.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // KPI Calculations
  const totalExits = exit_list.length;
  const pendingApprovals = exit_list.filter(e => e.status === 'Approvals').length;
  const clearancePending = exit_list.filter(e => e.status === 'Clearance').length;
  const completed = exit_list.filter(e => e.status === 'Completed').length;

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'Approvals': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Clearance': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Settlement': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Documents': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Exit Management</h1>
          <p className="text-gray-500 mt-1">Manage employee offboarding, clearances, and settlements.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="bg-blue-50 p-3 rounded-xl text-blue-600"><Users size={24} /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Exits</p>
            <p className="text-2xl font-bold text-gray-900">{totalExits}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="bg-amber-50 p-3 rounded-xl text-amber-600"><Clock size={24} /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Pending Approvals</p>
            <p className="text-2xl font-bold text-gray-900">{pendingApprovals}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="bg-purple-50 p-3 rounded-xl text-purple-600"><ClipboardList size={24} /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Clearance Pending</p>
            <p className="text-2xl font-bold text-gray-900">{clearancePending}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="bg-green-50 p-3 rounded-xl text-green-600"><CheckCircle size={24} /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Completed</p>
            <p className="text-2xl font-bold text-gray-900">{completed}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-800">Active Exit Requests</h2>
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search employee..." 
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select 
                className="pl-10 pr-8 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white font-medium text-gray-700"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Approvals">Approvals</option>
                <option value="Clearance">Clearance</option>
                <option value="Settlement">Settlement</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider font-semibold border-b border-gray-100">
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Exit Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredExits.length > 0 ? (
                filteredExits.map((exit) => (
                  <tr key={exit.exit_uuid} className="hover:bg-gray-50/50 transition-colors group cursor-pointer" onClick={() => navigate(`/employee-exit/${exit.exit_uuid}`)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
                          {exit.employee?.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{exit.employee?.name}</p>
                          <p className="text-xs text-gray-500">{exit.employee?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Briefcase size={14} className="text-gray-400"/>
                        <span className="font-medium text-sm">{exit.department}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                      {new Date(exit.exit_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(exit.status)}`}>
                        {exit.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center justify-end gap-1 w-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/employee-exit/${exit.exit_uuid}`);
                        }}
                      >
                        View Details <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No exit records found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
