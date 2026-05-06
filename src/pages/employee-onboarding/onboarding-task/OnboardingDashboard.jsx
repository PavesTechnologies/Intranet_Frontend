import React from "react";
import { Outlet } from "react-router-dom";

export default function OnboardingDashboard() {
  return (
    <div style={{ padding: 0 }}>
      {/* Navbar & Sidebar already global */}
      <Outlet />
    </div>
  );
}
