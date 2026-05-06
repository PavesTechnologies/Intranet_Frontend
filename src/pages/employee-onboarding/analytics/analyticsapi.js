export const fetchDashboardAnalytics = async () => {
  try {
    const token = localStorage.getItem("token"); // or your auth store

    const response = await fetch(
      `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/api/analytics/dashboard`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // ✅ ADD THIS
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

// export const demographicsMock = {
//   total: 26,

//   gender: [
//     { label: "Female", value: 9, color: "#b57bb5" },
//     { label: "Male", value: 17, color: "#5b8def" },
//   ],

//   employmentType: [
//     { label: "Full Time", value: 26, color: "#59b3b8" },
//   ],

//   workerType: [
//     { label: "Permanent", value: 20, color: "#6cc070" },
//     { label: "Contract", value: 6, color: "#f2a65a" },
//   ],

//   nationality: [
//     { label: "India", value: 24, color: "#5b8def" },
//     { label: "Other", value: 2, color: "#d97b7b" },
//   ],

//   ageGroups: [
//     { group: "18-21", female: 1, male: 2 },
//     { group: "22-25", female: 6, male: 12 },
//     { group: "26-30", female: 2, male: 0 },
//     { group: "31-40", female: 0, male: 2 },
//     { group: "41-55", female: 0, male: 1 },
//   ],

//   experience: [
//     { range: "0-1", value: 24 },
//     { range: "1-2", value: 2 },
//   ],
// };

// export const workerDeptData = [
//   { dept: "Accounts", permanent: 0, contingent: 0 },
//   { dept: "Administration", permanent: 3, contingent: 0 },
//   { dept: "Engineering", permanent: 20, contingent: 0 },
//   { dept: "Human Resources", permanent: 2, contingent: 1 },
// ];

// /* ================= GENDER ACROSS DEPARTMENT ================= */

// export const genderDeptData = [
//   { dept: "Accounts", female: 0, male: 0 },
//   { dept: "Administration", female: 1, male: 2 },
//   { dept: "Engineering", female: 7, male: 13 },
//   { dept: "Human Resources", female: 2, male: 1 },
// ];

// /* ================= EMPLOYMENT TYPE ACROSS DEPARTMENT ================= */

// export const employmentDeptData = [
//   { dept: "Accounts", full: 0 },
//   { dept: "Administration", full: 3 },
//   { dept: "Engineering", full: 20 },
//   { dept: "Human Resources", full: 3 },
// ];
