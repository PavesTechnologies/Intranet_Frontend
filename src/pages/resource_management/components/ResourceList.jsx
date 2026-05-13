// src/pages/resource_management/projects/components/ResourceList.jsx
import React, { useState } from 'react';
import { User, Download } from 'lucide-react';
import Pagination from '../../../components/Pagination/pagination';
import GenericTable from "../../../components/Table/table";

const ResourceList = ({ allocations }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const totalPages = Math.ceil(allocations.length / itemsPerPage);
  const paginatedAllocations = allocations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
            <GenericTable
              headers={["Employee", "Role", "Type", "Allocation", "Duration", "Status"]}
              columns={["employee_info", "role", "type_info", "allocation_info", "duration_info", "status_info"]}
              rows={paginatedAllocations.map((res) => ({
                ...res,
                employee_info: (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                        {res.name.charAt(0)}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-[#081534]">{res.name}</p>
                        <p className="text-xs text-gray-400">{res.id}</p>
                    </div>
                  </div>
                ),
                type_info: <span className="px-2 py-1 bg-gray-100 rounded text-xs">{res.type}</span>,
                allocation_info: (
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-bold text-[#263383]">{res.allocation}%</span>
                    <div className="w-16 h-1 bg-gray-200 rounded-full mt-1">
                        <div className="h-1 bg-[#263383] rounded-full" style={{width: `${res.allocation}%`}}></div>
                    </div>
                  </div>
                ),
                duration_info: (
                  <div className="flex flex-col">
                    <span>{res.start}</span>
                    <span className="text-center italic text-[10px]">to</span>
                    <span>{res.end}</span>
                  </div>
                ),
                status_info: (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                  </span>
                )
              }))}
            />
        </div>
      )}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50/30">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPrevious={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            onNext={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          />
        </div>
      )}
    </div>
  );
};

export default ResourceList;