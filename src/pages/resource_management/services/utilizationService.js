import api from "../../../api/axiosInstance";

const TMS_API_BASE_URL = window.__APP_CONFIG__?.TIMESHEET_API_ENDPOINT;

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const sanitizeParams = (params = {}) => {
  return Object.entries(params).reduce((acc, [key, value]) => {
    if (value === undefined || value === null || value === "") return acc;
    if (Array.isArray(value)) {
      if (value.length) acc[key] = value.join(",");
      return acc;
    }
    acc[key] = value;
    return acc;
  }, {});
};

const toDateParams = (startDate, endDate, extra = {}) => {
  if (startDate && typeof startDate === "object") {
    return sanitizeParams(startDate);
  }
  return sanitizeParams({ ...extra, startDate, endDate });
};

const getUtilization = async (path, params = {}) => {
  const response = await api.get(`${TMS_API_BASE_URL}${path}`, {
    headers: getAuthHeaders(),
    params: sanitizeParams(params),
  });
  return response.data;
};

export const utilizationService = {
  getUtilizationSummary: async (params = {}) => {
    try {
      return await getUtilization("/api/utilization/summary", params);
    } catch (error) {
      console.error('[Utilization Hub] Failed to load summary:', error);
      throw error;
    }
  },

  getUtilizationTrends: async (params = {}) => {
    try {
      return await getUtilization("/api/utilization/trends", params);
    } catch (error) {
      console.error('[Utilization Hub] Failed to load trends:', error);
      throw error;
    }
  },

  getUtilizationResources: async (params = {}) => {
    try {
      return await getUtilization("/api/utilization/resources", params);
    } catch (error) {
      console.error('[Utilization Hub] Failed to load resources:', error);
      throw error;
    }
  },

  getUtilizationProjects: async (params = {}) => {
    try {
      return await getUtilization("/api/utilization/projects", params);
    } catch (error) {
      console.error('[Utilization Hub] Failed to load projects:', error);
      throw error;
    }
  },

  getUtilizationClients: async (params = {}) => {
    try {
      return await getUtilization("/api/utilization/clients", params);
    } catch (error) {
      console.error('[Utilization Hub] Failed to load clients:', error);
      throw error;
    }
  },

  getUtilizationRoles: async (params = {}) => {
    try {
      return await getUtilization("/api/utilization/roles", params);
    } catch (error) {
      console.error('[Utilization Hub] Failed to load roles:', error);
      throw error;
    }
  },

  getUtilizationAnalytics: async (params = {}) => {
    try {
      return await getUtilization("/api/utilization/analytics", params);
    } catch (error) {
      console.error('[Utilization Hub] Failed to load portfolio analytics:', error);
      throw error;
    }
  },

  getUtilizationAlerts: async (params = {}) => {
    try {
      return await getUtilization("/api/utilization/alerts", params);
    } catch (error) {
      if (error.response?.status === 404) {
        return await getUtilization("/api/utilization/alrets", params);
      }
      console.error('[Utilization Hub] Failed to load alerts:', error);
      throw error;
    }
  },

  getRMSSummary: async (startDate, endDate) => {
    return utilizationService.getUtilizationSummary(toDateParams(startDate, endDate));
  },

  getRMSTrends: async (startDate, endDate) => {
    return utilizationService.getUtilizationTrends(toDateParams(startDate, endDate));
  },

  getRMSResources: async (page = 0, size = 20, startDate, endDate, params = {}) => {
    if (page && typeof page === "object") {
      return utilizationService.getUtilizationResources(page);
    }
    return utilizationService.getUtilizationResources({ ...params, page, size, startDate, endDate });
  },

  getRMSPortfolioAnalytics: async (startDate, endDate) => {
    return utilizationService.getUtilizationAnalytics(toDateParams(startDate, endDate));
  },

  getRMSUsers: async (startDate, endDate) => {
    try {
      const response = await api.get(`${TMS_API_BASE_URL}/api/timesheets/RMS/users`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error) {
      console.error('[Utilization Hub] Failed to fetch users:', error);
      return [];
    }
  },

  generateUtilizationReport: async (params) => {
    const reportType = params?.reportType || 'SUMMARY';
    if (reportType === 'RESOURCE') return utilizationService.getUtilizationResources(params);
    if (reportType === 'PROJECT') return utilizationService.getUtilizationProjects(params);
    if (reportType === 'CLIENT') return utilizationService.getUtilizationClients(params);
    if (reportType === 'ROLE') return utilizationService.getUtilizationRoles(params);
    if (reportType === 'ANALYTICS') return utilizationService.getUtilizationAnalytics(params);
    if (reportType === 'ALERTS' || reportType === 'ANOMALIES') return utilizationService.getUtilizationAlerts(params);
    return utilizationService.getUtilizationSummary(params);
  },

  exportUtilizationCSV: async (params) => {
    try {
      const exportParams = { reportType: 'SUMMARY', ...(params || {}) };
      const response = await api.post(`${TMS_API_BASE_URL}/api/utilization/export/csv`, exportParams, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `utilization_report_${exportParams.startDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[Export] CSV failed:', error);
      throw error;
    }
  },

  exportUtilizationExcel: async (params) => {
    try {
      const exportParams = { reportType: 'SUMMARY', ...(params || {}) };
      const response = await api.post(`${TMS_API_BASE_URL}/api/utilization/export/excel`, exportParams, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `utilization_report_${exportParams.startDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[Export] Excel failed:', error);
      throw error;
    }
  },

  getQuickUtilizationReport: async () => {
    try {
      return await utilizationService.getUtilizationSummary();
    } catch (error) {
      console.error('[Reporting Engine] Quick report fetch failed:', error);
      throw error;
    }
  }
};

utilizationService.generateReport = utilizationService.generateUtilizationReport;

export const getBillNonBillable = async (startDate, endDate) => {
    try {
        const response = await api.get(`${TMS_API_BASE_URL}/api/users/hours`, {
            params: {
                startDate: startDate,
                endDate: endDate,
            },
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching bill non-billable:", error);
        throw error;
    }
};

export const getResourceProjects = async (resourceId) => {
    try {
        const response = await api.get(`${TMS_API_BASE_URL}/api/users/${resourceId}/project-details`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching resource projects:", error);
        throw error;
    }
};
