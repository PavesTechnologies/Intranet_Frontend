import axios from 'axios';

const TIMESHEET_API_BASE = import.meta.env.VITE_TIMESHEET_API_ENDPOINT || 'http://localhost:5000';

/**
 * Story 1 & 2 Service: Ingests Approved Timesheet Data and calculates accuracy metrics.
 */
export const utilizationService = {
  /**
   * Fetches the RMS utilization summary for a specific user and period.
   * STORY 1: Consume Approved Timesheet Entries
   * STORY 2: Calculate Utilization Percentage Accurately
   */
  getRMSSummary: async (userId, startDate, endDate) => {
    try {
      const response = await axios.get(`${TIMESHEET_API_BASE}/api/timesheets/RMS/summary`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        params: { userId, startDate, endDate }
      });
      console.log('[Utilization Hub] Data successfully internalized:', response.data);
      return response.data;
    } catch (error) {
      console.error('[Utilization Hub] CRITICAL: Failed to load timesheet actuals.');
      console.error('Target URL:', `${TIMESHEET_API_BASE}/api/timesheets/RMS/summary`);
      console.error('Possible Causes: CORS policy blocking, Network unreachable, or incorrect VITE_TIMESHEET_API_ENDPOINT in .env');
      throw error;
    }
  },

  /**
   * Fetches all RMS user utilization data.
   * Returns: userId, name, resourceContext, hourlySplit, trendSignal, finalUtilPercentage
   */
  getRMSUsers: async (startDate, endDate) => {
    try {
      console.log(`[Utilization Hub] Fetching users from: ${TIMESHEET_API_BASE}/api/timesheets/RMS/users`);
      const response = await axios.get(`${TIMESHEET_API_BASE}/api/timesheets/RMS/users`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        params: { startDate, endDate }
      });
      console.log('[Utilization Hub] Users data received:', response.data);
      return response.data;
    } catch (error) {
      console.error('[Utilization Hub] Failed to fetch RMS users.');
      throw error;
    }
  }
};
