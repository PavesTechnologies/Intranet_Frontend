import { useMemo } from "react";

const useApiConfig = () => {

  const BASE_URL =
    window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL ||
    window.__APP_CONFIG__?.EMPLOYEE_ONBOARDING_URL;

   const headers = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "Content-Type": "application/json",
  };

  return { BASE_URL, headers };
};

export default useApiConfig;
