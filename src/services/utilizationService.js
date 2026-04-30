import axios from 'axios';

const TIMESHEET_API_BASE = window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT;  

/**
 * Story 1 & 2 Service: Ingests Approved Timesheet Data and calculates accuracy metrics.
 */
export const utilizationService = {
  /**
   * Fetches the RMS utilization summary for a specific user and period.
   * STORY 1: Consume Approved Timesheet Entries
   * STORY 2: Calculate Utilization Percentage Accurately
   */
  getRMSSummary: async (startDate, endDate) => {
    try {
      const response = await axios.get(`${TIMESHEET_API_BASE}/api/timesheets/RMS/summary`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        params: { startDate, endDate }
      });
      console.log('[Utilization Hub] Data successfully internalized:', response.data);
      return response.data;
    } catch (error) {
      console.error('[Utilization Hub] CRITICAL: Failed to load timesheet actuals.');
      throw error;
    }
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
    try {
      const response = await axios.post(`${TIMESHEET_API_BASE}/api/utilization/report`, params, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('[Reporting Engine] Failed to compile intelligence report:', error);
      throw error;
    }
  },

  /**
   * EXPORT ENGINE: CSV
   */
  exportUtilizationCSV: async (params) => {
    try {
      const response = await axios.post(`${TIMESHEET_API_BASE}/api/utilization/export/csv`, params, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `utilization_report_${params.startDate}_to_${params.endDate}.csv`);
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
      const response = await axios.post(`${TIMESHEET_API_BASE}/api/utilization/export/excel`, params, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `utilization_report_${params.startDate}_to_${params.endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error('[Export Engine] Excel Dispatch Failed:', error);
      throw error;
    }
  }
};

// --- ALIASES FOR DASHBOARD COMPATIBILITY ---
utilizationService.getUtilizationSummary = utilizationService.getRMSSummary;
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
