import api from "../../../../api/axiosInstance";
export const fetchEmployees = async () => {

  const res = await api.get(
    `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/permanent-employee/core-employee-details/`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    },
  );

  return res.data;
};
