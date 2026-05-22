"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, Phone, Building2, User, Camera, Bold, Italic, Underline,
  List, ListOrdered, Link, Briefcase, Plus, Loader2, Check, Edit2,
  Trash2, Search, AlertCircle, ChevronDown, ChevronRight, PencilLine,
  MapPin, Calendar, Hash, Users, Sparkles, FileText, Star, Award,
  Layers, X, Heart, Zap,
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

/* ═══════════════════════════════════════════════════════════════════
   DESIGN SYSTEM  v3  —  Brand palette
     Navy  #081534   Blue  #263383   Pink  #ff3d72
     Surface #f4f6fc
═══════════════════════════════════════════════════════════════════ */
const EPV3_STYLES = `
  @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700;800;900&family=Dancing+Script:wght@700&display=swap");

.epv3 {
  font-family: "Inter", system-ui, sans-serif;
  background: #f4f6fc;
  min-height: 100vh;

  width: 100%;
  margin: 0;
  padding: 0;
}
  .epv3-display { font-family: "Poppins", system-ui, sans-serif; }
.epv3-hero-wrap {
  position: relative;
  overflow: hidden;

  background: #ffffff;

  min-height: 72px;

  display: flex;

  width: 100%;

  margin: 0;

  box-shadow: none;

  border: none;
}
  /* ─── Left dark panel — diagonal slant divider ─── */
 .epv3-hero-left {
  position: relative;

  width: 38%;
  min-width: 300px;

  padding: 0 36px;

  display: flex;
  align-items: center;
  justify-content: flex-start;

  overflow: hidden;

  z-index: 2;

  background:
    radial-gradient(circle at 20% 30%, rgba(72,98,255,0.28), transparent 40%),
    radial-gradient(circle at 80% 80%, rgba(255,61,114,0.14), transparent 35%),
    linear-gradient(145deg, #020817 0%, #04153c 35%, #081d58 70%, #132766 100%);

  clip-path: polygon(0 0, 100% 0, 82% 100%, 0 100%);
}
  .epv3-hero-left::after {
    content: "";
    position: absolute;
    top: 10%; right: 4%;
    width: 260px; height: 80%;
    background: rgba(255,255,255,0.04);
    border-radius: 50%;
    filter: blur(3px);
    pointer-events: none;
  }
  .epv3-hero-left::before {
    content: "";
    position: absolute;
    top: -10%; right: -5%;
    width: 340px; height: 110%;
    background: rgba(255,255,255,0.025);
    border-radius: 50%;
    pointer-events: none;
  }
  /* ─── Dot pattern overlay ─── */
  .epv3-dots {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(rgba(132,146,255,0.35) 1.4px, transparent 1.4px);
    background-size: 32px 32px;
    opacity: 0.7;
    pointer-events: none;
  }

  /* ─── Avatar ring ─── */
  .epv3-av-ring {
    position: relative;
    width: 72px; height: 72px;
    border-radius: 999px;
    border: 5px solid rgba(255,255,255,0.95);
    display: flex; align-items: center; justify-content: center;
    box-shadow:
      0 20px 60px rgba(0,0,0,0.45),
      inset 0 0 20px rgba(255,255,255,0.08);
    z-index: 2;
    flex-shrink: 0;
  }
  /* ─── Avatar ─── */
  .epv3-av {
    width: 90px; height: 90px;
    border-radius: 999px;
    background: linear-gradient(145deg, #3145b7 0%, #1f2f82 45%, #081534 100%);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; position: relative; overflow: hidden;
    box-shadow:
      inset 0 8px 20px rgba(255,255,255,0.06),
      0 10px 30px rgba(0,0,0,0.35);
    flex-shrink: 0;
    transition: transform 0.2s ease;
  }
  .epv3-av:hover { transform: scale(1.04); }
  .epv3-av:hover .epv3-av-ov { opacity: 1; }
  .epv3-av-ov {
    position: absolute; inset: 0; border-radius: 50%;
    background: rgba(8,21,52,0.62);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    opacity: 0; transition: opacity 0.2s ease; gap: 2px;
  }


  /* ─── Right info panel ─── */
  .epv3-hero-right {
  flex: 1;

  padding: 10px 32px;

  display: flex;
  align-items: center;

  position: relative;
  overflow: hidden;

  background:
    linear-gradient(
      135deg,
      #ffffff 0%,
      #fff8fb 55%,
      #fdeef5 100%
    );
}
  /* Large soft pink wave — upper right */
  .epv3-hero-right::before {
  content: "";

  position: absolute;

  bottom: -90px;
  left: 18%;

  width: 900px;
  height: 320px;

  background:
    radial-gradient(
      ellipse at center,
      rgba(255,192,203,.35) 0%,
      rgba(255,192,203,.14) 45%,
      transparent 72%
    );

  border-radius: 50%;

  transform: rotate(-8deg);
}
  /* Lavender wave — lower left sweep */
 .epv3-hero-right::after {
  content: "";

  position: absolute;

  bottom: -120px;
  right: -10%;

  width: 720px;
  height: 260px;

  background:
    radial-gradient(
      ellipse at center,
      rgba(196,181,253,.28) 0%,
      rgba(196,181,253,.08) 48%,
      transparent 75%
    );

  border-radius: 50%;

  transform: rotate(8deg);
}
  /* Middle wave blob */
  .epv3-wave-mid {
    position: absolute;
    top: 15%; right: 12%;
    width: 280px; height: 240px;
    background: radial-gradient(ellipse at 50% 50%,
      rgba(255,160,195,0.20) 0%,
      rgba(190,140,255,0.12) 50%,
      transparent 75%);
    border-radius: 48% 58% 52% 62% / 60% 44% 58% 46%;
    filter: blur(18px);
    pointer-events: none;
  }
  /* Corner wave rings — top-right */
  .epv3-cw1 {
    position: absolute; top: -50px; right: -50px;
    width: 150px; height: 150px; border-radius: 50%;
    border: 2px solid rgba(255,120,165,0.38);
    pointer-events: none;
  }
  .epv3-cw2 {
    position: absolute; top: -72px; right: -72px;
    width: 240px; height: 240px; border-radius: 50%;
    border: 2px solid rgba(196,181,253,0.30);
    pointer-events: none;
  }
  .epv3-cw3 {
    position: absolute; top: -95px; right: -95px;
    width: 340px; height: 340px; border-radius: 50%;
    border: 1.5px solid rgba(255,150,185,0.20);
    pointer-events: none;
  }
  .epv3-cw4 {
    position: absolute; top: -118px; right: -118px;
    width: 440px; height: 440px; border-radius: 50%;
    border: 1px solid rgba(196,181,253,0.13);
    pointer-events: none;
  }
  .epv3-hero-content {
    position: relative;
    z-index: 1;
    width: 100%;
  }
  .epv3-hero-main {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
  }
  .epv3-hero-kicker {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    width: fit-content;
    padding: 5px 10px;
    border-radius: 999px;
    background: rgba(38,51,131,0.07);
    color: #263383;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    border: 1px solid rgba(38,51,131,0.09);
  }
  .epv3-hero-name {
    color: #081534;
    font-size: clamp(20px, 2.3vw, 30px);
    line-height: 1.06;
    font-weight: 900;
    margin-top: 4px;
    letter-spacing: -0.02em;
  }
  .epv3-hero-role {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 4px;
    color: #263383;
    font-size: 17px;
    font-weight: 750;
  }
  .epv3-verified {
    width: 24px;
    height: 24px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    background: linear-gradient(135deg, #6d5dfc 0%, #8b5cf6 100%);
    box-shadow: 0 8px 18px rgba(109,93,252,0.28);
  }
  .epv3-chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 14px;
  }
  .epv3-float-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 36px;
    padding: 8px 14px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 800;
    color: #263383;
    background: #f1f3f8;
    border: 1px solid #dde3ef;
    box-shadow: 0 2px 8px rgba(8,21,52,0.07);
  }
  .epv3-float-chip.pink {
    color: #be2857;
    background: #fff0f5;
    border-color: rgba(255,61,114,0.22);
  }
  .epv3-float-chip.green {
    color: #047857;
    background: #f0fdf7;
    border-color: rgba(16,185,129,0.22);
  }
  .epv3-hero-side {
    border-radius: 18px;
    padding: 14px 16px;
    background: #ffffff;
    border: 1px solid #e4eaf5;
    box-shadow: 0 20px 50px rgba(8,21,52,0.12), 0 4px 16px rgba(8,21,52,0.06);
  }
  .epv3-hero-side-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 2px 2px 12px;
    border-bottom: 1px solid rgba(226,232,240,0.74);
  }
  .epv3-hero-side-title span:first-child {
    color: #081534;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .epv3-hero-id {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 8px;
    border-radius: 999px;
    background: #081534;
    color: rgba(255,255,255,0.86);
    font-size: 10px;
    font-weight: 800;
  }
  .epv3-hero-info-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
    margin-top: 14px;
  }
  .epv3-hero-info {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr);
    gap: 10px;
    align-items: center;
    min-width: 0;
    padding: 4px 2px;
  }
  .epv3-hero-info-icon {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .epv3-hero-info-label {
    color: #94a3b8;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .epv3-hero-info-value {
    color: #1e293b;
    font-size: 12px;
    font-weight: 750;
    line-height: 1.3;
    overflow-wrap: anywhere;
  }

  /* ── Stats strip ── */
  .epv3-stats {
    background: #fff;
    border-radius: 16px;
    border: 1px solid #e4e8f2;
    box-shadow: 0 2px 12px rgba(8,21,52,0.06);
    display: flex;
    overflow: hidden;
  }
  .epv3-stat-cell {
    flex: 1;
    display: flex; align-items: center; gap: 14px;
    padding: 18px 22px;
    transition: background 0.15s;
  }
  .epv3-stat-cell + .epv3-stat-cell { border-left: 1px solid #eaecf3; }

  /* ── Generic card ── */
  .epv3-card {
    background: #fff;
    border-radius: 12px;
    border: 1px solid #e4e8f2;
    box-shadow: 0 1px 4px rgba(8,21,52,0.04), 0 4px 16px rgba(8,21,52,0.03);
    overflow: hidden;
  }

  /* ── Section header variants ── */
  .epv3-dark-hdr {
    background: linear-gradient(135deg, #081534 0%, #152360 100%);
    padding: 13px 16px;
    display: flex; align-items: center; gap: 10px;
  }
  .epv3-blue-hdr {
    padding: 13px 16px; border-bottom: 2px solid #dde5ff;
    background: #f8f9ff;
    display: flex; align-items: center; gap: 10px;
  }
  .epv3-teal-hdr {
    padding: 13px 16px; border-bottom: 2px solid #c7f5e8;
    background: #f0fdf9;
    display: flex; align-items: center; gap: 10px;
  }

  /* ── Info rows ── */
  .epv3-row {
    display: flex; align-items: center;
    padding: 9px 16px; border-bottom: 1px solid #f3f4f9; gap: 10px;
  }
  .epv3-row:last-child { border-bottom: none; }

  /* ── Quick-nav mini cards ── */
  .epv3-nav-card {
    background: #fff; border-radius: 12px;
    border: 1px solid #e4e8f2;
    box-shadow: 0 1px 4px rgba(8,21,52,0.04);
    padding: 14px; cursor: pointer;
    display: flex; align-items: center; gap: 12px;
    transition: all 0.2s ease;
  }
  .epv3-nav-card:hover {
    box-shadow: 0 4px 20px rgba(38,51,131,0.12);
    transform: translateY(-2px);
    border-color: #c5cdee;
  }

  /* ── About block accents ── */
  .epv3-about-blue { border-top: 3px solid #263383; }
  .epv3-about-pink { border-top: 3px solid #ff3d72; }
  .epv3-about-navy { border-top: 3px solid #081534; }

  /* ── Skill tiles ── */
  .epv3-skill-tile {
    background: #fff; border: 1px solid #e4e8f4; border-radius: 12px;
    transition: all 0.2s ease; overflow: hidden;
  }
  .epv3-skill-tile:hover { border-color: #adb5d9; box-shadow: 0 4px 16px rgba(38,51,131,0.09); }
  .epv3-skill-tile.expanded { border-color: #6578c0; box-shadow: 0 6px 24px rgba(38,51,131,0.12); }

  /* ── Proficiency chips ── */
  .pf-beginner     { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
  .pf-intermediate { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
  .pf-advanced     { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
  .pf-expert       { background: #fdf4ff; color: #9333ea; border: 1px solid #e9d5ff; }

  /* ── Pill tabs ── */
  .epv3-tabs {
    display: flex; gap: 0px; background: #e8ecf5; border-radius: 0px; padding: 0px width: 100%;
  }
  .epv3-tab {
    display: flex; align-items: center; gap: 6px;
    padding: 8px 18px; border-radius: 9px;
    font-size: 13px; font-weight: 600; border: none; cursor: pointer; outline: none;
    white-space: nowrap; color: #64748b; background: transparent; transition: all 0.2s ease;
  }
  .epv3-tab:hover:not(.epv3-tab-on) { background: rgba(255,255,255,0.6); color: #263383; }
  .epv3-tab-on { background: #263383; color: #fff; box-shadow: 0 2px 10px rgba(38,51,131,0.28); }

  /* ── Primary button ── */
  .epv3-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 16px; background: #263383; color: #fff;
    border-radius: 10px; font-size: 12px; font-weight: 700;
    border: none; cursor: pointer; outline: none;
    box-shadow: 0 2px 8px rgba(38,51,131,0.24); transition: all 0.18s ease;
  }
  .epv3-btn:hover  { background: #1e2a70; transform: translateY(-1px); }
  .epv3-btn:active { transform: none; }

  /* ── Rich editor ── */
  .rich-editor-active { box-shadow: 0 0 0 3px rgba(38,51,131,0.15) !important; border-color: #263383 !important; }
  .editor-content a { color: #263383 !important; text-decoration: underline !important; font-weight: 600 !important; cursor: pointer !important; }

  /* ── Animations ── */
  @keyframes epv3Up    { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes epv3Scale { from { opacity:0; transform:scale(0.94);     } to { opacity:1; transform:scale(1);    } }
  @keyframes epv3Blink { 0%,100%{opacity:1;} 50%{opacity:0.35;} }

  .epv3-anim   { animation: epv3Up    0.5s  cubic-bezier(0.22,1,0.36,1) both; }
  .epv3-anim-s { animation: epv3Scale 0.42s cubic-bezier(0.22,1,0.36,1) both; }
  .epv3-blink  { animation: epv3Blink 2s ease-in-out infinite; }

  .epv3-noscroll::-webkit-scrollbar { display: none; }
  .epv3-noscroll { -ms-overflow-style: none; scrollbar-width: none; }

  @media (max-width: 768px) {
    .epv3-hero-wrap { flex-direction: column; }
    .epv3-hero-left {
      width: 100%; min-width: unset;
      clip-path: none;
      border-radius: 0;
      padding: 28px 28px 32px;
    }
    .epv3-hero-right { padding: 24px; }
    .epv3-hero-name { font-size: 30px; }
    .epv3-hero-role { font-size: 15px; }
    .epv3-stats { flex-direction: column; }
    .epv3-stat-cell + .epv3-stat-cell { border-left: none; border-top: 1px solid #eaecf3; }
    .epv3-tagline { font-size: 28px; }
  }
`;

(function injectEpv3Styles() {
  if (typeof document === "undefined") return;
  ["epv2-styles"].forEach(id => { const e = document.getElementById(id); if (e) e.remove(); });
  let el = document.getElementById("epv3-styles");
  if (el) { el.textContent = EPV3_STYLES; return; }
  el = document.createElement("style");
  el.id = "epv3-styles";
  el.textContent = EPV3_STYLES;
  document.head.appendChild(el);
})();

function pf(name = "") {
  const n = name.toLowerCase();
  if (n.includes("expert") || n.includes("master")) return "pf-expert";
  if (n.includes("advanc")) return "pf-advanced";
  if (n.includes("inter") || n.includes("mid")) return "pf-intermediate";
  return "pf-beginner";
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT  (all state / API logic preserved exactly)
═══════════════════════════════════════════════════════════════════ */
export default function EmployeeProfileView() {
  const { employee_uuid } = useParams();

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

  /* ── FETCH ALL DATA ── */
  const fetchAllData = async () => {
    try {
      const token = localStorage.getItem("token");
      const coreRes = await fetch(
        `${BASE_URL}/permanent-employee/core-employee-details/${employee_uuid}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!coreRes.ok) throw new Error("Failed to fetch employee");
      const coreData = await coreRes.json();

      if (coreData.employee_id) {
        fetchEmployeeSkills(coreData.employee_id);
        fetchRawCertifications(coreData.employee_id);
      }

      const parallelPromises = [];

      const deptPromise = coreData.department_uuid
        ? fetch(`${BASE_URL}/masters/departments/${coreData.department_uuid}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : {}).catch(() => ({}))
        : Promise.resolve({});
      parallelPromises.push(deptPromise);

      const desigPromise = coreData.designation_uuid
        ? fetch(`${BASE_URL}/masters/designations/${coreData.designation_uuid}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : {}).catch(() => ({}))
        : Promise.resolve({});
      parallelPromises.push(desigPromise);

      const targetUserUuid = coreData.user_uuid;
      const hrPromise = targetUserUuid
        ? fetch(`${BASE_URL}/hr/hr/${targetUserUuid}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : {}).catch(() => ({}))
        : Promise.resolve({});
      parallelPromises.push(hrPromise);

      const [deptData, desigData, hrResult] = await Promise.all(parallelPromises);
      coreData.resolved_department_name = deptData.department_name || coreData.department_uuid;
      coreData.resolved_designation_name = desigData.designation_name || desigData.name || coreData.designation_uuid;
      setEmployee(coreData);
      console.log("Employee core data with resolved names:", coreData);
      setHrData(hrResult);

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
        } catch (e) { console.error("Failed to fetch identity types:", e); }
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
      fetchEmployeeSkills();
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
      const RMSURL = window.__APP_CONFIG__.RMS_BASE_URL;
      const res = await fetch(`${RMSURL}/api/resource-certificates/resource/${targetId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const result = await res.json();
      setRawCertifications(result.data || []);
    } catch (err) { console.error("Error fetching raw certifications:", err); }
  };

  const [about, setAbout] = useState({ about_me: "", work_enjoyment: "", interests_hobbies: "" });
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
    } catch { return rawText; }
  };

  const formatAboutApiError = (rawText = "", fallback = "Failed to save changes") => {
    const message = parseApiErrorMessage(rawText);
    if (message.includes("Unknown column") && message.includes("employee_about.links"))
      return "Backend issue: employee_about.links column is missing. Please apply DB migration.";
    return message || fallback;
  };

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAboutData = async () => {
    try {
      const res = await fetch(`${BASE_URL}/employee-details/about/${employee_uuid}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        const responseData = await res.json();
        const rawData = responseData.data || responseData;
        const data = Array.isArray(rawData) ? rawData[0] : rawData;
        if (data) { setAbout(normalizeAboutData(data)); setAboutUuid(data.employee_about_uuid); }
      } else {
        const errorText = await res.text();
        const displayMessage = formatAboutApiError(errorText, "Failed to fetch about data");
        console.error("Failed to fetch about data:", displayMessage);
      }
    } catch (err) { console.error("Failed to fetch about data:", err); }
  };

  useEffect(() => {
    if (!employee_uuid || initialAboutFetchDoneRef.current) return;
    initialAboutFetchDoneRef.current = true;
    fetchAboutData();
  }, [employee_uuid]);

  const [skills] = useState(["Java", "Spring Boot", "React", "SQL", "Microservices"]);
  const [editingField, setEditingField] = useState(null);
  const editorRef = useRef(null);

  const saveField = async (key) => {
    const newContent = editorRef.current?.innerHTML ?? "";
    const updatedAbout = { ...about, [key]: newContent };
    setSavingAbout(true);
    try {
      const method = aboutUuid ? "PUT" : "POST";
      const url = aboutUuid
        ? `${BASE_URL}/employee-details/about/${employee_uuid}`
        : `${BASE_URL}/employee-details/about`;
      const payload = {
        employee_uuid,
        ...(aboutUuid ? { employee_about_uuid: aboutUuid } : {}),
        about_me: updatedAbout.about_me,
        work_enjoyment: updatedAbout.work_enjoyment,
        interests_hobbies: updatedAbout.interests_hobbies,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
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
    } finally { setSavingAbout(false); }
  };

  const handleDeleteClick = (fieldKey) => { setFieldToDelete(fieldKey); setIsDeleteModalOpen(true); };

  const confirmDelete = async () => {
    if (!fieldToDelete) return;
    setIsDeleting(true);
    try {
      const updatedAbout = { ...about, [fieldToDelete]: "" };
      const res = await fetch(`${BASE_URL}/employee-details/about/${employee_uuid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({
          employee_uuid,
          ...(aboutUuid ? { employee_about_uuid: aboutUuid } : {}),
          about_me: updatedAbout.about_me,
          work_enjoyment: updatedAbout.work_enjoyment,
          interests_hobbies: updatedAbout.interests_hobbies,
        }),
      });
      if (res.ok) { setAbout(updatedAbout); showStatusToast("Content deleted successfully", "success"); }
      else {
        const errorText = await res.text();
        throw new Error(formatAboutApiError(errorText, "Failed to delete content"));
      }
    } catch (err) {
      console.error("Delete failed:", err);
      showStatusToast("Failed to delete content", "error");
    } finally { setIsDeleting(false); setIsDeleteModalOpen(false); setFieldToDelete(null); }
  };

  const formatText = (cmd) => document.execCommand(cmd, false, null);
  const handleProfileChange = (file) => { if (file) setProfileImg(URL.createObjectURL(file)); };

  /* ── LOADING SCREEN ── */
  if (!employee || hrData === null) {
    return (
      <div className="epv3 flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-5">
          <div className="relative w-16 h-16">
            <div className="w-16 h-16 rounded-full" style={{ border: "3px solid #e4e8f2" }} />
            <div className="absolute inset-0 w-16 h-16 rounded-full animate-spin"
              style={{ border: "3px solid transparent", borderTopColor: "#263383" }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <img src="/logo.png" alt="" className="w-8 h-8 object-contain opacity-50"
                onError={e => { e.target.style.display = "none"; }} />
            </div>
          </div>
          <div className="text-center">
            <p className="epv3-display text-sm font-bold" style={{ color: "#081534" }}>Loading Profile</p>
            <p className="text-xs text-slate-400 mt-1">Fetching employee information…</p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Derived display values (unchanged) ── */
  const mappedEmployee = {
    name: `${employee.first_name || ""} ${employee.last_name || ""}`
      .toLowerCase().replace(/\b\w/g, c => c.toUpperCase()).trim(),
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

  const initials = mappedEmployee.name
    .split(" ").filter(Boolean).slice(0, 2)
    .map(n => n[0].toUpperCase()).join("");

  const TABS = [
    { key: "about",     label: "About",     icon: <User size={13} /> },
    { key: "profile",   label: "Profile",   icon: <FileText size={13} /> },
    { key: "job",       label: "Job",       icon: <Briefcase size={13} /> },
    { key: "documents", label: "Documents", icon: <Layers size={13} /> },
  ];

  /* ── About block (logic identical, visual updated) ── */
  const AboutBlock = ({ title, fieldKey, accentClass, Icon }) => {
    const PLACEHOLDERS = {
      about_me: "Share a brief professional introduction…",
      work_enjoyment: "What motivates you most in your work?",
      interests_hobbies: "Hobbies, passions, and life outside work…",
    };
    const isEditing = editingField === fieldKey;
    const hasContent = hasMeaningfulContent(about[fieldKey]);

    return (
      <div className={`epv3-card flex flex-col ${accentClass} overflow-hidden h-full`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100"
          style={{ background: "#fafbfd" }}>
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "#e8ecf5" }}>
                <Icon size={13} style={{ color: "#263383" }} />
              </div>
            )}
            <span className="epv3-display text-xs font-bold text-slate-700 uppercase tracking-wide">
              {title}
            </span>
          </div>
          {!isEditing && hasContent && (
            <div className="flex gap-0.5">
              <button onClick={() => setEditingField(fieldKey)}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-[#263383] hover:bg-blue-50 transition-colors">
                <PencilLine size={12} />
              </button>
              <button onClick={() => handleDeleteClick(fieldKey)}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 p-4">
          {isEditing ? (
            <div className="rounded-xl overflow-hidden" style={{ border: "1.5px solid #263383" }}>
              <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-slate-100" style={{ background: "#f5f6fa" }}>
                {[
                  { cmd: "bold",                icon: <Bold size={12} /> },
                  { cmd: "italic",              icon: <Italic size={12} /> },
                  { cmd: "underline",           icon: <Underline size={12} /> },
                  { cmd: "insertUnorderedList", icon: <List size={12} /> },
                  { cmd: "insertOrderedList",   icon: <ListOrdered size={12} /> },
                  { cmd: "createLink",          icon: <Link size={12} /> },
                ].map(({ cmd, icon }) => (
                  <button key={cmd} onClick={() => formatText(cmd)}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-[#263383] transition-colors">
                    {icon}
                  </button>
                ))}
              </div>
              <div
                ref={editorRef}
                contentEditable
                onFocus={e => e.target.parentElement.classList.add("rich-editor-active")}
                onBlur={e => e.target.parentElement.classList.remove("rich-editor-active")}
                className="p-4 min-h-[110px] text-sm outline-none break-words overflow-auto editor-content leading-relaxed text-slate-700"
                dangerouslySetInnerHTML={{ __html: about[fieldKey] }}
              />
              <div className="flex justify-end gap-2 px-4 py-2.5 border-t border-slate-100" style={{ background: "#fafbfd" }}>
                <button onClick={() => setEditingField(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-all">
                  Cancel
                </button>
                <button onClick={() => saveField(fieldKey)} disabled={savingAbout}
                  className="epv3-btn disabled:opacity-50 disabled:cursor-not-allowed">
                  {savingAbout
                    ? <><Loader2 size={11} className="animate-spin" />Saving…</>
                    : <><Check size={11} />Save</>
                  }
                </button>
              </div>
            </div>
          ) : hasContent ? (
            <div className="text-sm text-slate-600 break-words editor-content leading-relaxed"
              dangerouslySetInnerHTML={{ __html: about[fieldKey] }} />
          ) : (
            <button onClick={() => setEditingField(fieldKey)}
              className="group flex items-center gap-3 w-full h-full min-h-[80px] px-3 py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 font-medium hover:border-[#263383]/40 hover:text-[#263383] transition-all duration-200">
              <div className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center group-hover:border-[#263383]/30 group-hover:bg-blue-50 transition-colors flex-shrink-0">
                <Plus size={13} className="group-hover:text-[#263383]" />
              </div>
              {PLACEHOLDERS[fieldKey]}
            </button>
          )}
        </div>
      </div>
    );
  };

  /* ════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════ */
  return (
    <div className="epv3 w-full m-0 p-0">

      {/* ╔══════════════════════════════════════════════════════════╗
          ║  HERO  —  split left-dark / right-info                  ║
          ╚══════════════════════════════════════════════════════════╝ */}
      <div className="w-full m-0 p-0">
        <div className="epv3-hero-wrap epv3-anim">

          {/* ── LEFT DARK PANEL ── */}
          <div className="epv3-hero-left">

            {/* Dot pattern overlay */}
            <div className="epv3-dots" />

            {/* Avatar — ring via CSS, pink dot via ::after on ring */}
            <div className="relative z-10">
              <div className="epv3-av-ring">
                <div className="epv3-av" onClick={() => profileRef.current?.click()}>
                  {profileImg
                    ? <img src={profileImg} className="w-full h-full object-cover" alt="Profile" />
                    : <span className="epv3-display font-bold text-white select-none" style={{ fontSize: 38 }}>{initials || "?"}</span>
                  }
                  <div className="epv3-av-ov">
                    <Camera size={18} className="text-white" />
                    <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em" }}>
                      CHANGE
                    </span>
                  </div>
                </div>
              </div>
              <input hidden ref={profileRef} type="file" accept="image/*"
                onChange={e => handleProfileChange(e.target.files[0])} />
            </div>
          </div>

          {/* ── RIGHT INFO PANEL ── */}
          <div className="epv3-hero-right">
            {/* Background blob */}
            <div className="epv3-wave-mid" />
            {/* Corner waves — top-right */}
            <div className="epv3-cw1" />
            <div className="epv3-cw2" />
            <div className="epv3-cw3" />
            <div className="epv3-cw4" />

            <div className="epv3-hero-content">
              <div className="epv3-hero-main">

                <h2 className="epv3-display epv3-hero-name">
                  {mappedEmployee.name || "Employee Name"}
                </h2>

                <div className="epv3-hero-role">
                  <span>{mappedEmployee.designation || "Designation Not Updated"}</span>
                  <span className="epv3-verified" title="Verified employee profile">
                    <Check size={13} strokeWidth={3} />
                  </span>
                </div>

                <div className="epv3-chip-row">
                  {mappedEmployee.department && (
                    <span className="epv3-float-chip">
                      <Building2 size={14} />
                      {mappedEmployee.department}
                    </span>
                  )}
                  {mappedEmployee.employmentType && (
                    <span className="epv3-float-chip pink">
                      <Briefcase size={14} />
                      {mappedEmployee.employmentType}
                    </span>
                  )}
                  {employeeSkills.length > 0 && (
                    <span className="epv3-float-chip green">
                      <Award size={14} />
                      {employeeSkills.length} Skill{employeeSkills.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ╔══════════════════════════════════════════════════════════╗
          ║  TABS + CONTENT                                          ║
          ╚══════════════════════════════════════════════════════════╝ */}
      <div className="w-full px-0 pt-0 pb-10">

        {/* Tab navigation — underline style */}
        <div className="bg-white overflow-x-auto epv3-noscroll mb-4" style={{ borderBottom: "1px solid #e4e8f2" }}>
          <div className="flex min-w-max sm:min-w-0 px-4">
            {TABS.map(({ key, label, icon }) => (
              <button key={key} onClick={() => handleTabChange(key)}
                className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === key
                    ? "border-[#263383] text-[#263383]"
                    : "border-transparent text-gray-500 hover:text-[#263383] hover:border-[#263383]/30"
                }`}>
                {icon}{label}
              </button>
            ))}
          </div>
        </div>

        {/* ╔══════════════════════════════════════════════════════╗
            ║  ABOUT TAB                                           ║
            ╚══════════════════════════════════════════════════════╝ */}
        {activeTab === "about" && (
          <div className="space-y-5">

            {/* Row 1: Personal Info | Contact Info | Employment Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 epv3-anim" style={{ animationDelay: "100ms" }}>

              {/* Personal Information — dark header */}
              <div className="epv3-card">
                <div className="epv3-dark-hdr">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.15)" }}>
                    <User size={13} className="text-white" />
                  </div>
                  <span className="text-sm font-bold text-white">Personal Information</span>
                </div>
                {[
                  { label: "Employee ID",   value: mappedEmployee.empId },
                  { label: "Date of Birth", value: employee.date_of_birth || "--" },
                  { label: "Gender",        value: employee.gender || "--" },
                  { label: "Marital Status",value: employee.marital_status || "--" },
                  { label: "Nationality",   value: employee.nationality || "--" },
                ].map(({ label, value }) => (
                  <div key={label} className="epv3-row">
                    <span className="text-xs text-slate-500 flex-shrink-0" style={{ minWidth: 108 }}>{label}</span>
                    <span className="text-xs font-semibold text-slate-800 break-all">{value}</span>
                  </div>
                ))}
              </div>

              {/* Contact Information — blue accent */}
              <div className="epv3-card">
                <div className="epv3-blue-hdr">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "#dde5ff" }}>
                    <Phone size={13} style={{ color: "#263383" }} />
                  </div>
                  <span className="text-sm font-bold" style={{ color: "#263383" }}>Contact Information</span>
                </div>
                <div className="p-2">
                  {[
                    { icon: Mail,   label: "Work Email", value: mappedEmployee.email,                                              bg: "#ede9fe", color: "#7c3aed" },
                    { icon: Phone,  label: "Phone",      value: mappedEmployee.phone,                                              bg: "#d1fae5", color: "#059669" },
                    { icon: MapPin, label: "Location",   value: mappedEmployee.office !== "Not Updated" ? mappedEmployee.office : "--", bg: "#fce7f3", color: "#db2777" },
                  ].map(({ icon: Icon, label, value, bg, color }) => (
                    <div key={label} className="flex items-center gap-3 px-3 py-3 border-b border-slate-50 last:border-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: bg, color }}>
                        <Icon size={13} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-400 font-semibold mb-0.5">{label}</p>
                        <p className="text-xs font-semibold text-slate-800 break-all">{value || "--"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Employment Details — teal accent */}
              <div className="epv3-card">
                <div className="epv3-teal-hdr">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "#c7f5e8" }}>
                    <Briefcase size={13} style={{ color: "#059669" }} />
                  </div>
                  <span className="text-sm font-bold" style={{ color: "#059669" }}>Employment Details</span>
                </div>
                <div className="p-2">
                  {[
                    { icon: Building2, label: "Department",       value: mappedEmployee.department,    bg: "#dbeafe", color: "#2563eb" },
                    { icon: Briefcase, label: "Employment Type",  value: mappedEmployee.employmentType, bg: "#d1fae5", color: "#059669" },
                    { icon: Calendar,  label: "Joined On",        value: mappedEmployee.joiningDate,   bg: "#ffedd5", color: "#ea580c" },
                  ].map(({ icon: Icon, label, value, bg, color }) => (
                    <div key={label} className="flex items-center gap-3 px-3 py-3 border-b border-slate-50 last:border-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: bg, color }}>
                        <Icon size={13} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-400 font-semibold mb-0.5">{label}</p>
                        <p className="text-xs font-semibold text-slate-800">{value || "--"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Row 2: Quick-nav cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 epv3-anim" style={{ animationDelay: "150ms" }}>
              {[
                { icon: Users,    title: "Reporting Manager", label: "Reports To",     value: mappedEmployee.reportingManager, bg: "#ede9fe", color: "#7c3aed", tab: "profile",   config: null },
                { icon: FileText, title: "Documents",         label: "Total Documents",value: "0",                             bg: "#ffedd5", color: "#ea580c", tab: "documents", config: null },
                { icon: Sparkles, title: "Education",         label: "Total Education",value: "0",                             bg: "#d1fae5", color: "#059669", tab: "documents", config: { folder: "education", search: "" } },
                { icon: Award,    title: "Skills Overview",   label: "Total Skills",   value: employeeSkills.length,           bg: "#fce7f3", color: "#db2777", tab: "about",     config: null },
              ].map(({ icon: Icon, title, label, value, bg, color, tab, config }) => (
                <div key={title} className="epv3-nav-card"
                  onClick={() => handleTabChange(tab, config)}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: bg, color }}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {label}:{" "}
                      <span className="font-semibold" style={{ color }}>{value}</span>
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
                </div>
              ))}
            </div>

            {/* Row 3: About blocks */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 epv3-anim" style={{ animationDelay: "200ms" }}>
              <AboutBlock title="About Me"                    fieldKey="about_me"         accentClass="epv3-about-blue" Icon={User} />
              <AboutBlock title="What I Enjoy About My Work"  fieldKey="work_enjoyment"   accentClass="epv3-about-pink" Icon={Zap} />
              <AboutBlock title="Interests & Hobbies"         fieldKey="interests_hobbies" accentClass="epv3-about-navy" Icon={Heart} />
            </div>

            {/* Row 4: Skills */}
            <div className="epv3-anim epv3-card overflow-hidden" style={{ animationDelay: "250ms" }}>
              {/* Skills header — dark strip */}
              <div className="flex items-center justify-between px-6 py-4"
                style={{ background: "linear-gradient(135deg, #081534 0%, #0f1d50 60%, #1a2d7c 100%)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.12)" }}>
                    <Award size={15} className="text-white" />
                  </div>
                  <div>
                    <h3 className="epv3-display text-white text-sm font-bold">Professional Skillset</h3>
                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
                      {employeeSkills.length} skill{employeeSkills.length !== 1 ? "s" : ""} on record
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedSkill(null); setIsSkillModalOpen(true); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:-translate-y-0.5"
                  style={{ background: "#ff3d72", color: "#fff", boxShadow: "0 2px 8px rgba(255,61,114,0.35)" }}>
                  <Plus size={13} />Add Skill
                </button>
              </div>

              {/* Skills content */}
              <div className="p-5">
                {employeeSkills.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {employeeSkills.map((record, idx) => {
                      const skillId = record.id || `skill-${idx}`;
                      const isExp = expandedSkills.has(skillId);
                      const pfClass = pf(record.proficiencyName);

                      return (
                        <div key={skillId} className={`epv3-skill-tile ${isExp ? "expanded" : ""}`}>
                          <div onClick={() => toggleExpand(skillId)}
                            className="flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none">
                            <div className="w-1 h-10 rounded-full flex-shrink-0"
                              style={{ background: "linear-gradient(180deg, #263383 0%, #ff3d72 100%)" }} />

                            <div className="flex-1 min-w-0">
                              <span className="text-[9px] font-black uppercase tracking-[0.12em]"
                                style={{ color: "#9ca3af" }}>
                                {record.categoryName || "General"}
                              </span>
                              <p className="text-sm font-bold truncate" style={{ color: "#0c1b45" }}>
                                {record.skillName || "Unnamed Skill"}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`hidden xs:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border text-[10px] font-bold uppercase ${pfClass}`}>
                                <Check size={9} strokeWidth={3} />
                                {record.proficiencyName || "Not Set"}
                              </span>
                              <div className="flex items-center gap-0.5 border-l border-slate-100 pl-2">
                                <button
                                  onClick={e => { e.stopPropagation(); setSelectedSkill(record); setIsEditModalOpen(true); }}
                                  className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-[#263383] hover:bg-blue-50 transition-all"
                                  title="Edit">
                                  <Edit2 size={11} />
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); handleDeleteSkill(record.id); }}
                                  className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                  title="Delete">
                                  <Trash2 size={11} />
                                </button>
                              </div>
                              <motion.div
                                animate={{ rotate: isExp ? 180 : 0 }}
                                transition={{ duration: 0.22, ease: "easeInOut" }}
                                className="text-slate-400">
                                <ChevronDown size={14} />
                              </motion.div>
                            </div>
                          </div>

                          <AnimatePresence>
                            {isExp && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}>
                                <div className="px-4 pb-4 pt-1 border-t border-slate-100"
                                  style={{ background: "#fafbfd" }}>
                                  <p className="text-[9px] font-black uppercase tracking-[0.14em] mb-2.5"
                                    style={{ color: "#9ca3af" }}>
                                    Sub-Skill Specializations
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {(record.subSkills || []).length > 0
                                      ? record.subSkills.map((ss, i) => (
                                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-white"
                                          style={{ borderColor: "#e4e8f4" }}>
                                          <span className="text-xs font-semibold" style={{ color: "#1e2a4a" }}>{ss.name}</span>
                                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${pf(ss.proficiencyName)}`}>
                                            {ss.proficiencyName}
                                          </span>
                                        </div>
                                      ))
                                      : <p className="text-xs text-slate-400 italic">No sub-skills mapped.</p>
                                    }
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
                  <div className="flex flex-col items-center justify-center py-12 rounded-2xl text-center"
                    style={{ background: "linear-gradient(135deg, #f8f9fe 0%, #eef1f9 100%)", border: "2px dashed #d8ddf0" }}>
                    <div className="w-14 h-14 rounded-2xl mb-3 flex items-center justify-center"
                      style={{ background: "linear-gradient(145deg, #081534, #263383)" }}>
                      <Award size={22} className="text-white" />
                    </div>
                    <p className="epv3-display text-sm font-bold" style={{ color: "#0c1b45" }}>
                      No skills recorded yet
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
                      Build this employee's professional profile by adding their key skills.
                    </p>
                    <button
                      onClick={() => { setSelectedSkill(null); setIsSkillModalOpen(true); }}
                      className="epv3-btn mt-4">
                      <Plus size={13} />Add First Skill
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ── PROFILE TAB ── */}
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

        {/* ── JOB TAB ── */}
        {activeTab === "job" && (
          <JobPage user_uuid={employee.user_uuid} coreData={employee} hrData={hrData} />
        )}

        {/* ── DOCUMENTS TAB ── */}
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

      {/* ── MODALS ── */}
      {isSkillModalOpen && (
        <SkillModal
          employeeId={employee.employee_id}
          selectedSkill={null}
          onClose={() => setIsSkillModalOpen(false)}
          onSaveSuccess={() => { fetchEmployeeSkills(); setIsSkillModalOpen(false); }}
        />
      )}
      {isEditModalOpen && (
        <EditSkillModal
          employeeId={employee.employee_id}
          skillData={selectedSkill}
          onClose={() => { setIsEditModalOpen(false); setSelectedSkill(null); }}
          onSaveSuccess={() => { fetchEmployeeSkills(); setIsEditModalOpen(false); setSelectedSkill(null); }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   LEGACY HELPERS  (kept for child-component compat)
═══════════════════════════════════════════════════════ */
function SidebarSectionLabel({ label }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}
function SidebarInfo({ icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5 min-w-0">
      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: "#eef0f8", color: "#263383" }}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-black uppercase tracking-[0.12em] mb-0.5 text-slate-400">{label}</p>
        <p className="text-xs font-semibold break-words leading-snug" style={{ color: "#1e2a4a" }}>{value}</p>
      </div>
    </div>
  );
}
const Info = ({ icon, text }) => (
  <div className="flex items-start gap-2 text-indigo-700 min-w-0">
    <div className="shrink-0 mt-0.5">{icon}</div>
    <span className="break-words min-w-0 text-sm">{text}</span>
  </div>
);
const Tab = ({ children, active, onClick }) => (
  <button onClick={onClick}
    className={`pb-3 px-3 sm:px-1 whitespace-nowrap transition shrink-0 ${
      active ? "border-b-2 border-indigo-600 text-indigo-700 font-semibold" : "text-gray-500 hover:text-indigo-600"
    }`}>
    {children}
  </button>
);
const SkillTag = ({ name }) => (
  <div className="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold border border-indigo-100 shadow-sm hover:bg-indigo-100 transition whitespace-nowrap">
    {name}
  </div>
);
