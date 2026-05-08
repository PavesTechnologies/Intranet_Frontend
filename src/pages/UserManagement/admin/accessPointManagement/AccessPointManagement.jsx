import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, ShieldCheck } from "lucide-react";

import AccessPointList from "./AccessPointList";
import Navbar from "../../../../components/Navbar/Navbar";
import { Fonts } from "../../../../components/Fonts/Fonts";

export default function AccessPointManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const navItems = [
    {
      name: "Access Points",
      onClick: () => navigate("/user-management/access-points"),
      isActive: location.pathname === "/user-management/access-points",
    },
    {
      name: "Add New",
      onClick: () => navigate("/user-management/access-points/create"),
      isActive: location.pathname === "/user-management/access-points/create",
    },
    {
      name: "Permission Mapping",
      onClick: () =>
        navigate("/user-management/access-points/admin/access-point-mapping"),
      isActive:
        location.pathname ===
        "/user-management/access-points/admin/access-point-mapping",
    },
    {
      name: "Access Point Create Bulk",
      onClick: () => navigate("/user-management/access-points/create-bulk"),
      isActive:
        location.pathname === "/user-management/access-points/create-bulk",
    },
    {
      name: "Access Permission Mapping Bulk",
      onClick: () =>
        navigate("/user-management/access-point-map-permission-bulk"),
      isActive:
        location.pathname ===
        "/user-management/access-point-map-permission-bulk",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar logo="Access Points" navItems={navItems} />

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="sticky top-0 z-10 mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h2 className={Fonts.heading4}>Access Point Management</h2>
                <p className={Fonts.paragraphMuted}>
                  Manage access points here.
                </p>
              </div>
            </div>

            <div className="relative w-full lg:w-80">
              <input
                type="text"
                placeholder="Search endpoint or module..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm shadow-sm outline-none transition focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20"
              />
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        </div>

        <AccessPointList searchTerm={searchTerm} />
      </div>
    </div>
  );
}