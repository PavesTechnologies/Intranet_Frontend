export const fetchDashboardAnalytics = async () => {
  try {

    const response = await api.get(
      `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/api/analytics/dashboard`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`, // ✅ ADD THIS
        },
      },
    );

    console.log("Status:", response.status);

    if (!response.ok) {
      const err = await response.text();
      console.error("Backend error:", err);
      throw new Error("Failed to fetch analytics data");
    }

    return await response.json();
  } catch (error) {
    console.error("Analytics API Error:", error);
    return null;
  }
};

