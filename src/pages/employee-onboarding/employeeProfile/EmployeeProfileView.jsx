"use client";

import React, { useState, useRef, useEffect } from "react";
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
  FileText,
} from "lucide-react";

import { useParams } from "react-router-dom";

import ProfilePage from "./ProfilePage";
import JobPage from "./JobPage";
import DocumentsPage from "./DocumentsPage";  


export default function EmployeeProfileView() {
  const {employee_uuid} = useParams();

  const [activeTab, setActiveTab] = useState("profile");
  const [docTabConfig, setDocTabConfig] = useState({ folder: "education", search: "" });

  const handleTabChange = (tab, config = null) => {
    setActiveTab(tab);
    if (config) setDocTabConfig(config);
  };
  const [profileImg, setProfileImg] = useState(null);
  const profileRef = useRef(null);
  const [employee, setEmployee] = useState(null);
  const BASE_URL = import.meta.env.VITE_EMPLOYEE_ONBOARDING_URL;
  const [hrData, setHrData] = useState(null);
  const [identityTypes, setIdentityTypes] = useState([]);

   // ✅ FETCH ALL DATA ONCE (core + hr + department + designation in parallel)
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
              const idTypesData = await idTypesRes.ok ? await idTypesRes.json() : [];
              setIdentityTypes(Array.isArray(idTypesData) ? idTypesData : []);
            }
          } catch (e) {
            console.error("Failed to fetch identity types:", e);
          }
        }
      } catch (err) {
        console.error("Error fetching employee:", err);
        setEmployee({}); // prevent infinite loading
        setHrData({});
      }
    };

  useEffect(() => {
    if (employee_uuid) fetchAllData();
  }, [employee_uuid, BASE_URL]);

    const [about, setAbout] = useState({
    summary: "",
    loveJob: "",
    hobbies: "",
  });

  const [skills] = useState([
    "Java",
    "Spring Boot",
    "React",
    "SQL",
    "Microservices",
  ]);

  const [editingField, setEditingField] = useState(null);
  const editorRef = useRef(null);

  // ✅ LOADING STATE
  if (!employee || hrData === null) {
    return <div className="p-10 text-center">Loading employee data...</div>;
  }

  const mappedEmployee = {
    name: `${employee.first_name || ""} ${employee.last_name || ""}` .toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).trim(),
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

  const saveField = (key) => {
    setAbout({
      ...about,
      [key]: editorRef.current.innerHTML,
    });
    setEditingField(null);
  };

  const AboutBlock = ({ title, fieldKey }) => (
    <div className="mb-8 w-full">
      <h4 className="font-semibold text-indigo-800 mb-3">{title}</h4>

      {editingField === fieldKey ? (
        <div className="border border-indigo-100 rounded-xl bg-white shadow-md w-full">
          <div className="flex flex-wrap gap-4 p-3 border-b bg-indigo-50 text-indigo-700">
            <button onClick={() => formatText("bold")}><Bold size={16} /></button>
            <button onClick={() => formatText("italic")}><Italic size={16} /></button>
            <button onClick={() => formatText("underline")}><Underline size={16} /></button>
            <button onClick={() => formatText("insertUnorderedList")}><List size={16} /></button>
            <button onClick={() => formatText("insertOrderedList")}><ListOrdered size={16} /></button>
            <button onClick={() => formatText("createLink")}><Link size={16} /></button>
          </div>

          <div
            ref={editorRef}
            contentEditable
            className="p-4 min-h-[140px] text-sm outline-none break-words whitespace-pre-wrap overflow-auto max-w-full"
            dangerouslySetInnerHTML={{ __html: about[fieldKey] }}
          />

          <div className="flex justify-end gap-3 p-3 border-t bg-indigo-50">
            <button
              onClick={() => setEditingField(null)}
              className="px-4 py-1 text-sm border border-indigo-200 rounded-md text-indigo-600"
            >
              Cancel
            </button>
            <button
              onClick={() => saveField(fieldKey)}
              className="px-4 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
            >
              Save
            </button>
          </div>
        </div>
      ) : about[fieldKey] ? (
        <div
          className="text-sm text-gray-700 break-words whitespace-pre-wrap overflow-hidden"
          dangerouslySetInnerHTML={{ __html: about[fieldKey] }}
        />
      ) : (
        <button
          onClick={() => setEditingField(fieldKey)}
          className="text-sm text-indigo-500 hover:text-indigo-700"
        >
          + Add your response
        </button>
      )}
    </div>
  );

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
                <img src={profileImg} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-semibold text-white">
                  {mappedEmployee.name.charAt(0)}
                </div>
              )}

              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                <div className="text-white text-xs flex flex-col items-center">
                  <Camera size={18} />
                  Edit Photo
                </div>
              </div>
            </div>

            <input
              hidden
              ref={profileRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleProfileChange(e.target.files[0])}
            />

            <h2 className="mt-4 text-xl font-semibold text-indigo-900 break-words">
              {mappedEmployee.name}
            </h2>
            <p className="text-indigo-600 text-sm break-words">
              {mappedEmployee.designation}
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur rounded-2xl shadow-md p-5 text-sm space-y-3 border border-indigo-100">
            <Info icon={<Mail size={14} />} text={mappedEmployee.email} />
            <Info icon={<Phone size={14} />} text={mappedEmployee.phone} />
            <Info icon={<Building2 size={14} />} text={mappedEmployee.office} />
            <Info icon={<User size={14} />} text={`ID: ${mappedEmployee.empId}`} />
          </div>

          {/* Department Section */}
          <div className="bg-white/80 backdrop-blur rounded-2xl shadow-md p-5 text-sm border border-indigo-100">
            <div className="mb-3">
              <p className="text-xs text-indigo-400 uppercase tracking-wide">
                Department
              </p>
              <p className="font-semibold text-indigo-900 break-words">
                {mappedEmployee.department}
              </p>
            </div>

            <div>
              <p className="text-xs text-indigo-400 uppercase tracking-wide">
                Reporting Manager
              </p>
              <p className="font-semibold text-indigo-900 break-words">
                {mappedEmployee.reportingManager}
              </p>
            </div>
          </div>

        </div>

        {/* RIGHT SIDE */}
        <div className="lg:col-span-2 xl:col-span-3 min-w-0 overflow-hidden">

          <div className="border-b border-indigo-100 mb-6 flex gap-1 sm:gap-6 text-sm overflow-x-auto scrollbar-hide">
            <Tab active={activeTab === "about"} onClick={() => handleTabChange("about")}>About</Tab>
            <Tab active={activeTab === "profile"} onClick={() => handleTabChange("profile")}>Profile</Tab>
            <Tab active={activeTab === "job"} onClick={() => handleTabChange("job")}>Job</Tab>
            <Tab active={activeTab === "documents"} onClick={() => handleTabChange("documents")}>Documents</Tab>
          </div>

          {activeTab === "about" && (
            <div className="space-y-6">
              <div className="bg-white/80 backdrop-blur rounded-2xl shadow-md p-6 border border-indigo-100">
                <AboutBlock title="About" fieldKey="summary" />
                <AboutBlock title="What I love about my job?" fieldKey="loveJob" />
                <AboutBlock title="My interests and hobbies" fieldKey="hobbies" />
              </div>

              <div className="bg-white/80 backdrop-blur rounded-2xl shadow-md p-6 border border-indigo-100">
                <h3 className="text-lg font-semibold text-indigo-900 mb-4">Skillset</h3>
                <div className="flex flex-wrap gap-3">
                  {skills.map((skill, index) => (
                    <SkillTag key={index} name={skill} />
                  ))}
                </div>
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
            <JobPage user_uuid={employee.user_uuid}
            coreData={employee}
            hrData={hrData} />
          )}
          {activeTab === "documents" && (
            <DocumentsPage 
              employee={mappedEmployee} 
              user_uuid={employee.user_uuid}
              hrData={hrData} 
              identityTypes={identityTypes} 
              config={docTabConfig} 
            />
           )}

        </div>
      </div>
    </div>
  );
}

const Info = ({ icon, text }) => (
  <div className="flex items-start gap-2 text-indigo-700 min-w-0">
    <div className="shrink-0 mt-0.5">{icon}</div>
    <span className="break-words min-w-0">{text}</span>
  </div>
);

const Tab = ({ children, active, onClick }) => (
  <button
    onClick={onClick}
    className={`pb-3 px-3 sm:px-1 whitespace-nowrap transition shrink-0 ${
      active
        ? "border-b-2 border-indigo-600 text-indigo-700 font-semibold"
        : "text-gray-500 hover:text-indigo-600"
    }`}
  >
    {children}
  </button>
);

const SkillTag = ({ name }) => (
  <div className="px-4 py-2 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-full text-sm font-medium hover:from-indigo-200 hover:to-purple-200 transition">
    {name}
  </div>
);