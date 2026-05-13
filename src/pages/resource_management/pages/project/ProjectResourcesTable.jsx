import React, { useState, useEffect } from "react";
import {
    Users,
    Calendar,
    MapPin,
    Briefcase,
    Clock,
    UserCheck,
    Search,
    Filter,
    AlertTriangle
} from "lucide-react";
import { fetchResourcesByProjectId } from "../../services/resource";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import Pagination from "../../../../components/Pagination/pagination";
import GenericTable from "../../../../components/Table/table";
import { cn } from "@/lib/utils";

const ProjectResourcesTable = ({ projectId, resources = null }) => {
    const [allocations, setAllocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const itemsPerPage = 5;

    const getResourceName = (item) =>
        item.fullName || item.resourceName || item.employeeName || item.name || `Resource ${item.resourceId || ""}`.trim();

    const getResourceEmail = (item) =>
        item.email || item.employeeEmail || item.mail || "--";

    useEffect(() => {
        if (Array.isArray(resources)) {
            setAllocations(resources);
            setError(null);
            setLoading(false);
            setPage(1);
            return;
        }

        const loadResources = async () => {
            try {
                setLoading(true);
                const response = await fetchResourcesByProjectId(projectId);
                if (response.success) {
                    setAllocations(response.data || []);
                } else {
                    setError(response.message || "Failed to fetch resources");
                }
            } catch (err) {
                console.error("Error fetching project resources:", err);
                setError("An error occurred while fetching resources");
            } finally {
                setLoading(false);
            }
        };

        if (projectId) {
            loadResources();
            setPage(1); // Reset page on project change
        }
    }, [projectId, resources]);

    useEffect(() => {
        setPage(1); // Reset page on search
    }, [searchTerm]);

    const filteredAllocations = allocations.filter(item =>
        getResourceName(item).toLowerCase().includes(searchTerm.toLowerCase()) ||
        getResourceEmail(item).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.demandName && item.demandName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getBillableHours = (item) =>
        item.billableHours ?? item.billableHour ?? item.billable ?? item.billableUtilization ?? null;

    const getNonBillableHours = (item) =>
        item.nonBillableHours ?? item.nonBillableHour ?? item.nonBillable ?? item.nonBillableUtilization ?? null;

    const totalPages = Math.ceil(filteredAllocations.length / itemsPerPage);
    const paginatedAllocations = filteredAllocations.slice(
        (page - 1) * itemsPerPage,
        page * itemsPerPage
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <LoadingSpinner />
                <p className="text-sm text-gray-400 font-medium animate-pulse">Loading assigned resources...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3">
                <AlertTriangle className="h-5 w-5" />
                <p className="text-sm font-medium">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="h-5 w-5 text-[#263383]" />
                    Project Resources ({allocations.length})
                </h3>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search resources..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {allocations.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <Users className="text-gray-300 h-8 w-8" />
                    </div>
                    <h4 className="text-base font-bold text-gray-900">No Resources Allocated to the Project.</h4>
                    <p className="text-sm text-gray-500 max-w-[280px] mt-1 leading-relaxed">
                        There are currently no resources assigned to this project.
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto no-scrollbar">
                        <GenericTable
                            headers={["Resource", "Allocation", "Billable Hours", "Non-Billable Hours", "Demand", "Period", "Status", "Created By"]}
                            columns={["resource_info", "allocation_info", "billable_info", "non_billable_info", "demand_info", "period_info", "status_info", "created_by_info"]}
                            rows={paginatedAllocations.map((item) => ({
                                ...item,
                                resource_info: (
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0 border border-blue-100">
                                            {getResourceName(item).split(" ").map(n => n[0]).join("").slice(0, 2)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-900 truncate">{getResourceName(item)}</p>
                                            <p className="text-[10px] text-gray-500 truncate">{getResourceEmail(item)}</p>
                                        </div>
                                    </div>
                                ),
                                allocation_info: (
                                    <div className="flex flex-col items-center gap-1">
                                        <span className={`text-xs font-black ${item.allocationPercentage >= 80 ? "text-red-600" :
                                            item.allocationPercentage >= 50 ? "text-blue-600" : "text-green-600"
                                            }`}>
                                            {item.allocationPercentage}%
                                        </span>
                                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${item.allocationPercentage >= 80 ? "bg-red-500" :
                                                    item.allocationPercentage >= 50 ? "bg-blue-500" : "bg-green-500"
                                                    }`}
                                                style={{ width: `${item.allocationPercentage}%` }}
                                            />
                                        </div>
                                    </div>
                                ),
                                billable_info: (
                                    <div className="text-center">
                                        <span className="text-xs font-bold text-indigo-700">
                                            {getBillableHours(item) ?? "--"}
                                        </span>
                                    </div>
                                ),
                                non_billable_info: (
                                    <div className="text-center">
                                        <span className="text-xs font-bold text-slate-700">
                                            {getNonBillableHours(item) ?? "--"}
                                        </span>
                                    </div>
                                ),
                                demand_info: (
                                    <div className="text-center">
                                        {item.demandName ? (
                                            <span className="text-xs font-bold text-gray-700 truncate max-w-[120px] inline-block" title={item.demandName}>
                                                {item.demandName}
                                            </span>
                                        ) : (
                                            <span className="text-gray-300 italic text-[10px]">No Demand</span>
                                        )}
                                    </div>
                                ),
                                period_info: (
                                    <div className="flex flex-col items-center">
                                        <div className="flex items-center gap-1 text-[10px] text-gray-700 font-bold">
                                            <Calendar className="h-3 w-3 text-red-500" />
                                            <span>{new Date(item.allocationStartDate).toLocaleDateString()}</span>
                                        </div>
                                        <div className="h-2 w-px bg-gray-200 my-0.5" />
                                        <div className="flex items-center gap-1 text-[10px] text-gray-700 font-bold">
                                            <Calendar className="h-3 w-3 text-gray-400" />
                                            <span>{new Date(item.allocationEndDate).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ),
                                status_info: (
                                    <div className="text-center">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${item.allocationStatus === "ACTIVE"
                                            ? "bg-green-50 text-green-700 border border-green-100"
                                            : item.allocationStatus === "PLANNED"
                                                ? "bg-blue-50 text-blue-700 border border-blue-100"
                                                : "bg-gray-50 text-gray-600 border border-gray-100"
                                            }`}>
                                            {item.allocationStatus}
                                        </span>
                                    </div>
                                ),
                                created_by_info: (
                                    <div className="flex items-center justify-center gap-1 text-xs text-gray-600 font-medium bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                        <UserCheck className="h-3 w-3 text-[#263383]" />
                                        <span>{item.createdBy || "System"}</span>
                                    </div>
                                )
                            }))}
                        />
                    </div>

                    {totalPages > 1 && (
                        <div className="py-2 border-t border-gray-100">
                            <Pagination
                                currentPage={page}
                                totalPages={totalPages}
                                onPrevious={() => setPage(p => Math.max(1, p - 1))}
                                onNext={() => setPage(p => Math.min(totalPages, p + 1))}
                            />
                        </div>
                    )}

                    {filteredAllocations.length === 0 && searchTerm && (
                        <div className="p-8 text-center text-gray-500 italic border-t border-gray-100">
                            No resources matching "{searchTerm}"
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProjectResourcesTable;
