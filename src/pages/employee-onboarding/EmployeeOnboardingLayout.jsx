import { Outlet } from "react-router-dom";
import OnboardingNavBar from "./components/NavigationBar";
// 👆 If your file name is OnboardingNavBar.jsx then change import accordingly

export default function EmployeeOnboardingLayout() {
  return (
    <div className="w-full">
      {/* Top Dynamic Onboarding Navbar */}
      <OnboardingNavBar />

      {/* Page Content */}
      <div className="px-4 pb-6">
        <Outlet />
      </div>

    </div>
  );
}