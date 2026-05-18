import api from "../api/axiosInstance";

const EOS_BASE_URL = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;
const TMS_BASE_URL = window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT;
const PMS_BASE_URL = window.__APP_CONFIG__.PMS_BASE_URL;
const LMS_BASE_URL = window.__APP_CONFIG__.BASE_URL;

export const celebrations = async () => {
    try {
        const response = await api.get(`${EOS_BASE_URL}/dashboard/celebrations`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching celebrations:", error);
        throw error;
    }
};

export const timesheet = async () => {
    try {
        const response = await api.get(`${TMS_BASE_URL}/api/dashboard/total_hours`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching timesheet:", error);
        throw error;
    }
};

export const pmsSummary = async (userId) => {
    try {
        const response = await api.get(`${PMS_BASE_URL}/api/my-work/dashboard-summary`, {
            params: {
                userId: userId
            },
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching pms summary:", error);
        throw error;
    }
};

export const todayOnLeave = async () => {
    try {
        const response = await api.get(`${LMS_BASE_URL}/api/leave-requests/dashboard/today-on-leave`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching today on leave:", error);
        throw error;
    }
};

export const leaveBalance = async (employeeId, year) => {
    try {
        const response = await api.get(`${LMS_BASE_URL}/api/leave-balance/employee-dashboard/leave-balance/${employeeId}/${year}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching leave balance:", error);
        throw error;
    }
};