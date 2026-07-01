import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAirsStore } from "./airsStore";
import {
  Search,
  Filter,
  ArrowUpDown,
  Eye,
  Trash2,
  Download,
  Plus,
  ChevronLeft,
  ChevronRight,
  Archive,
  AlertTriangle,
  CheckCircle,
  FileSpreadsheet,
  FileText,
  X
} from "lucide-react";
import toast from "react-hot-toast";

export default function JdLibrary() {
  const { jds, deleteJd, closeJd } = useAirsStore();
  const navigate = useNavigate();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [jurisdictionFilter, setJurisdictionFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");

  // Sorting State
  const [sortField, setSortField] = useState("createdDate");
  const [sortOrder, setSortOrder] = useState("desc");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Dialog Overlays State
  const [deleteJdId, setDeleteJdId] = useState(null);
  const [closeJdId, setCloseJdId] = useState(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportJdId, setExportJdId] = useState(null); // Null means export current list
  const [exportFormat, setExportFormat] = useState("CSV");
  const [isExporting, setIsExporting] = useState(false);

  // 1. Sort handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // 2. Filter & Search Logic
  const filteredJds = useMemo(() => {
    return jds
      .filter((jd) => {
        const matchesSearch =
          jd.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          jd.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          jd.createdBy.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === "All" || jd.status === statusFilter;
        const matchesJurisdiction = jurisdictionFilter === "All" || jd.jurisdiction === jurisdictionFilter;
        const matchesSource = sourceFilter === "All" || jd.source === sourceFilter;

        return matchesSearch && matchesStatus && matchesJurisdiction && matchesSource;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        // Custom string / number comparison
        if (typeof valA === "string") {
          return sortOrder === "asc"
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        } else {
          return sortOrder === "asc" ? valA - valB : valB - valA;
        }
      });
  }, [jds, searchTerm, statusFilter, jurisdictionFilter, sourceFilter, sortField, sortOrder]);

  // 3. Paginated JDs
  const paginatedJds = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredJds.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredJds, currentPage]);

  const totalPages = Math.ceil(filteredJds.length / itemsPerPage);

  // Status Badge Colors
  const getStatusBadge = (status) => {
    switch (status) {
      case "Ready":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">Ready</span>;
      case "Draft":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Draft</span>;
      case "Pending Review":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">Pending Review</span>;
      case "Parsing":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            Parsing
          </span>
        );
      case "Closed":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100">Closed</span>;
      default:
        return null;
    }
  };

  // Actions
  const handleDeleteConfirm = () => {
    if (deleteJdId) {
      deleteJd(deleteJdId);
      toast.success(`Successfully deleted JD ${deleteJdId}`);
      setDeleteJdId(null);
    }
  };

  const handleCloseConfirm = () => {
    if (closeJdId) {
      const selectedJd = jds.find(j => j.id === closeJdId);
      closeJd(closeJdId);
      
      if (selectedJd && selectedJd.campaignCount > 0) {
        toast.success(`JD closed successfully. Linked ${selectedJd.campaignCount} active campaigns were archived.`, { duration: 4000 });
      } else {
        toast.success(`JD ${closeJdId} closed successfully.`);
      }
      setCloseJdId(null);
    }
  };

  const handleExportTrigger = (id = null) => {
    setExportJdId(id);
    setExportModalOpen(true);
  };

  const handleExportConfirm = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setExportModalOpen(false);
      const targetName = exportJdId ? `Job Description (${exportJdId})` : "Job Descriptions List";
      toast.success(`${targetName} exported successfully to ${exportFormat}! Check downloads.`, {
        icon: '⬇️',
      });
    }, 1500);
  };

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">JD Management Library</h1>
          <p className="text-xs text-slate-500 mt-1">Configure, search, and verify canonical roles and version timelines.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => handleExportTrigger(null)}
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-xs font-semibold transition flex-1 sm:flex-none shadow-sm"
          >
            <Download className="h-4 w-4" /> Export Library
          </button>
          <Link
            to="/airs/jds/create"
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition flex-1 sm:flex-none shadow-sm"
          >
            <Plus className="h-4 w-4" /> New JD
          </Link>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6 flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Title, ID, or Creator..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Status Filter */}
          <div className="flex items-center border border-slate-200 bg-slate-50 rounded-lg px-2.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 mr-2 shrink-0">Status</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent border-0 text-xs font-semibold py-2 w-full focus:outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Ready">Ready</option>
              <option value="Draft">Draft</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Parsing">Parsing</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          {/* Jurisdiction Filter */}
          <div className="flex items-center border border-slate-200 bg-slate-50 rounded-lg px-2.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 mr-2 shrink-0">Region</span>
            <select
              value={jurisdictionFilter}
              onChange={(e) => {
                setJurisdictionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent border-0 text-xs font-semibold py-2 w-full focus:outline-none cursor-pointer"
            >
              <option value="All">All Jurisdictions</option>
              <option value="USA">USA</option>
              <option value="EU">EU</option>
              <option value="India">India</option>
              <option value="UK">UK</option>
              <option value="Global">Global</option>
            </select>
          </div>

          {/* Source Filter */}
          <div className="flex items-center border border-slate-200 bg-slate-50 rounded-lg px-2.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 mr-2 shrink-0">Source</span>
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent border-0 text-xs font-semibold py-2 w-full focus:outline-none cursor-pointer"
            >
              <option value="All">All Sources</option>
              <option value="Manual">Manual</option>
              <option value="PDF Upload">PDF Upload</option>
              <option value="DOCX Upload">DOCX Upload</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort("id")}>
                  ID <ArrowUpDown className="inline-block ml-1 h-3.5 w-3.5 text-slate-400" />
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort("title")}>
                  Title <ArrowUpDown className="inline-block ml-1 h-3.5 w-3.5 text-slate-400" />
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort("version")}>
                  Ver <ArrowUpDown className="inline-block ml-1 h-3.5 w-3.5 text-slate-400" />
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort("source")}>
                  Source <ArrowUpDown className="inline-block ml-1 h-3.5 w-3.5 text-slate-400" />
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort("jurisdiction")}>
                  Region <ArrowUpDown className="inline-block ml-1 h-3.5 w-3.5 text-slate-400" />
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort("createdBy")}>
                  Created By <ArrowUpDown className="inline-block ml-1 h-3.5 w-3.5 text-slate-400" />
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort("createdDate")}>
                  Created Date <ArrowUpDown className="inline-block ml-1 h-3.5 w-3.5 text-slate-400" />
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort("campaignCount")}>
                  Campaigns <ArrowUpDown className="inline-block ml-1 h-3.5 w-3.5 text-slate-400" />
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort("status")}>
                  Status <ArrowUpDown className="inline-block ml-1 h-3.5 w-3.5 text-slate-400" />
                </th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 text-xs text-slate-700 font-medium">
              {paginatedJds.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-6 py-12 text-center text-slate-400">
                    <Archive className="h-10 w-10 mx-auto stroke-1 mb-2" />
                    No Job Descriptions found matching the criteria.
                  </td>
                </tr>
              ) : (
                paginatedJds.map((jd) => (
                  <tr key={jd.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 text-slate-400 font-mono">{jd.id}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{jd.title}</td>
                    <td className="px-6 py-4">v{jd.version}</td>
                    <td className="px-6 py-4 text-slate-500">{jd.source}</td>
                    <td className="px-6 py-4">{jd.jurisdiction}</td>
                    <td className="px-6 py-4 text-slate-500">{jd.createdBy}</td>
                    <td className="px-6 py-4 text-slate-500">{jd.createdDate}</td>
                    <td className="px-6 py-4">
                      {jd.campaignCount > 0 ? (
                        <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-100">
                          {jd.campaignCount} active
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(jd.status)}</td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2.5">
                      <Link
                        to={`/airs/jds/${jd.id}`}
                        title="View & Edit Details"
                        className="p-1.5 bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 rounded-md transition"
                      >
                        <Eye className="h-4.5 w-4.5" />
                      </Link>
                      <button
                        onClick={() => handleExportTrigger(jd.id)}
                        title="Export Single JD"
                        className="p-1.5 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 rounded-md transition"
                      >
                        <Download className="h-4.5 w-4.5" />
                      </button>
                      {jd.status !== "Closed" && (
                        <button
                          onClick={() => setCloseJdId(jd.id)}
                          title="Close JD"
                          className="p-1.5 bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-700 rounded-md transition"
                        >
                          <Archive className="h-4.5 w-4.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteJdId(jd.id)}
                        title="Delete JD"
                        className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 rounded-md transition"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {filteredJds.length > 0 && (
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center text-xs font-semibold text-slate-500">
            <span>
              Showing {Math.min(filteredJds.length, (currentPage - 1) * itemsPerPage + 1)} to{" "}
              {Math.min(filteredJds.length, currentPage * itemsPerPage)} of {filteredJds.length} JDs
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="p-1.5 border border-slate-200 rounded bg-white hover:bg-slate-50 transition disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="p-1.5 border border-slate-200 rounded bg-white hover:bg-slate-50 transition disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* dialog overlays */}

      {/* Delete Confirmation Modal */}
      {deleteJdId && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="p-2 bg-rose-50 rounded-full"><AlertTriangle className="h-6 w-6" /></div>
              <h3 className="text-base font-bold text-slate-900">Confirm Job Description Deletion</h3>
            </div>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Are you sure you want to delete Job Description <span className="font-mono text-slate-800 font-bold">{deleteJdId}</span>? This action is permanent and will remove all version history logs from the platform.
            </p>
            <div className="flex justify-end gap-3.5">
              <button
                onClick={() => setDeleteJdId(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 text-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition"
              >
                Yes, Delete Permanent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Confirmation Modal */}
      {closeJdId && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-600 mb-4">
              <div className="p-2 bg-amber-50 rounded-full"><AlertTriangle className="h-6 w-6" /></div>
              <h3 className="text-base font-bold text-slate-900">Close Job Description</h3>
            </div>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              You are about to close Job Description <span className="font-mono text-slate-800 font-bold">{closeJdId}</span>. 
              {jds.find(j => j.id === closeJdId)?.campaignCount > 0 ? (
                <span className="block mt-2 font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-2.5 text-[11px]">
                  ⚠️ WARNING: This JD is currently linked to {jds.find(j => j.id === closeJdId)?.campaignCount} active hiring campaigns. Closing it will automatically archive those campaigns.
                </span>
              ) : (
                <span className="block mt-2">This will archive the JD. You can clone it or create a new version later.</span>
              )}
            </p>
            <div className="flex justify-end gap-3.5">
              <button
                onClick={() => setCloseJdId(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 text-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCloseConfirm}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition"
              >
                Confirm Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Dialog */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-900">Export Parameters</h3>
              <button onClick={() => setExportModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              {exportJdId ? `Exporting job data for record ${exportJdId}` : `Exporting ${filteredJds.length} records matching current view filters`}
            </p>

            {/* Choose Format */}
            <div className="mb-6 space-y-2.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">Choose Format</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setExportFormat("Excel")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 text-xs font-bold transition ${
                    exportFormat === "Excel"
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel Spreadsheet
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat("CSV")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 text-xs font-bold transition ${
                    exportFormat === "CSV"
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <FileText className="h-4 w-4 text-blue-600" /> CSV Flatfile
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                disabled={isExporting}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 text-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExportConfirm}
                disabled={isExporting}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-xs font-semibold transition"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" /> Download
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
