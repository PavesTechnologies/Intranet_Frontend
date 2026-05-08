// ✅ ProjectList.jsx (Final Updated Version)
import React, { useEffect, useState } from "react";
import axios from "axios";
import { ChevronDown, ChevronRight, Pencil, Trash } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Button from "../../../components/Button/Button";
import CreateProjectModal from "./CreateProjectModal";
import Pagination from "../../../components/Pagination/pagination";
import { showStatusToast } from "../../../components/toastfy/toast";

const ProjectList = () => {
  //   const [projects, setProjects] = useState([]);
  //   const [expandedId, setExpandedId] = useState(null);
  //   const [editingProjectId, setEditingProjectId] = useState(null);
  //   const [formData, setFormData] = useState({});
  //   const [users, setUsers] = useState([]);
  //   const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  //   const [isSubmitting, setIsSubmitting] = useState(false);
  //   const [loading, setLoading] = useState(true);
  //   const [searchTerm, setSearchTerm] = useState("");
  //   const [currentPage, setCurrentPage] = useState(1);
  //   const [projectsPerPage] = useState(5);
  //   const [filterStatus, setFilterStatus] = useState("All");
  //   const navigate = useNavigate();
  //   const token = localStorage.getItem("token");
  //   const user = JSON.parse(localStorage.getItem("user"));
  //   // ✅ Fetch all projects (Owner + Member)
  //   const fetchProjects = async (status) => {
  //     setLoading(true);
  //     try {
  //       const base = window.__APP_CONFIG__.PMS_BASE_URL;
  //       const headers = { Authorization: `Bearer ${token}` };
  //       const ownerUrl =
  //         status && status !== "All"
  //           ? `${base}/api/projects/owner?status=${status}`
  //           : `${base}/api/projects/owner`;
  //       const ownerRes = await axios.get(ownerUrl, { headers });
  //       let memberRes = { data: [] };
  //       if (user?.id) {
  //         const memberUrl = `${base}/api/projects/member/${user.id}`;
  //         memberRes = await axios.get(memberUrl, { headers });
  //       }
  //       const allProjects = [...ownerRes.data, ...memberRes.data];
  //       const uniqueProjects = Array.from(
  //         new Map(allProjects.map((p) => [p.id, p])).values()
  //       );
  //       setProjects(uniqueProjects);
  //     } catch (error) {
  //       console.error("❌ Failed to fetch projects", error);
  //       toast.error("Failed to load projects.");
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   // ✅ Fetch Users for Owner/Member dropdowns
  //   const fetchUsers = async () => {
  //     try {
  //       const res = await axios.get(
  //         `${window.__APP_CONFIG__.PMS_BASE_URL}/api/users?page=0&size=100`,
  //         { headers: { Authorization: `Bearer ${token}` } }
  //       );
  //       const data = Array.isArray(res.data) ? res.data : res.data.content || [];
  //       setUsers(data);
  //     } catch (err) {
  //       console.error("❌ Failed to fetch users", err);
  //     }
  //   };
  //   useEffect(() => {
  //     fetchProjects();
  //     fetchUsers();
  //   }, []);
  //   useEffect(() => {
  //     fetchProjects(filterStatus);
  //   }, [filterStatus]);
  //   useEffect(() => {
  //     setCurrentPage(1);
  //   }, [searchTerm]);
  //   // ✅ Expand/Collapse
  //   const toggleExpand = (id) => {
  //     setExpandedId(expandedId === id ? null : id);
  //     setEditingProjectId(null);
  //   };
  //   // ✅ Start Edit
  //   const startEdit = (project) => {
  //     setExpandedId(project.id);
  //     setEditingProjectId(project.id);
  //     setFormData({
  //       name: project.name || "",
  //       projectKey: project.projectKey || "",
  //       description: project.description || "",
  //       status: project.status || "ACTIVE",
  //       currentStage: project.currentStage || "INITIATION",
  //       ownerId: project.owner?.id || user?.id || "",
  //       memberIds: project.members?.map((m) => m.id) || [],
  //       startDate: project.startDate ? project.startDate.split("T")[0] : "",
  //       endDate: project.endDate ? project.endDate.split("T")[0] : "",
  //     });
  //   };
  //   const cancelEdit = () => {
  //     setEditingProjectId(null);
  //     setFormData({});
  //   };
  //   // ✅ Handle Input Changes
  //   const handleInputChange = (e) => {
  //     const { name, value } = e.target;
  //     if (editingProjectId && formData.status === "ARCHIVED" && name !== "status") {
  //       toast.warn("Archived projects can only have their status changed to ACTIVE.", {
  //         position: "top-right",
  //       });
  //       return;
  //     }
  //     setFormData((prev) => ({ ...prev, [name]: value }));
  //   };
  //   const handleMemberToggle = (userId) => {
  //     if (editingProjectId && formData.status === "ARCHIVED") {
  //       toast.warn("Archived projects can only have their status changed to ACTIVE.", {
  //         position: "top-right",
  //       });
  //       return;
  //     }
  //     setFormData((prev) => {
  //       const updated = prev.memberIds?.includes(userId)
  //         ? prev.memberIds.filter((id) => id !== userId)
  //         : [...(prev.memberIds || []), userId];
  //       return { ...prev, memberIds: updated };
  //     });
  //   };
  //   // ✅ Update Project API (Includes All Columns)
  //   const submitEdit = async (projectId) => {
  //     try {
  //       setIsSubmitting(true);
  //       const updatedProjectData = {
  //         name: formData.name?.trim() || "",
  //         projectKey: formData.projectKey?.trim() || "",
  //         description: formData.description?.trim() || "",
  //         status: formData.status || "ACTIVE",
  //         currentStage: formData.currentStage || "INITIATION",
  //         ownerId: formData.ownerId ? Number(formData.ownerId) : user?.id || null,
  //         memberIds: Array.isArray(formData.memberIds)
  //           ? formData.memberIds.map((id) => Number(id))
  //           : [],
  //         startDate: formData.startDate ? `${formData.startDate}T00:00:00` : null,
  //         endDate: formData.endDate ? `${formData.endDate}T00:00:00` : null,
  //       };
  //       const res = await axios.put(
  //         `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}`,
  //         updatedProjectData,
  //         { headers: { Authorization: `Bearer ${token}` } }
  //       );
  //       // ✅ Update UI locally
  //       setProjects((prev) =>
  //         prev.map((p) =>
  //           p.id === projectId
  //             ? {
  //                 ...p,
  //                 ...res.data,
  //                 owner:
  //                   users.find((u) => u.id === Number(updatedProjectData.ownerId)) ||
  //                   p.owner,
  //                 members: users.filter((u) =>
  //                   updatedProjectData.memberIds.includes(u.id)
  //                 ),
  //               }
  //             : p
  //         )
  //       );
  //       toast.success(" Project updated successfully!");
  //       setEditingProjectId(null);
  //     } catch (err) {
  //       console.error(" Project update failed", err);
  //       toast.error("Failed to update project. Please try again.");
  //     } finally {
  //       setIsSubmitting(false);
  //     }
  //   };
  //   // ✅ Delete Project
  //   const handleDelete = async (projectId) => {
  //   if (!window.confirm("🗑️ Are you sure you want to delete this project?")) return;
  //   try {
  //     await axios.delete(
  //       `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}`,
  //       { headers: { Authorization: `Bearer ${token}` } }
  //     );
  //     setProjects((prev) => prev.filter((p) => p.id !== projectId));
  //     toast.success(" Project deleted successfully!");
  //   } catch (err) {
  //     console.error("❌ Failed to delete project:", err);
  //     // Friendly error message based on cause
  //     if (err.response?.status === 400 && err.response?.data?.message?.includes("foreign key")) {
  //       toast.error("⚠️ Cannot delete this project because it has linked tasks or dependencies.");
  //     } else if (err.response?.status === 403) {
  //       toast.error("🚫 You don’t have permission to delete this project.");
  //     } else if (err.response?.status === 404) {
  //       toast.error("🔍 Project not found — it may have already been deleted.");
  //     } else {
  //       toast.error(" Something went wrong while deleting the project. Please try again.");
  //     }
  //   }
  // };
  //   // ✅ Filter + Pagination
  //   const filteredProjects = projects.filter((p) => {
  //     const matchesSearch =
  //       p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //       p.projectKey?.toLowerCase().includes(searchTerm.toLowerCase());
  //     const matchesStatus =
  //       filterStatus === "All" ? true : p.status === filterStatus;
  //     return matchesSearch && matchesStatus;
  //   });
  //   const indexOfLast = currentPage * projectsPerPage;
  //   const indexOfFirst = indexOfLast - projectsPerPage;
  //   const currentProjects = filteredProjects.slice(indexOfFirst, indexOfLast);
  //   const totalPages = Math.ceil(filteredProjects.length / projectsPerPage);
  //   return (
  //     <div className="p-6 bg-gray-50 min-h-screen">
  //       <h1 className="text-2xl font-bold text-black mb-6">Projects</h1>
  //       {/* 🔍 Search + Filters */}
  //       <div className="flex justify-between items-center mb-6 gap-4">
  //         <input
  //           type="text"
  //           placeholder="Search by name or key"
  //           className="border px-3 py-2 rounded-xl"
  //           value={searchTerm}
  //           onChange={(e) => setSearchTerm(e.target.value)}
  //         />
  //         <select
  //           value={filterStatus}
  //           onChange={(e) => setFilterStatus(e.target.value)}
  //           className="border px-3 py-2 rounded-xl"
  //         >
  //           <option value="All">All</option>
  //           <option value="ACTIVE">Active</option>
  //           <option value="PLANNING">Planning</option>
  //           <option value="ARCHIVED">Archived</option>
  //           <option value="COMPLETED">Completed</option>
  //         </select>
  //         <Button
  //           variant="primary"
  //           size="medium"
  //           onClick={() => setIsCreateModalOpen(true)}
  //         >
  //           + Create Project
  //         </Button>
  //       </div>
  //       {/* 🧾 Project List */}
  //       {loading ? (
  //         <p className="text-gray-600">Loading projects...</p>
  //       ) : currentProjects.length === 0 ? (
  //         <p className="text-gray-600">No projects found.</p>
  //       ) : (
  //         <div className="space-y-4">
  //           {currentProjects.map((project) => (
  //             <div key={project.id} className="bg-white rounded-xl shadow p-4">
  //               <div
  //                 className="flex justify-between items-center cursor-pointer"
  //                 onClick={() => toggleExpand(project.id)}
  //               >
  //                 <div className="flex items-center gap-2">
  //                   {expandedId === project.id ? <ChevronDown /> : <ChevronRight />}
  //                   <h2 className="text-xl font-semibold">{project.name}</h2>
  //                   <span className="text-gray-500 text-sm">
  //                     ({project.projectKey})
  //                   </span>
  //                 </div>
  //                 <div className="flex gap-2">
  //                   <Button
  //                     className="bg-transparent hover:bg-transparent"
  //                     size="small"
  //                     onClick={(e) => {
  //                       e.stopPropagation();
  //                       startEdit(project);
  //                     }}
  //                   >
  //                     <Pencil className="text-blue-600" size={14} />
  //                   </Button>
  //                   <Button
  //                     className="bg-transparent hover:bg-transparent"
  //                     size="small"
  //                     onClick={(e) => {
  //                       e.stopPropagation();
  //                       handleDelete(project.id);
  //                     }}
  //                   >
  //                     <Trash className="text-red-500" size={14} />
  //                   </Button>
  //                 </div>
  //               </div>
  //               {/* 🔽 Expand Panel */}
  //               {expandedId === project.id && (
  //                 <div className="mt-4 border-t pt-4 text-sm text-gray-700">
  //                   {editingProjectId === project.id ? (
  //                     <div className="space-y-2">
  //                       <input
  //                         name="name"
  //                         value={formData.name}
  //                         onChange={handleInputChange}
  //                         className="border px-2 py-1 rounded w-full"
  //                         placeholder="Project Name"
  //                       />
  //                       <input
  //                         name="projectKey"
  //                         value={formData.projectKey}
  //                         onChange={handleInputChange}
  //                         className="border px-2 py-1 rounded w-full"
  //                         placeholder="Project Key"
  //                       />
  //                       <textarea
  //                         name="description"
  //                         value={formData.description}
  //                         onChange={handleInputChange}
  //                         className="border px-2 py-1 rounded w-full"
  //                         placeholder="Description"
  //                       />
  //                       <div className="flex gap-2">
  //                         <input
  //                           type="date"
  //                           name="startDate"
  //                           value={formData.startDate || ""}
  //                           onChange={handleInputChange}
  //                           className="border px-2 py-1 rounded w-full"
  //                         />
  //                         <input
  //                           type="date"
  //                           name="endDate"
  //                           value={formData.endDate || ""}
  //                           onChange={handleInputChange}
  //                           className="border px-2 py-1 rounded w-full"
  //                         />
  //                       </div>
  //                       <select
  //                         name="status"
  //                         value={formData.status}
  //                         onChange={handleInputChange}
  //                         className="border px-2 py-1 rounded w-full"
  //                       >
  //                         <option value="ACTIVE">Active</option>
  //                         <option value="PLANNING">Planning</option>
  //                         <option value="ARCHIVED">Archived</option>
  //                         <option value="COMPLETED">Completed</option>
  //                       </select>
  //                       <select
  //                         name="currentStage"
  //                         value={formData.currentStage}
  //                         onChange={handleInputChange}
  //                         className="border px-2 py-1 rounded w-full"
  //                       >
  //                         <option value="INITIATION">Initiation</option>
  //                         <option value="PLANNING">Planning</option>
  //                         <option value="DESIGN">Design</option>
  //                         <option value="DEVELOPMENT">Development</option>
  //                         <option value="TESTING">Testing</option>
  //                         <option value="DEPLOYMENT">Deployment</option>
  //                         <option value="MAINTENANCE">Maintenance</option>
  //                         <option value="COMPLETED">Completed</option>
  //                       </select>
  //                       {/* Owner */}
  //                       <div>
  //                         <label className="font-medium">Owner:</label>
  //                         <select
  //                           name="ownerId"
  //                           value={formData.ownerId || ""}
  //                           onChange={handleInputChange}
  //                           className="border px-2 py-1 rounded w-full"
  //                         >
  //                           <option value="">Select Owner</option>
  //                           {users.map((u) => (
  //                             <option key={u.id} value={u.id}>
  //                               {u.name}
  //                             </option>
  //                           ))}
  //                         </select>
  //                       </div>
  //                       {/* Members */}
  //                       <div>
  //                         <label className="font-medium">Members:</label>
  //                         <div className="grid grid-cols-2 gap-2 mt-1 max-h-32 overflow-y-auto border p-2 rounded">
  //                           {users.map((u) => (
  //                             <label key={u.id} className="flex items-center gap-2">
  //                               <input
  //                                 type="checkbox"
  //                                 checked={formData.memberIds?.includes(u.id)}
  //                                 onChange={() => handleMemberToggle(u.id)}
  //                               />
  //                               {u.name}
  //                             </label>
  //                           ))}
  //                         </div>
  //                       </div>
  //                       <div className="flex justify-end gap-2 pt-2">
  //                         <Button variant="secondary" size="small" onClick={cancelEdit}>
  //                           Cancel
  //                         </Button>
  //                         <Button
  //                           variant="primary"
  //                           size="small"
  //                           onClick={() => submitEdit(project.id)}
  //                           disabled={isSubmitting}
  //                         >
  //                           {isSubmitting ? "Saving..." : "Save"}
  //                         </Button>
  //                       </div>
  //                     </div>
  //                   ) : (
  //                     <>
  //                       <p><strong>Description:</strong> {project.description || "—"}</p>
  //                       <p><strong>Status:</strong> {project.status}</p>
  //                       <p><strong>Stage:</strong> {project.currentStage}</p>
  //                       <p><strong>Owner:</strong> {project.owner?.name || "—"}</p>
  //                       <p><strong>Start:</strong> {project.startDate?.split("T")[0] || "—"}</p>
  //                       <p><strong>End:</strong> {project.endDate?.split("T")[0] || "—"}</p>
  //                       <div className="mt-3">
  //                         <strong>Members:</strong>
  //                         {project.members?.length ? (
  //                           <ul className="list-disc list-inside ml-2 mt-1">
  //                             {project.members.map((m) => (
  //                               <li key={m.id}>{m.name} ({m.email})</li>
  //                             ))}
  //                           </ul>
  //                         ) : (
  //                           <p className="text-gray-500 ml-2">No members assigned.</p>
  //                         )}
  //                       </div>
  //                       <div className="pt-4">
  //                         <Button
  //                           variant="primary"
  //                           size="small"
  //                           onClick={() => navigate(`/projects/${project.id}`)}
  //                         >
  //                           Project Workspace
  //                         </Button>
  //                       </div>
  //                     </>
  //                   )}
  //                 </div>
  //               )}
  //             </div>
  //           ))}
  //         </div>
  //       )}
  //       {/* Pagination */}
  //       {totalPages > 1 && (
  //         <Pagination
  //           currentPage={currentPage}
  //           totalPages={totalPages}
  //           onPrevious={() => setCurrentPage((p) => Math.max(p - 1, 1))}
  //           onNext={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
  //         />
  //       )}
  //       <CreateProjectModal
  //         isOpen={isCreateModalOpen}
  //         onClose={() => setIsCreateModalOpen(false)}
  //         onProjectCreated={() => fetchProjects(filterStatus)}
  //       />
  //       <ToastContainer position="top-right" />
  //     </div>
  //   );
};

export default ProjectList;
