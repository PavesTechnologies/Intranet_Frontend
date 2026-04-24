import axios from "axios";

const TMS_API_BASE_URL = window.__APP_CONFIG__?.TIMESHEET_API_ENDPOINT;

export const utilizationService = {
  getRMSSummary: async (startDate, endDate) => {
    try {
      const response = await axios.get(`${TMS_API_BASE_URL}/api/timesheets/RMS/summary`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error) {
      console.error('[Utilization Hub] Failed to load summary:', error);
      throw error;
    }
  },

  getRMSUsers: async (startDate, endDate) => {
    try {
      const response = await axios.get(`${TMS_API_BASE_URL}/api/timesheets/RMS/users`, {
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
    try {
      const response = await axios.post(`${TMS_API_BASE_URL}/api/utilization/report`, params, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('[Reporting Engine] Report generation failed:', error);
      throw error;
    }
  },

  exportUtilizationCSV: async (params) => {
    try {
      const response = await axios.post(`${TMS_API_BASE_URL}/api/utilization/export/csv`, params, {
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
      link.setAttribute('download', `utilization_report_${params.startDate}.csv`);
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
      const response = await axios.post(`${TMS_API_BASE_URL}/api/utilization/export/excel`, params, {
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
      link.setAttribute('download', `utilization_report_${params.startDate}.xlsx`);
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
      const response = await axios.get(`${TMS_API_BASE_URL}/api/utilization/report/quick`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        }
      });
      return response.data;
    } catch (error) {
      console.error('[Reporting Engine] Quick report fetch failed:', error);
      throw error;
    }
  }
};

export const getBillNonBillable = async (startDate, endDate) => {
    try {
        const response = await axios.get(`${TMS_API_BASE_URL}/api/users/hours`, {
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