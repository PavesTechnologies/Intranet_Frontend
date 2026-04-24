import { useMemo } from "react";

const useApiConfig = () => {
  const token = localStorage.getItem("token");

  const BASE_URL =
    window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL ||
    window.__APP_CONFIG__?.EMPLOYEE_ONBOARDING_URL;

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    [token],
  );

  return { BASE_URL, headers };
};

export default useApiConfig;
