import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Briefcase,
  Activity,
  TrendingUp,
  TrendingDown,
  Plus,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import Button from "../../../../components/Button/Button";
import Modal from "../../../../components/Modal/modal";
import Pagination from "../../../../components/Pagination/pagination";
import CreateClient from "../../models/CreateClient";
import { useNavigate } from "react-router-dom";
import FilterBar from "../../components/FilterBar";
import { useAuth } from "../../../../contexts/AuthContext";
import { searchClients, getAdminKPI } from "../../services/clientservice";
import { toast } from "react-toastify"; // Removed ToastContainer check
import LoadingSpinner from "../../../../components/LoadingSpinner";
import ExcelJS from "exceljs/dist/exceljs.min.js"; // Robust Vite Import
import { saveAs } from "file-saver";

const priorityColor = {
  HIGH: "text-red-600 bg-red-50",
  MEDIUM: "text-yellow-600 bg-yellow-50",
  LOW: "text-green-600 bg-green-50",
};

const statusColor = {
  ACTIVE: "text-xs text-green-600 font-semibold",
  INACTIVE: "text-xs text-red-600 font-semibold",
  PROSPECT: "text-xs text-blue-600 font-semibold",
};

const AdminPannel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const roles = user?.roles || [];
  const permissions = user?.permissions || [];
  const canCreateClient = roles.includes("Admin");

  const [clientDetails, setClientDetails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [openCreateClient, setOpenCreateClient] = useState(false);
  const [kpiData, setKpiData] = useState(null);

  const [pageInfo, setPageInfo] = useState({
    current: 0,
    size: 8,
    totalElements: 0,
    totalPages: 0,
  });

  const [filters, setFilters] = useState({
    search: "",
    region: "",
    type: "",
    priority: "",
    status: "",
    startDate: "",
    endDate: "",
  });

  const fetchKPIs = async () => {
    try {
      const response = await getAdminKPI();
      if (response.success) setKpiData(response.data);
    } catch (error) {
      console.error("KPI Error:", error);
    }
  };

  const handleFilterUpdate = (updates) => {
    setFilters((prev) => ({ ...prev, ...updates }));
    setPageInfo((prev) => ({ ...prev, current: 0 }));
  };

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const response = await searchClients(
        filters,
        pageInfo.current,
        pageInfo.size,
      );
      if (response.success && response.data) {
        setClientDetails(response.data.records || []);
        setPageInfo((prev) => ({
          ...prev,
          totalElements: response.data.totalElements,
          totalPages: response.data.totalPages,
        }));
      } else {
        setClientDetails([]);
        setPageInfo((prev) => ({ ...prev, totalElements: 0, totalPages: 0 }));
      }
    } catch (error) {
      toast.error("Failed to load clients.");
    } finally {
      setLoading(false);
    }
  }, [filters, pageInfo.current, pageInfo.size]);

  useEffect(() => {
    fetchKPIs();
  }, []);
  useEffect(() => {
    const handler = setTimeout(() => fetchClients(), 400);
    return () => clearTimeout(handler);
  }, [fetchClients]);

  const handleExport = async () => {
    if (pageInfo.totalElements === 0) {
      toast.warning("Nothing to download: Current view is empty.");
      return;
    }

    const isFiltered = Object.values(filters).some((x) => x !== "");
    const startMsg = isFiltered
      ? `Explicitly downloading ${pageInfo.totalElements} filtered records...`
      : `Explicitly downloading full list of ${pageInfo.totalElements} clients...`;

    toast.info(startMsg, { icon: "📊" });

    setExporting(true);
    setExportProgress(0);

    try {
      let allRecords = [];
      let currentPage = 0;
      let totalPagesToFetch = 1;

      while (currentPage < totalPagesToFetch) {
        const response = await searchClients(filters, currentPage, 50);
        if (response.success && response.data) {
          allRecords = [...allRecords, ...response.data.records];
          totalPagesToFetch = response.data.totalPages;
          currentPage++;
          setExportProgress(
            Math.round((currentPage / totalPagesToFetch) * 100),
          );
        } else {
          throw new Error("Batch retrieval interrupted.");
        }
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Inventory");

      worksheet.columns = [
        { header: "CLIENT NAME", key: "clientName", width: 30 },
        { header: "TYPE", key: "clientType", width: 15 },
        { header: "PRIORITY", key: "priorityLevel", width: 15 },
        { header: "COUNTRY", key: "countryName", width: 20 },
        { header: "STATUS", key: "status", width: 15 },
        { header: "CREATED DATE", key: "createdAt", width: 20 },
      ];

      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4F46E5" },
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });

      const rows = allRecords.map((record) => ({
        ...record,
        clientType: record.clientType?.replace(/_/g, " "),
        createdAt: record.createdAt
          ? new Date(record.createdAt).toLocaleDateString()
          : "N/A",
      }));

      worksheet.addRows(rows);

      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = isFiltered ? "Filtered_Clients" : "Full_Inventory";

      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      saveAs(
        blob,
        `${fileName}_${new Date().toISOString().split("T")[0]}.xlsx`,
      );
      toast.success(`Success! ${allRecords.length} records downloaded.`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error(`Download Failed: ${error.message}`);
    } finally {
      setExporting(false);
      setExportProgress(0);
    }
  };

  const KPI_DATA = [
    {
      label: "Total Clients",
      value: kpiData?.totalClients ?? pageInfo.totalElements,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      label: "Active Clients",
      value: kpiData?.activeClients ?? 0,
      icon: Activity,
      color: "text-green-600",
      bg: "bg-green-100",
    },
    {
      label: "Active Projects",
      value: kpiData?.activeProjects ?? 0,
      icon: Briefcase,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
    {
      label: "Growth Rate",
      value: `${kpiData?.growthPercentage ?? 0}%`,
      icon: kpiData?.growthPositive ? TrendingUp : TrendingDown,
      color: kpiData?.growthPositive ? "text-emerald-600" : "text-red-600",
      bg: kpiData?.growthPositive ? "bg-emerald-100" : "bg-red-100",
    },
  ];

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Client Overview
          </h1>
          <p className="text-sm text-gray-500">
            Monitor clients, priorities, and engagement status
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleExport}
            // disabled={exporting}
            // className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center transition-all active:scale-[0.98] 
            //   ${exporting
            //     ? "bg-indigo-400 cursor-not-allowed text-white"
            //     : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
            //   }`}
            variant="primary"
            size="medium"
            loading={exporting}
            loadingText={exporting ? `${exportProgress}%` : "Export Data"}
          >
            {/* {exporting ? (
              <span className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                {exportProgress}%
              </span>
            ) : ( */}
            <>
              <Download className="w-4 h-4 mr-1.5" />
              Export Data
            </>
            {/* )} */}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {KPI_DATA.map((kpi, index) => (
          <div
            key={index}
            className="bg-white p-6 rounded-xl shadow-sm border flex items-center gap-4"
          >
            <div className={`p-3 rounded-full shrink-0 ${kpi.bg}`}>
              <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-500">{kpi.label}</p>
              <h3 className="text-2xl font-bold text-gray-900">{kpi.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Clients Information
          </h2>
          {canCreateClient && (
            <Button
              variant="primary"
              size="medium"
              onClick={() => setOpenCreateClient(true)}
            // className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg flex items-center hover:bg-indigo-700 transition-all active:scale-[0.98] shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1" /> Create New Client
            </Button>
          )}
        </div>

        <FilterBar
          filters={filters}
          onUpdate={handleFilterUpdate}
          totalResults={pageInfo.totalElements}
        />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner text="loading..." />
          </div>
        ) : (
          clientDetails.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {clientDetails.map((client) => (
                  <div
                    key={client.clientId}
                    onClick={() =>
                      navigate(
                        `/resource-management/client-details/${client.clientId}`,
                      )
                    }
                    className="bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-gray-900">
                        {client.clientName}
                      </h3>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${priorityColor[client.priorityLevel] || "bg-gray-50 text-gray-600"}`}
                      >
                        {client.priorityLevel}
                      </span>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-gray-600">
                      <p>
                        <span className="font-medium text-gray-800">Type:</span>{" "}
                        {client.clientType}
                      </p>
                      <p>
                        <span className="font-medium text-gray-800">
                          Country:
                        </span>{" "}
                        {client.countryName}
                      </p>
                      <p>
                        <span className="font-medium text-gray-800">Status:</span>{" "}
                        <span
                          className={`${statusColor[client.status] || "text-gray-600"}`}
                        >
                          {client.status}
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center pt-4">
                <Pagination
                  currentPage={pageInfo.current + 1}
                  totalPages={Math.max(1, pageInfo.totalPages)}
                  onPrevious={() =>
                    setPageInfo((p) => ({ ...p, current: p.current - 1 }))
                  }
                  onNext={() =>
                    setPageInfo((p) => ({ ...p, current: p.current + 1 }))
                  }
                />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-gray-500">No clients found</p>
            </div>
          )
        )}
      </div>

      <Modal
        isOpen={openCreateClient}
        onClose={() => setOpenCreateClient(false)}
        title="Create New Client"
      >
        <CreateClient
          mode="create"
          onSuccess={() => {
            setOpenCreateClient(false);
            fetchClients();
            fetchKPIs();
          }}
        />
      </Modal>
    </div>
  );
};

export default AdminPannel;
