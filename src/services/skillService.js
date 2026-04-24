// const BASE_URL = window.__APP_CONFIG__.RMS_BASE_URL;

// const getAuthHeaders = () => {
//   const token = localStorage.getItem("token");

//   if (!token) {
//     console.error("❌ No token found in localStorage");
//     return {
//       "Content-Type": "application/json",
//     };
//   }

//   return {
//     "Content-Type": "application/json",
//     Authorization: `Bearer ${token}`,
//   };
// };

// export const skillService = {
//   getSkillTree: async () => {
//     try {
//       const res = await fetch(`${BASE_URL}/api/skill-categories/tree`, {
//         method: "GET",
//         headers: getAuthHeaders(),
//       });
//       if (!res.ok) throw new Error(`Skill tree HTTP error! status: ${res.status}`);
//       return await res.json();
//     } catch (e) {
//       console.error("getSkillTree error:", e);
//       throw e;
//     }
//   },

//   getProficiencies: async () => {
//     try {
//       const res = await fetch(`${BASE_URL}/api/proficiency/get-all-proficiency-levels`, {
//         method: "GET",
//         headers: getAuthHeaders(),
//       });
//       if (!res.ok) throw new Error(`Proficiency HTTP error! status: ${res.status}`);
//       return await res.json();
//     } catch (e) {
//       console.error("getProficiencies error:", e);
//       throw e;
//     }
//   },

//   getEmployeeSkills: async (resourceId) => {
//     try {
//       const res = await fetch(`${BASE_URL}/api/resource-skills/resource/${resourceId}/profile`, {
//         method: "GET",
//         headers: getAuthHeaders(),
//       });
//       if (!res.ok) {
//           if(res.status === 404 || res.status === 400 || res.status === 500) return { success: true, data: [] }; 
//           throw new Error(`Profile HTTP error! status: ${res.status}`);
//       }
//       return await res.json();
//     } catch (e) {
//       console.error("getEmployeeSkills error:", e);
//       // Fallback instead of crashing the modal
//       return { success: true, data: [] };
//     }
//   },

//   saveBulkSkills: async (payload) => {
//     const res = await fetch(`${BASE_URL}/api/resource-skills/bulk`, {
//       method: "POST",
//       headers: getAuthHeaders(),
//       body: JSON.stringify(payload),
//     });
//     if (!res.ok) {
//       const errorData = await res.json().catch(() => null);
//       throw new Error(errorData?.message || "Failed to save skills");
//     }
//     return res.json();
//   },

//   // Sub-skills
//   saveSubSkill: async (payload) => {
//     const res = await fetch(`${BASE_URL}/api/resource-skills/subskill`, {
//       method: "POST",
//       headers: getAuthHeaders(),
//       body: JSON.stringify(payload),
//     });
//     if (!res.ok) {
//       const errorData = await res.json().catch(() => null);
//       throw new Error(errorData?.message || "Failed to save sub-skill");
//     }
//     return res.json();
//   },

//   updateSkill: async (resourceSkillId, payload) => {
//     const res = await fetch(`${BASE_URL}/api/resource-skills/skill/${resourceSkillId}`, {
//       method: "PUT",
//       headers: getAuthHeaders(),
//       body: JSON.stringify(payload),
//     });
//     if (!res.ok) {
//       const errorData = await res.json().catch(() => null);
//       throw new Error(errorData?.message || "Failed to update skill");
//     }
//     if (res.status === 204) return true;
//     return await res.json().catch(() => true);
//   },

//   updateSubSkill: async (resourceSubSkillId, payload) => {
//     const res = await fetch(`${BASE_URL}/api/resource-skills/subskill/${resourceSubSkillId}`, {
//       method: "PUT",
//       headers: getAuthHeaders(),
//       body: JSON.stringify(payload),
//     });
//     if (!res.ok) {
//       const errorData = await res.json().catch(() => null);
//       throw new Error(errorData?.message || "Failed to update sub-skill");
//     }
//     if (res.status === 204) return true;
//     return await res.json().catch(() => true);
//   },

//   // Certifications
//   getCertificates: async () => {
//     try {
//       const res = await fetch(`${BASE_URL}/api/certificates`, {
//         method: "GET",
//         headers: getAuthHeaders(),
//       });
//       if (!res.ok) throw new Error(`Certificates HTTP error! status: ${res.status}`);
//       return await res.json();
//     } catch (e) {
//       console.error("getCertificates error:", e);
//       return { success: true, data: [] };
//     }
//   },

//   getEmployeeCertificates: async (resourceId) => {
//     try {
//       const res = await fetch(`${BASE_URL}/api/resource-certificates/resource/${resourceId}`, {
//         method: "GET",
//         headers: getAuthHeaders(),
//       });
//       if (!res.ok) {
//           if (res.status === 404 || res.status === 400) return { success: true, data: [] };
//           throw new Error(`Employee Certificates HTTP error! status: ${res.status}`);
//       }
//       return await res.json();
//     } catch (e) {
//       console.error("getEmployeeCertificates error:", e);
//       return { success: true, data: [] };
//     }
//   },

//   assignCertificate: async (payload) => {
//     const res = await fetch(`${BASE_URL}/api/resource-certificates`, {
//       method: "POST",
//       headers: getAuthHeaders(),
//       body: JSON.stringify(payload),
//     });
//     if (!res.ok) {
//       const errorData = await res.json().catch(() => null);
//       throw new Error(errorData?.message || "Failed to assign certificate");
//     }
//     return res.json();
//   },
// };

// export default skillService;

import axios from "axios";

const API_URL = window.__APP_CONFIG__.RMS_BASE_URL + "/api";

export const skillService = {
  // ✅ GET Categories
  getSkillTree: async () => {
    try {
      const response = await axios.get(`${API_URL}/skill-categories`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching categories:", error);
      throw error;
    }
  },

  // ✅ GET Proficiency Levels
  getProficiencies: async () => {
    try {
      const response = await axios.get(
        `${API_URL}/proficiency/get-all-proficiency-levels`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching proficiencies:", error);
      throw error;
    }
  },
  // Get employee's current skills
  getEmployeeSkills: async (employeeId) => {
    try {
      const response = await axios.get(
        `${API_URL}/resource-skills/resource/${employeeId}/profile`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching employee skills:", error);
      return { success: true, data: [] }; // prevent crash
    }
  },

  // Save a primary skill
  saveSkill: async (skillData) => {
    try {
      const response = await axios.post(`${API_URL}/resource-skills`, skillData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error saving skill:", error);
      throw error;
    }
  },

  // Update a primary skill
  updateSkill: async (id, skillData) => {
    try {
      const response = await axios.put(`${API_URL}/resource-skills/skill/${id}`, skillData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error updating skill:", error);
      throw error;
    }
  },

  // Delete a skill (and potentially its subskills)
  deleteSkill: async (id) => {
    try {
      const response = await axios.delete(`${API_URL}/resource-skills/skill/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error deleting skill:", error);
      throw error;
    }
  },

  // Save multiple skills (Bulk)
  saveBulkSkills: async (bulkData) => {
    try {
      const response = await axios.post(`${API_URL}/resource-skills/bulk`, bulkData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error saving bulk skills:", error);
      throw error;
    }
  },

  // Get sub-skills for a resource and skill
  getResourceSubSkills: async (resourceId, skillId) => {
    try {
      const response = await axios.get(`${API_URL}/resource-sub-skills/resource/${resourceId}/skill/${skillId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching resource sub-skills:", error);
      throw error;
    }
  },

  // Save a sub-skill
  saveSubSkill: async (subSkillData) => {
    try {
      const response = await axios.post(`${API_URL}/resource-sub-skills`, subSkillData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error saving sub-skill:", error);
      throw error;
    }
  },

  // Delete a sub-skill
  deleteSubSkill: async (id) => {
    try {
      const response = await axios.delete(`${API_URL}/resource-sub-skills/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error deleting sub-skill:", error);
      throw error;
    }
  },

  getSkills: async () => {
    try {
      const response = await axios.get(`${API_URL}/skills/active`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching skills:", error);
      throw error;
    }
  },

  getSkillsByCategory: async (categoryId) => {
    try {
      const response = await axios.get(`${API_URL}/skills/category/${categoryId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching skills for category ${categoryId}:`, error);
      throw error;
    }
  },
};
