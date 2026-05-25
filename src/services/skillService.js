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
  deleteSkill: async (skillId) => {

  try {

    const response = await axios.delete(
      `${API_URL}/skills/${skillId}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    return response.data;

  } catch (error) {

    console.error(
      "Error deleting skill:",
      error
    );

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
 deleteSubSkill: async (subSkillId) => {
  try {

    const response = await axios.delete(
      `${API_URL}/sub-skills/${subSkillId}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    return response.data;

  } catch (error) {

    console.error(
      "Error deleting sub-skill:",
      error
    );

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

  // Delete a taxonomy skill (mapped to backend DELETE /skills/{skillId})
  deleteTaxonomySkill: async (id) => {
    try {
      const response = await axios.delete(`${API_URL}/skills/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error deleting taxonomy skill:", error);
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

  getCategoryDtos: async () => {
    try {
      const response = await axios.get(`${API_URL}/skill-categories/dto`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching category DTOs:", error);
      throw error;
    }
  },

  deleteCategory: async (categoryId) => {
    try {
      const response = await axios.delete(`${API_URL}/skill-categories/${categoryId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error deleting category:", error);
      throw error;
    }
  },

  downloadSkillTaxonomyExcel: async () => {

  const response = await axios.get(
    `${API_URL}/skill-categories/taxonomy/export`,
    {
      responseType: "blob",
      headers: {
        Authorization:
          `Bearer ${localStorage.getItem("token")}`,
      },
    }
  );

  return response.data;
},

  getSkillsByCategoryDto: async (categoryId) => {
    try {
      const response = await axios.get(`${API_URL}/skill-categories/${categoryId}/skills-dto`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching skill DTOs for category ${categoryId}:`, error);
      throw error;
    }
  },

  getSubSkillsBySkillDto: async (skillId) => {
    try {
      const response = await axios.get(`${API_URL}/skill-categories/skills/${skillId}/subskills-dto`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching subskill DTOs for skill ${skillId}:`, error);
      throw error;
    }
  },

  saveSkillTaxonomy: async (taxonomyData) => {
    try {
      const response = await axios.post(`${API_URL}/skill-categories/taxonomy`, taxonomyData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error saving skill taxonomy:", error);
      throw error;
    }
  },

  uploadSkillTaxonomy: async (formData) => {
    try {
      const response = await axios.post(`${API_URL}/skill-categories/taxonomy/upload`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error uploading skill taxonomy:", error);
      throw error;
    }
  },
};
