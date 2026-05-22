import axios from 'axios';

const TIMESHEET_API_BASE = window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT;  

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
  const response = await axios.get(`${TIMESHEET_API_BASE}${path}`, {
    headers: getAuthHeaders(),
    params: sanitizeParams(params),
  });
  return response.data;
};

/**
 * Story 1 & 2 Service: Ingests Approved Timesheet Data and calculates accuracy metrics.
 */
export const utilizationService = {
  /**
   * Fetches the RMS utilization summary for a specific user and period.
   * STORY 1: Consume Approved Timesheet Entries
   * STORY 2: Calculate Utilization Percentage Accurately
   */
  getUtilizationSummary: async (params = {}) => {
    try {
      const data = await getUtilization("/api/utilization/summary", params);
      console.log('[Utilization Hub] Summary successfully internalized:', data);
      return data;
    } catch (error) {
      console.error('[Utilization Hub] CRITICAL: Failed to load utilization summary.');
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

  /**
   * Fetches the detailed utilization metrics for all RMS users.
   */
  getRMSUsers: async (startDate, endDate) => {
    try {
      const response = await axios.get(`${TIMESHEET_API_BASE}/api/timesheets/RMS/users`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error) {
      console.error('[Utilization Hub] Failed to fetch RMS users metrics:', error);
      return [];
    }
  },

  /**
   * HIGH-FIDELITY REPORTING ENGINE (STORY 10-12)
   * Dispatches structured intelligence requests to the new reporting endpoint.
   */
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

  /**
   * EXPORT ENGINE: CSV
   */
  exportUtilizationCSV: async (params) => {
    try {
      const exportParams = { reportType: 'SUMMARY', ...(params || {}) };
      const response = await axios.post(`${TIMESHEET_API_BASE}/api/utilization/export/csv`, exportParams, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `utilization_report_${exportParams.startDate}_to_${exportParams.endDate}.csv`);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error('[Export Engine] CSV Dispatch Failed:', error);
      throw error;
    }
  },

  /**
   * EXPORT ENGINE: Excel
   */
  exportUtilizationExcel: async (params) => {
    try {
      const exportParams = { reportType: 'SUMMARY', ...(params || {}) };
      const response = await axios.post(`${TIMESHEET_API_BASE}/api/utilization/export/excel`, exportParams, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `utilization_report_${exportParams.startDate}_to_${exportParams.endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error('[Export Engine] Excel Dispatch Failed:', error);
      throw error;
    }
  }
};

// --- ALIASES FOR DASHBOARD COMPATIBILITY ---
utilizationService.generateReport = utilizationService.generateUtilizationReport;

export const getBillNonBillable = async (startDate, endDate) => {
  try {
    const response = await axios.get(`${TIMESHEET_API_BASE}/api/timesheets/RMS/users`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      params: { startDate, endDate }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to load bill/non-bill metrics:', error);
    return [];
  }
};

export default utilizationService;
