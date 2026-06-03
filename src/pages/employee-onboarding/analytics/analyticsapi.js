import api from "../../../api/axiosInstance";

export const fetchDashboardAnalytics = async () => {
  try {
    const token = localStorage.getItem("token"); // or your auth store
    const response = await api.get(
          `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/analytics/dashboard`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
    return response.data;
  } catch (error) {
    console.error("Analytics API Error:", error);
    return null;
  }
};
