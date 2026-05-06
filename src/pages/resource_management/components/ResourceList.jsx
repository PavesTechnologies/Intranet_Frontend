// src/pages/resource_management/projects/components/ResourceList.jsx
import React from 'react';
import { User, Download } from 'lucide-react';

const ResourceList = ({ allocations }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-bold text-[#081534]">Active Allocations</h3>
        <button className="flex items-center gap-2 text-sm text-[#263383] hover:underline">
            <Download className="h-4 w-4" /> Export Team
        </button>
      </div>
      
      {allocations.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
            No resources currently allocated to this project.
        </div>
      ) : (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                <th className="px-6 py-3 font-semibold">Employee</th>
                <th className="px-6 py-3 font-semibold">Role</th>
                <th className="px-6 py-3 font-semibold">Type</th>
                <th className="px-6 py-3 font-semibold text-center">Allocation</th>
                <th className="px-6 py-3 font-semibold">Duration</th>
                <th className="px-6 py-3 font-semibold text-right">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {allocations.map((res) => (
                <tr key={res.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                                {res.name.charAt(0)}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-[#081534]">{res.name}</p>
                                <p className="text-xs text-gray-400">{res.id}</p>
                            </div>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{res.role}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs">{res.type}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                            <span className="text-sm font-bold text-[#263383]">{res.allocation}%</span>
                            <div className="w-16 h-1 bg-gray-200 rounded-full mt-1">
                                <div className="h-1 bg-[#263383] rounded-full" style={{width: `${res.allocation}%`}}></div>
                            </div>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                        <div className="flex flex-col">
                            <span>{res.start}</span>
                            <span className="text-center">to</span>
                            <span>{res.end}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                        </span>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      )}
    </div>
  );
};

export default ResourceList;