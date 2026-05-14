export const fetchEmployees = async () => {

  const res = await fetch(
    `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/permanent-employee/core-employee-details/`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    },
  );

  if (!res.ok) throw new Error("Failed to fetch employees");

  return res.json();
};
