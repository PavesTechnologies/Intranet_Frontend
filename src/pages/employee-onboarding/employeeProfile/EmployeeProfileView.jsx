"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Phone,
  Building2,
  User,
  Camera,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link,
  Briefcase,
  Plus,
  Loader2,
  Check,
  Edit2,
  Trash2,
  Search,
  AlertCircle,
  ChevronDown,
  PencilLine
} from "lucide-react";
import { showStatusToast } from "../../../components/toastfy/toast";

import { useParams } from "react-router-dom";

import ProfilePage from "./ProfilePage";
import JobPage from "./JobPage";
import DocumentsPage from "./DocumentsPage";
import ConfirmationModal from "../../../components/confirmation_modal/ConfirmationModal";
import SkillModal from "./SkillModal";
import EditSkillModal from "./EditSkillModal";
import { skillService } from "../../../services/skillService";

export default function EmployeeProfileView() {
  const { employee_uuid } = useParams();
  // const { employee_uuid } = useParams();

  const [activeTab, setActiveTab] = useState("about");
  const [docTabConfig, setDocTabConfig] = useState({ folder: "education", search: "" });

  const handleTabChange = (tab, config = null) => {
    setActiveTab(tab);
    if (config) setDocTabConfig(config);
  };

  const [profileImg, setProfileImg] = useState(null);
  const profileRef = useRef(null);
  const initialCoreFetchDoneRef = useRef(false);
  const initialAboutFetchDoneRef = useRef(false);
  const [employee, setEmployee] = useState(null);
  const BASE_URL = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;
  
  const [hrData, setHrData] = useState(null);
  const [identityTypes, setIdentityTypes] = useState([]);
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [employeeSkills, setEmployeeSkills] = useState([]);
  const [rawCertifications, setRawCertifications] = useState(null);
  const [expandedSkills, setExpandedSkills] = useState(new Set());
  const [selectedSkill, setSelectedSkill] = useState(null);
  const toggleExpand = (skillId) => {
    setExpandedSkills(prev => {
      const next = new Set(prev);
      if (next.has(skillId)) next.delete(skillId);
      else next.add(skillId);
      return next;
    });
  };

  // ✅ FETCH ALL DATA ONCE
  const fetchAllData = async () => {
    try {
      const token = localStorage.getItem("token");

      // 1. Fetch core employee details
      const coreRes = await fetch(
        `${BASE_URL}/permanent-employee/core-employee-details/${employee_uuid}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!coreRes.ok) throw new Error("Failed to fetch employee");
      const coreData = await coreRes.json();

      // 🔥 FIRE SKILLS & CERTS AS SOON AS WE HAVE ID
      if (coreData.employee_id) {
        fetchEmployeeSkills(coreData.employee_id);
        fetchRawCertifications(coreData.employee_id);
      }

      // 2. Fire department, designation, and HR profile calls IN PARALLEL
      const parallelPromises = [];

      // Department
      const deptPromise = coreData.department_uuid
        ? fetch(`${BASE_URL}/masters/departments/${coreData.department_uuid}`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.ok ? r.json() : {})
          .catch(() => ({}))
        : Promise.resolve({});
      parallelPromises.push(deptPromise);

      // Designation
      const desigPromise = coreData.designation_uuid
        ? fetch(`${BASE_URL}/masters/designations/${coreData.designation_uuid}`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.ok ? r.json() : {})
          .catch(() => ({}))
        : Promise.resolve({});
      parallelPromises.push(desigPromise);

      // HR profile
      const targetUserUuid = coreData.user_uuid;
      const hrPromise = targetUserUuid
        ? fetch(`${BASE_URL}/hr/hr/${targetUserUuid}`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.ok ? r.json() : {})
          .catch(() => ({}))
        : Promise.resolve({});
      parallelPromises.push(hrPromise);

      const [deptData, desigData, hrResult] = await Promise.all(parallelPromises);

      coreData.resolved_department_name = deptData.department_name || coreData.department_uuid;
      coreData.resolved_designation_name = desigData.designation_name || desigData.name || coreData.designation_uuid;

      setEmployee(coreData);
      console.log("Employee core data with resolved names:", coreData);
      setHrData(hrResult);

      // 3. Fetch identity types based on country_uuid from address
      const addresses = hrResult?.addresses || [];
      const countryUuid = addresses[0]?.country_uuid || null;
      if (countryUuid) {
        try {
          const idTypesRes = await fetch(
            `${BASE_URL}/identity/country-mapping/identities/${countryUuid}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (idTypesRes.ok) {
            const idTypesData = await idTypesRes.json();
            setIdentityTypes(Array.isArray(idTypesData) ? idTypesData : []);
          }
        } catch (e) {
          console.error("Failed to fetch identity types:", e);
        }
      }
    } catch (err) {
      console.error("Error fetching employee:", err);
      setEmployee({});
      setHrData({});
    }
  };

  const fetchEmployeeSkills = async (empId) => {
    try {
      const targetId = empId || employee?.employee_id;
      if (!targetId) return;
      const res = await skillService.getEmployeeSkills(targetId);
      const rawData = res?.data || [];

      // const mapped = rawData.map(item => ({
      //   id: item.resourceSkillId,

      //   // Category + Skill
      //   categoryName: item.category,
      //   skillName: item.skill,

      //   // Skill Proficiency
      //   proficiencyName: item.skillProficiency,

      //   // Sub Skills
      //   subSkills: (item.subSkills || []).map(ss => ({
      //     id: ss.resourceSubSkillId,
      const mapped = rawData.map(item => ({
        id: item.resourceSkillId || item.id,
        categoryId: item.categoryId || item.skill?.category?.id || "",
        categoryName: item.category || item.categoryName || "General",

        skillId: item.skillId || item.skill_id || item.skill?.id || "",
        skillName: item.skillName || item.skill || "Unnamed Skill",

        skillProficiencyId: item.skillProficiencyCode || item.proficiencyId || item.skillProficiencyId || item.proficiency?.proficiencyId || "",
        proficiencyName: item.skillProficiency || item.proficiencyName || "Not Set",

        subSkills: (item.subSkills || item.resourceSubSkills || []).map(ss => ({
          id: ss.resourceSubSkillId || ss.id,
          subSkillId: ss.subSkillId || ss.id || "",
          name: ss.subSkill || ss.name,
          proficiencyName: ss.proficiency || ss.proficiencyName,
          proficiencyId: ss.proficiencyCode || ss.proficiencyId || ""
        }))
      }));
      setEmployeeSkills(mapped);
    } catch (err) {
      console.error("Error fetching employee skills:", err);
      setEmployeeSkills([]);
    }
  };

  const handleDeleteSkill = async (id) => {
    if (!window.confirm("Are you sure you want to remove this skill from the profile?")) return;
    try {
      await skillService.deleteSkill(id);
      showStatusToast("Skill removed from profile successfully", "success");
      fetchEmployeeSkills(); // Refresh
    } catch (err) {
      console.error("Delete failed:", err);
      showStatusToast(err.message || "Failed to delete skill", "error");
    }
  };

  useEffect(() => {
    initialCoreFetchDoneRef.current = false;
    initialAboutFetchDoneRef.current = false;
  }, [employee_uuid]);

  useEffect(() => {
    if (!employee_uuid || initialCoreFetchDoneRef.current) return;
    initialCoreFetchDoneRef.current = true;
    fetchAllData();
  }, [employee_uuid]);

  const fetchRawCertifications = async (empId) => {
    try {
      const targetId = empId || employee?.employee_id;
      if (!targetId) return;
      
      const token = localStorage.getItem("token");
      const BASE_URL = window.__APP_CONFIG__.RMS_BASE_URL;
      const res = await fetch(`${BASE_URL}/api/resource-certificates/resource/${targetId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      setRawCertifications(result.data || []);
    } catch (err) {
      console.error("Error fetching raw certifications:", err);
    }
  };

  const [about, setAbout] = useState({
    about_me: "",
    work_enjoyment: "",
    interests_hobbies: "",
  });
  const [aboutUuid, setAboutUuid] = useState(null);
  const [savingAbout, setSavingAbout] = useState(false);

  const normalizeAboutData = (data = {}) => ({
    about_me: data.about_me || "",
    work_enjoyment: data.work_enjoyment || "",
    interests_hobbies: data.interests_hobbies || "",
  });

  const getPlainTextFromHtml = (html = "") => {
    if (typeof document === "undefined") return html.replace(/<[^>]*>/g, "").trim();
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return (temp.textContent || temp.innerText || "").trim();
  };

  const hasMeaningfulContent = (html = "") => getPlainTextFromHtml(html).length > 0;

  const parseApiErrorMessage = (rawText = "") => {
    if (!rawText) return "";
    try {
      const json = JSON.parse(rawText);
      return json?.detail || json?.message || rawText;
    } catch {
      return rawText;
    }
  };

  const formatAboutApiError = (rawText = "", fallback = "Failed to save changes") => {
    const message = parseApiErrorMessage(rawText);
    if (message.includes("Unknown column") && message.includes("employee_about.links")) {
      return "Backend issue: employee_about.links column is missing. Please apply DB migration.";
    }
    return message || fallback;
  };

  // ✅ DELETE STATES
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ✅ FETCH ABOUT DATA
  const fetchAboutData = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/employee-details/about/${employee_uuid}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const responseData = await res.json();
        const rawData = responseData.data || responseData;
        const data = Array.isArray(rawData) ? rawData[0] : rawData;
        if (data) {
          setAbout(normalizeAboutData(data));
          setAboutUuid(data.employee_about_uuid);
        }
      } else {
        const errorText = await res.text();
        const displayMessage = formatAboutApiError(errorText, "Failed to fetch about data");
        console.error("Failed to fetch about data:", displayMessage);
        showStatusToast(displayMessage, "error");
      }
    } catch (err) {
      console.error("Failed to fetch about data:", err);
    }
  };

  useEffect(() => {
    if (!employee_uuid || initialAboutFetchDoneRef.current) return;
    initialAboutFetchDoneRef.current = true;
    fetchAboutData();
  }, [employee_uuid]);

  const [skills] = useState([
    "Java",
    "Spring Boot",
    "React",
    "SQL",
    "Microservices",
  ]);

  const [editingField, setEditingField] = useState(null);
  const editorRef = useRef(null);

  if (!employee || hrData === null) {
    return <div className="p-10 text-center text-indigo-900 font-medium">Loading employee data...</div>;
  }

  const mappedEmployee = {
    name: `${employee.first_name || ""} ${employee.last_name || ""}`.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).trim(),
    designation: employee.resolved_designation_name || employee.designation_uuid,
    email: employee.work_email,
    phone: employee.contact_number,
    office: employee.location || "Not Updated",
    empId: employee.employee_id,
    department: employee.resolved_department_name || employee.department_uuid,
    reportingManager: employee.reporting_manager_uuid || "N/A",
    joiningDate: employee.joining_date,
    employmentType: employee.employment_type,
  };

  const handleProfileChange = (file) => {
    if (file) setProfileImg(URL.createObjectURL(file));
  };

  const formatText = (cmd) => {
    document.execCommand(cmd, false, null);
  };

  const saveField = async (key) => {
    const newContent = editorRef.current?.innerHTML ?? "";
    const updatedAbout = {
      ...about,
      [key]: newContent,
    };

    setSavingAbout(true);
    try {
      const token = localStorage.getItem("token");
      const method = aboutUuid ? "PUT" : "POST";
      const url = aboutUuid
        ? `${BASE_URL}/employee-details/about/${employee_uuid}`
        : `${BASE_URL}/employee-details/about`;

      const payload = {
        employee_uuid: employee_uuid,
        ...(aboutUuid ? { employee_about_uuid: aboutUuid } : {}),
        about_me: updatedAbout.about_me,
        work_enjoyment: updatedAbout.work_enjoyment,
        interests_hobbies: updatedAbout.interests_hobbies,
      };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(formatAboutApiError(errorText, "Failed to save data"));
      }

      const responseData = await res.json();
      const serverData = responseData.data || responseData;
      
      setAbout(prev => ({
        ...prev,
        ...normalizeAboutData({
          about_me: serverData.about_me !== undefined ? serverData.about_me : updatedAbout.about_me,
          work_enjoyment: serverData.work_enjoyment !== undefined ? serverData.work_enjoyment : updatedAbout.work_enjoyment,
          interests_hobbies: serverData.interests_hobbies !== undefined ? serverData.interests_hobbies : updatedAbout.interests_hobbies,
        }),
      }));

      const newUuid = serverData.employee_about_uuid;
      if (newUuid) setAboutUuid(newUuid);
      
      showStatusToast("Changes saved successfully", "success");
      setEditingField(null);
    } catch (err) {
      console.error("Save failed:", err);
      showStatusToast(err.message || "Failed to save changes", "error");
    } finally {
      setSavingAbout(false);
    }
  };

  const handleDeleteClick = (fieldKey) => {
    setFieldToDelete(fieldKey);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!fieldToDelete) return;

    setIsDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const updatedAbout = {
        ...about,
        [fieldToDelete]: "",
      };

      // Since the API uses PUT for update, we just send the cleared content
      const res = await fetch(`${BASE_URL}/employee-details/about/${employee_uuid}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          employee_uuid: employee_uuid,
          ...(aboutUuid ? { employee_about_uuid: aboutUuid } : {}),
          about_me: updatedAbout.about_me,
          work_enjoyment: updatedAbout.work_enjoyment,
          interests_hobbies: updatedAbout.interests_hobbies,
        }),
      });

      if (res.ok) {
        setAbout(updatedAbout);
        showStatusToast("Content deleted successfully", "success");
      } else {
        const errorText = await res.text();
        throw new Error(formatAboutApiError(errorText, "Failed to delete content"));
      }
    } catch (err) {
      console.error("Delete failed:", err);
      showStatusToast("Failed to delete content", "error");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setFieldToDelete(null);
    }
  };

  const AboutBlock = ({ title, fieldKey }) => {
    const placeholderMap = {
      about_me: "Share a short introduction about yourself",
      work_enjoyment: "Describe what you enjoy most in your day-to-day work",
      interests_hobbies: "Tell others about your interests and hobbies",
    };

    return (
    <div className="mb-8 w-full">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-indigo-900 border-l-4 border-indigo-500 pl-3">{title}</h4>
        {!editingField && about[fieldKey] && (
          <div className="flex gap-2">
            <button
              onClick={() => setEditingField(fieldKey)}
              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Edit Section"
            >
              <PencilLine size={16} />
            </button>
            <button
              onClick={() => handleDeleteClick(fieldKey)}
              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete Section"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {editingField === fieldKey ? (
        <div className="border border-indigo-100 rounded-xl bg-white shadow-md w-full">
          <div className="flex flex-wrap gap-4 p-3 border-b bg-indigo-50 text-indigo-700">
            <button onClick={() => formatText("bold")}>
              <Bold size={16} />
            </button>
            <button onClick={() => formatText("italic")}>
              <Italic size={16} />
            </button>
            <button onClick={() => formatText("underline")}>
              <Underline size={16} />
            </button>
            <button onClick={() => formatText("insertUnorderedList")}>
              <List size={16} />
            </button>
            <button onClick={() => formatText("insertOrderedList")}>
              <ListOrdered size={16} />
            </button>
            <button onClick={() => formatText("createLink")}>
              <Link size={16} />
            </button>
          </div>
          <div
            ref={editorRef}
            contentEditable
            onFocus={(e) => e.target.parentElement.classList.add('rich-editor-active')}
            onBlur={(e) => e.target.parentElement.classList.remove('rich-editor-active')}
            className="p-5 min-h-[160px] text-sm outline-none break-words overflow-auto max-w-full editor-content leading-relaxed"
            dangerouslySetInnerHTML={{ __html: about[fieldKey] }}
          />

          <div className="flex items-center justify-between gap-3 p-4 border-t bg-gray-50/50">
            <p className="text-xs text-gray-500">Tip: Add key points so teammates can quickly know you better.</p>
            <div className="flex justify-end gap-3">
            <button
              onClick={() => setEditingField(null)}
              className="px-5 py-1.5 text-sm font-medium text-gray-600 hover:bg-white hover:shadow transition-all rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={() => saveField(fieldKey)}
              disabled={savingAbout}
              className={`px-5 py-1.5 text-sm font-bold bg-indigo-600 text-white rounded-xl shadow-md transition-all ${savingAbout ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-700 hover:shadow-indigo-200 hover:-translate-y-0.5"}`}
            >
              {savingAbout ? "Saving..." : "Save Content"}
            </button>
            </div>
          </div>
        </div>
      ) : hasMeaningfulContent(about[fieldKey]) ? (
        <div className="bg-white rounded-2xl p-5 border border-indigo-100 transition-all shadow-sm relative">
          <div
            className="text-sm text-gray-700 break-words editor-content leading-relaxed"
            dangerouslySetInnerHTML={{ __html: about[fieldKey] }}
          />
        </div>
      ) : (
        <button
          onClick={() => setEditingField(fieldKey)}
          className="group/btn flex items-center gap-2 px-5 py-4 w-full border-2 border-dashed border-indigo-200 rounded-2xl text-sm font-medium text-indigo-500 hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50/30 transition-all duration-300"
        >
          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center group-hover/btn:scale-110 transition-transform">
            <span className="text-lg">+</span>
          </div>
          {placeholderMap[fieldKey] || `Add your ${title.toLowerCase()}`}
        </button>
      )}
    </div>
  )};

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-3 sm:px-6 lg:px-10 py-6 sm:py-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
        {/* LEFT SIDEBAR */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-white/80 backdrop-blur rounded-2xl shadow-md p-6 text-center border border-indigo-100 overflow-hidden">
            <div
              onClick={() => profileRef.current.click()}
              className="relative w-24 h-24 sm:w-36 sm:h-36 mx-auto rounded-full overflow-hidden border-4 border-indigo-200 cursor-pointer bg-gradient-to-br from-indigo-400 to-purple-400 group"
            >
              {profileImg ? (
                <img src={profileImg} className="w-full h-full object-cover" alt="Profile" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-semibold text-white">
                  {mappedEmployee.name.charAt(0)}
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                <div className="text-white text-xs flex flex-col items-center"><Camera size={18} />Edit Photo</div>
              </div>
            </div>
            <input hidden ref={profileRef} type="file" accept="image/*" onChange={(e) => handleProfileChange(e.target.files[0])} />
            <h2 className="mt-4 text-xl font-semibold text-indigo-900 break-words">{mappedEmployee.name}</h2>
            <p className="text-indigo-600 text-sm break-words">{mappedEmployee.designation}</p>
          </div>

          <div className="bg-white/80 backdrop-blur rounded-2xl shadow-md p-5 text-sm space-y-3 border border-indigo-100">
            <Info icon={<Mail size={14} />} text={mappedEmployee.email} />
            <Info icon={<Phone size={14} />} text={mappedEmployee.phone} />
            <Info icon={<Building2 size={14} />} text={mappedEmployee.office} />
            <Info
              icon={<User size={14} />}
              text={`ID: ${mappedEmployee.empId}`}
            />
          </div>

          <div className="bg-white/80 backdrop-blur rounded-2xl shadow-md p-5 text-sm border border-indigo-100">
            <div className="mb-3">
              <p className="text-xs text-indigo-400 uppercase tracking-wide">Department</p>
              <p className="font-semibold text-indigo-900 break-words">{mappedEmployee.department}</p>
            </div>
            <div>
              <p className="text-xs text-indigo-400 uppercase tracking-wide">Reporting Manager</p>
              <p className="font-semibold text-indigo-900 break-words">{mappedEmployee.reportingManager}</p>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="lg:col-span-2 xl:col-span-3 min-w-0">
          <div className="border-b border-indigo-100 mb-6 flex gap-1 sm:gap-6 text-sm overflow-x-auto scrollbar-hide">
            <Tab
              active={activeTab === "about"}
              onClick={() => handleTabChange("about")}
            >
              About
            </Tab>
            <Tab
              active={activeTab === "profile"}
              onClick={() => handleTabChange("profile")}
            >
              Profile
            </Tab>
            <Tab
              active={activeTab === "job"}
              onClick={() => handleTabChange("job")}
            >
              Job
            </Tab>
            <Tab
              active={activeTab === "documents"}
              onClick={() => handleTabChange("documents")}
            >
              Documents
            </Tab>
          </div>

          {activeTab === "about" && (
            <div className="space-y-6">
              <div className="bg-white/80 backdrop-blur rounded-2xl shadow-md p-6 border border-indigo-100">
                <div className="mb-5 rounded-xl bg-indigo-50/70 border border-indigo-100 px-4 py-3">
                  <p className="text-sm font-semibold text-indigo-900">About Profile</p>
                  <p className="text-xs text-indigo-700 mt-1">
                    Keep these sections short and specific so others can quickly understand your background and interests.
                  </p>
                </div>
                <AboutBlock title="About Me" fieldKey="about_me" />
                <AboutBlock title="What I Enjoy Most About My Work" fieldKey="work_enjoyment" />
                <AboutBlock title="Interests & Hobbies" fieldKey="interests_hobbies" />
              </div>

              <div className="bg-white/80 backdrop-blur rounded-2xl shadow-md p-6 border border-indigo-100">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                    <h3 className="text-lg font-bold text-gray-900 tracking-tight">Professional Skillset</h3>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedSkill(null);
                      setIsSkillModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
                  >
                    <Plus size={18} />
                    Add Skill
                  </button>
                </div>

                {employeeSkills.length > 0 ? (
                  <div className="space-y-4">
                    {employeeSkills.map((record, idx) => {
                      const skillId = record.id || `skill-${idx}`;
                      const isExpanded = expandedSkills.has(skillId);

                      return (
                        <div
                          key={skillId}
                          className={`group bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'border-indigo-400 shadow-xl shadow-indigo-50' : 'border-indigo-50 shadow-sm hover:border-indigo-200 hover:shadow-md'
                            }`}
                        >
                          {/* CARD HEADER */}
                          <div
                            onClick={() => toggleExpand(skillId)}
                            className="p-5 flex items-center justify-between cursor-pointer select-none"
                          >
                            <div className="flex items-center gap-5 flex-1 min-w-0">
                              <div className="flex flex-col min-w-[140px]">
                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">
                                  {record.categoryName || "General"}
                                </span>
                                <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                  {record.skillName || "Unnamed Skill"}
                                </h4>
                              </div>

                              <div className="hidden sm:flex shrink-0">
                                <div className="inline-flex items-center gap-1.5 bg-indigo-50/50 text-indigo-700 px-3 py-1.5 rounded-xl border border-indigo-100 text-[11px] font-black uppercase tracking-wider">
                                  <Check size={14} className="stroke-[3px]" />
                                  {record.proficiencyName || "Not Set"}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 ml-4">
                              <div className="flex items-center gap-1 pr-4 border-r border-gray-100">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedSkill(record); setIsEditModalOpen(true); }}
                                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                  title="Edit Mastery"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteSkill(record.id); }}
                                  className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                  title="Delete Record"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                              <motion.div
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                className="text-gray-400"
                              >
                                <ChevronDown size={20} />
                              </motion.div>
                            </div>
                          </div>

                          {/* EXPANDED CONTENT */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                              >
                                <div className="px-5 pb-6 pt-2 bg-slate-50/30 border-t border-indigo-50/50">
                                  <div className="flex items-center gap-2 mb-4">
                                    <div className="w-1 h-3 bg-indigo-300 rounded-full"></div>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sub-skill Specializations</span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {(record.subSkills || []).length > 0 ? (
                                      record.subSkills.map((ss, i) => (
                                        <div
                                          key={i}
                                          className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-indigo-50 shadow-sm hover:border-indigo-200 transition-all hover:translate-y-[-1px]"
                                        >
                                          <span className="text-xs font-bold text-gray-700">{ss.name}</span>
                                          <span className="text-[10px] font-black text-indigo-500 uppercase bg-indigo-50/50 px-2 py-0.5 rounded-md">
                                            {ss.proficiencyName}
                                          </span>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="col-span-full py-4 text-center">
                                        <p className="text-xs text-gray-400 italic">No sub-skill specializations mapped for this core skill.</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 px-6 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200 text-center">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
                      <Search className="text-gray-200" size={32} />
                    </div>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No matching skills found</p>
                    <p className="text-xs text-gray-300 mt-1">Start by adding professional skills to this employee's profile.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "profile" && (
            <ProfilePage
              activeTab={activeTab}
              user_uuid={employee.user_uuid}
              coreData={employee}
              hrData={hrData}
              refreshData={fetchAllData}
              onTabChange={handleTabChange}
            />
          )}
          {activeTab === "job" && (
            <JobPage user_uuid={employee.user_uuid} coreData={employee} hrData={hrData} />
          )}
          {activeTab === "documents" && (
            <DocumentsPage
              employee={mappedEmployee}
              user_uuid={employee.user_uuid}
              hrData={hrData}
              identityTypes={identityTypes}
              config={docTabConfig}
              rawCertifications={rawCertifications}
              refreshCertifications={() => fetchRawCertifications(employee.employee_id)}
            />
          )}
        </div>
      </div>

      {isSkillModalOpen && (
        <SkillModal
          employeeId={employee.employee_id}
          selectedSkill={null}
          onClose={() => setIsSkillModalOpen(false)}
          onSaveSuccess={() => {
            fetchEmployeeSkills();
            setIsSkillModalOpen(false);
          }}
        />
      )}

      {isEditModalOpen && (
        <EditSkillModal
          employeeId={employee.employee_id}
          skillData={selectedSkill}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedSkill(null);
          }}
          onSaveSuccess={() => {
            fetchEmployeeSkills();
            setIsEditModalOpen(false);
            setSelectedSkill(null);
          }}
        />
      )}
    </div>
  );
}

/* ===================== HELPER COMPONENTS ===================== */

const Info = ({ icon, text }) => (
  <div className="flex items-start gap-2 text-indigo-700 min-w-0">
    <div className="shrink-0 mt-0.5">{icon}</div>
    <span className="break-words min-w-0">{text}</span>
  </div>
);

const Tab = ({ children, active, onClick }) => (
  <button
    onClick={onClick}
    className={`pb-3 px-3 sm:px-1 whitespace-nowrap transition shrink-0 ${active
      ? "border-b-2 border-indigo-600 text-indigo-700 font-semibold"
      : "text-gray-500 hover:text-indigo-600"
      }`}
  >
    {children}
  </button>
);

const SkillTag = ({ name }) => (
  <div className="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold border border-indigo-100 shadow-sm hover:bg-indigo-100 transition whitespace-nowrap">
    {name}
  </div>
);

// Ad-hoc CSS for rich text content
if (typeof document !== "undefined") {
  const styleId = "editor-content-styles";
  if (!document.getElementById(styleId)) {
    const styleTag = document.createElement("style");
    styleTag.id = styleId;
    styleTag.innerHTML = `
      .editor-content a {
    color: #4f46e5 !important;
    text-decoration: underline !important;
    font-weight: 600 !important;
    cursor: pointer !important;
    pointer-events: auto !important;
    transition: all 0.2s ease !important;
  }
  .editor-content a:hover {
    color: #3730a3 !important;
    text-decoration: none !important;
    background-color: #eef2ff !important;
    padding: 2px 4px !important;
    margin: -2px -4px !important;
    border-radius: 4px !important;
  }
  .rich-editor-active {
    box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.15) !important;
    border-color: #4f46e5 !important;
    transform: scale(1.002);
  }
  .rich-editor-container {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
`;
    document.head.appendChild(styleTag);
  }
}
