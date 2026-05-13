import axios from "axios";

const EOS_BASE_URL = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;

export const celebrations = async () => {
    try {
        const response = await axios.get(`${EOS_BASE_URL}/dashboard/celebrations`, {
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