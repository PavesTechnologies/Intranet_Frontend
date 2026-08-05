import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, LogOut, User, Menu, X, Eye, EyeOff, KeyRound, ChevronDown, } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

import Modal from "../Modal/modal";
import api from "../../api/axiosInstance";
import { showStatusToast } from "../toastfy/toast";

const EMPTY_PW_FORM = { newPassword: "", confirmPassword: "" };
const EMPTY_SHOW_PW = { current: false, new: false, confirm: false };

const Header = ({ onToggleSidebar, isSidebarOpen }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwForm, setPwForm] = useState(EMPTY_PW_FORM);
  const [pwErrors, setPwErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(EMPTY_SHOW_PW);

  const name = user?.name || user?.email || "User";
  const firstName = name.split(" ")[0];
  //  const role = user?.roles?.join(", ") || "User";


  const iconVariants = {
    hidden: { rotate: -15, opacity: 1, scale: 0.5 },
    visible: { rotate: 0, opacity: 1, scale: 1, transition: { duration: 0.25 } },
    exit: { rotate: 15, opacity: 1, scale: 0.5, transition: { duration: 0.25 } },
  };

  /* ── Fetch employee UUID for profile navigation ── */
  useEffect(() => {
    const fetchEmployeeProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await api.get(
          `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/permanent-employee/core-employee-details/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const employees = Array.isArray(res.data) ? res.data : res.data.data || [];
        // console.log("Logged in employee_id:", user?.employee_id);
        // console.log("API Response:", res.data);
        // console.log("Employees Array:", employees);
        const matched = employees.find(
          (emp) => String(emp.employee_id) === String(user?.employee_id)
        );
        // console.log("Matched Employee:", matched);
        setEmployeeProfile(matched);
      } catch (err) {
        console.error("Failed to fetch employee profile", err);
      }
    };
    if (user?.employee_id) fetchEmployeeProfile();
  }, [user]);

  /* ── Close dropdown on outside click ── */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ── Dropdown actions ── */
  const handleViewProfile = () => {
    // console.log("USER:", user);
    // console.log("EMPLOYEE PROFILE:", employeeProfile);

    setDropdownOpen(false);

    if (!employeeProfile?.employee_uuid) {
      // console.log("No employee UUID found");
      return;
    }

    navigate(`/employee-onboarding/employeeProfile/${employeeProfile.employee_uuid}`);
  };

  const handleOpenPasswordModal = () => {
    setDropdownOpen(false);
    setPwForm(EMPTY_PW_FORM);
    setPwErrors({});
    setShowPw(EMPTY_SHOW_PW);
    setShowPasswordModal(true);
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    navigate("/");
  };

  /* ── Change password ── */
  const validatePwForm = () => {
    const errors = {};
    // if (!pwForm.currentPassword) errors.currentPassword = "Current password is required";
    if (!pwForm.newPassword) errors.newPassword = "New password is required";
    else if (pwForm.newPassword.length < 8) errors.newPassword = "Password must be at least 8 characters";
    if (!pwForm.confirmPassword) errors.confirmPassword = "Please confirm your new password";
    else if (pwForm.newPassword !== pwForm.confirmPassword) errors.confirmPassword = "Passwords do not match";
    return errors;
  };

  const handlePasswordSubmit = async () => {
    const errors = validatePwForm();
    if (Object.keys(errors).length > 0) {
      setPwErrors(errors);
      return;
    }
    setSaving(true);
    try {
      await api.put(
        `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/auth/change-password`,
        { new_password: pwForm.newPassword, confirm_password: pwForm.confirmPassword },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      showStatusToast("Password updated successfully", "success");
      setShowPasswordModal(false);
      setPwForm(EMPTY_PW_FORM);
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Failed to update password. Please check your current password.";
      showStatusToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (hasError) =>
    `w-full rounded-lg border px-3 py-2.5 pr-10 text-sm text-[#081534] outline-none transition-all ${hasError
      ? "border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-100"
      : "border-[#e4e8f2] bg-[#fafbfd] focus:border-[#263383] focus:ring-2 focus:ring-[#263383]/10"
    }`;

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-5 py-2 sticky top-0 z-[50]">
        <div className="flex items-center justify-between">

          {/* ── Left: sidebar toggle + welcome ── */}
          <div className="flex items-center gap-4">
            <button
              onClick={onToggleSidebar}
              className="flex items-center justify-center p-2 rounded-md hover:bg-gray-100 transition-colors"
              title="Toggle Sidebar"
            >
              <AnimatePresence mode="wait" initial={true}>
                {isSidebarOpen ? (
                  <motion.div key="x" variants={iconVariants} initial="hidden" animate="visible" exit="exit">
                    <X className="h-5 w-5 text-gray-700" />
                  </motion.div>
                ) : (
                  <motion.div key="menu" variants={iconVariants} initial="hidden" animate="visible" exit="exit">
                    <Menu className="h-5 w-5 text-gray-700" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            <div>
              <h2 className="text-1.5xl font-bold text-gray-900">Welcome back, {firstName}</h2>
              <p className="text-sm text-gray-600">
                Here's what's happening with your organization today.
              </p>
            </div>
          </div>

          {/* ── Right: notifications + profile ── */}
          <div className="flex items-center space-x-4">
            {/* <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-[#ff3d72] rounded-full" />
            </button> */}

            {/* Profile dropdown */}
            <div className="relative pl-4 border-l border-gray-200" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 cursor-pointer rounded-lg px-2 py-1.5 hover:bg-gray-100 transition-colors"
              >
                <div className="h-8 w-8 bg-[#263383] rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="hidden md:block text-sm font-medium text-gray-900 max-w-[140px] truncate">
                  {name}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-gray-400 hidden md:block transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""
                    }`}
                />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-gray-200 overflow-hidden z-50"
                    style={{ boxShadow: "0 8px 24px rgba(8,21,52,0.12)" }}
                  >
                    {/* <div className="px-4 py-3 border-b border-gray-100 bg-[#f4f6fc]">
                      <p className="text-xs font-bold text-[#081534] truncate">{name}</p>
                    </div> */}

                    <div className="py-1">
                      <button
                        onClick={handleViewProfile}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-[#f4f6fc] hover:text-[#263383] transition-colors"
                      >
                        <Eye className="h-4 w-4 flex-shrink-0" />
                        View Profile
                      </button>

                      <button
                        onClick={handleOpenPasswordModal}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-[#f4f6fc] hover:text-[#263383] transition-colors"
                      >
                        <KeyRound className="h-4 w-4 flex-shrink-0" />
                        Change Password
                      </button>

                      <div className="my-1 border-t border-gray-100" />

                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4 flex-shrink-0" />
                        Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>
      </header>

      {/* ══ Change Password Modal ══ */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => !saving && setShowPasswordModal(false)}
        title="Change Password"
        subtitle="Enter your current password and choose a new one"
        size="sm"
        animation="zoom"
        titleIcon={<KeyRound size={18} />}
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowPasswordModal(false)}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 bg-white border border-[#e4e8f2] hover:bg-[#f4f6fc] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePasswordSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
              style={{ background: "#263383" }}
            >
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Updating…
                </>
              ) : (
                "Update Password"
              )}
            </button>
          </div>
        }
      >
        <div className="space-y-4">

          <div className="hidden md:block text-left max-w-[180px]">
            <p className="text-sm font-medium text-gray-900 leading-tight truncate">{name}</p>
            {/* <p className="text-xs text-gray-500 line-clamp-1">{role}</p> */}
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-semibold text-[#081534] mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPw.new ? "text" : "password"}
                value={pwForm.newPassword}
                onChange={(e) => {
                  setPwForm((prev) => ({ ...prev, newPassword: e.target.value }));
                  if (pwErrors.newPassword) setPwErrors((prev) => ({ ...prev, newPassword: "" }));
                }}
                placeholder="Enter new password"
                autoComplete="new-password"
                className={inputClass(!!pwErrors.newPassword)}
              />
              <button
                type="button"
                onClick={() => setShowPw((prev) => ({ ...prev, new: !prev.new }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#263383] transition-colors"
                tabIndex={-1}
              >
                {showPw.new ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {pwErrors.newPassword && (
              <p className="mt-1 text-xs text-red-500">{pwErrors.newPassword}</p>
            )}
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-semibold text-[#081534] mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showPw.confirm ? "text" : "password"}
                value={pwForm.confirmPassword}
                onChange={(e) => {
                  setPwForm((prev) => ({ ...prev, confirmPassword: e.target.value }));
                  if (pwErrors.confirmPassword) setPwErrors((prev) => ({ ...prev, confirmPassword: "" }));
                }}
                placeholder="Re-enter new password"
                autoComplete="new-password"
                className={inputClass(!!pwErrors.confirmPassword)}
              />
              <button
                type="button"
                onClick={() => setShowPw((prev) => ({ ...prev, confirm: !prev.confirm }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#263383] transition-colors"
                tabIndex={-1}
              >
                {showPw.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {pwErrors.confirmPassword && (
              <p className="mt-1 text-xs text-red-500">{pwErrors.confirmPassword}</p>
            )}
          </div>

        </div>
      </Modal>
    </>
  );
};

export default Header;
