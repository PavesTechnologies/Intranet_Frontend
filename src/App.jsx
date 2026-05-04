import React, { useEffect } from "react";
import "react-phone-input-2/lib/style.css";
import { Toaster } from "react-hot-toast";

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";

import LoginPage from "./pages/LoginPage";
import Layout from "./components/Layout/Layout";
import Dashboard from "./pages/Dashboard";
import Calendar from "./pages/Calendar";

// Resource Management
import AdminPannel from "./pages/resource_management/pages/admin/AdminPannel.jsx";
import ClientPage from "./pages/resource_management/models/ClientPage.jsx";
import AssetList from "./pages/resource_management/assests/AssetList.jsx";
import AssetDetail from "./pages/resource_management/assests/AssetDetail.jsx";
import RMSProjectList from "./pages/resource_management/pages/project/RMSProjectList.jsx";
import RMSProjectDetails from "./pages/resource_management/pages/project/RMSProjectDetails.jsx";
import WorkforceAvailability from "./pages/resource_management/pages/workforce/WorkforceAvailability.jsx";
import ResourceIntelligenceCenter from "./pages/resource_management/components/resource-intelligence/ResourceIntelligenceCenter.jsx";
import DemandWorkspacePage from "./pages/resource_management/demand/pages/DemandWorkspacePage.jsx";
import DemandDetailPage from "./pages/resource_management/demand/pages/DemandDetailPage.jsx";
import PMRoleOffPage from "./pages/resource_management/pages/roleoff/pm.js";
import RMRoleOffPage from "./pages/resource_management/pages/roleoff/rm.js";
import DMRoleOffPage from "./pages/resource_management/pages/roleoff/dm.js";
import BenchPage from "./pages/resource_management/bench/pages/BenchPage.jsx";
import RoleOffDashboard from "./pages/resource_management/pages/roleoff/RoleOffDashboard.jsx";
import BenchPoolDashboard from "./pages/resource_management/bench/pages/BenchPoolDashboard.jsx";
import UtilizationPerformanceDashboard from "./pages/resource_management/bench/pages/UtilizationPerformanceDashboard.jsx";
import OperationalProjectDetailPage from "./pages/resource_management/bench/pages/OperationalProjectDetailPage.jsx";
import UtilizationReportingDashboard from "./pages/resource_management/bench/pages/UtilizationReportingDashboard.jsx";

// Timesheets

import InitialPasswordSetup from "./pages/UserManagement/auth/InitialPasswordSetup";
import TimesheetHistoryPage from "./pages/Timesheet/TimesheetHistoryPage";
import ManagerApprovalPage from "./pages/Timesheet/ManagerApproval/ManagerApprovalPage";
import DashboardPage from "./pages/Timesheet/DashboardPage";
import ManagerDashboard from "./pages/Timesheet/ManagerDashboard";
import IntranetForm from "./components/forms/IntranetForm";
import ReportDashboard from "./pages/Timesheet/ReportDashboard";
import MonthlyTSReport from "./pages/Timesheet/MonthlyTSReport";
import ManagerReportSection from "./pages/Timesheet/ManagerReportSection";
import ManagerMonthlyReport from "./pages/Timesheet/ManagerMonthlyReport";
import TSAdminPanel from "./pages/Timesheet/Admin/TSAdminPannel.jsx";
import TimesheetHistory from "./pages/Timesheet/TimesheetHistory.jsx";

// ✅ Project Management
import ProjectDashboard from "./pages/Projects/manager/ProjectDashboard";
import Summary from "./pages/Projects/Summary/Summary.jsx";
// import Backlog from "./pages/Projects/manager/Backlog/Backlog";
import Board from "./pages/Projects/manager/Board";
import CreateProjectModal from "./pages/Projects/manager/CreateProjectModal";
import ProjectTabs from "./pages/Projects/manager/ProjectTabs";
import ReadOnlyDashboard from "./pages/Projects/User/ReadOnlyDashboard";

import UserBacklog from "./pages/Projects/User/UserBacklog/userbacklog";
import UserProjectTabs from "./pages/Projects/User/UserProjectTabs";
import ProjectList from "./pages/Projects/manager/ProjectList";
import UserProjectList from "./pages/Projects/User/UserProjectList";
import EmployeePerformance from "./pages/Projects/manager/EmployeePerformance";
import Userprofile from "./pages/Projects/User/Userprofile";
import IssueTracker from "./pages/Projects/manager/Backlog/IssueTracker";
import ViewSheet from "./pages/Projects/manager/Backlog/ViewSheet";
import ProjectStatusReportWrapper from "./pages/Projects/manager/ProjectStatusReportWrapper";
import UserIssueTracker from "./pages/Projects/User/UserBacklog/IssueTracker";
import CycleRunsPage from "./pages/Projects/Testmanagement/TestExecution/CycleRunsPage";
import AddCasesFromProjectModal from "./pages/Projects/Testmanagement/TestDesign/modals/AddCasesFromProjectModal.jsx";
import MyWorkPage from "./pages/Projects/MyWork/MyWorkPage";
// ✅ Employee Onboarding
import EmpDashboard from "./pages/employee-onboarding/EmpDashboard.jsx";
import EmployeeProfileView from "./pages/employee-onboarding/employeeProfile/EmployeeProfileView.jsx";
import CreateOffer from "./pages/employee-onboarding/components/CreateOffer";
import BulkUpload from "./pages/employee-onboarding/components/BulkUpload.jsx";
import ViewEmpDetails from "./pages/employee-onboarding/components/ViewEmpDetails.jsx";
import HrConfiguration from "./pages/employee-onboarding/hr-configuration/HrConfiguration.jsx";
import CountryManagement from "./pages/employee-onboarding/hr-configuration/country/CountryManagement.jsx";
import IdentityTypeManagement from "./pages/employee-onboarding/hr-configuration/identity/IdentityTypeManagement.jsx";
import CountryIdentityMapping from "./pages/employee-onboarding/hr-configuration/mapping/CountryIdentityMapping.jsx";
import EducationDashboard from "./pages/employee-onboarding/hr-configuration/education/EducationDashboard.jsx";
import EducationLevelManagement from "./pages/employee-onboarding/hr-configuration/education/levels/EducationLevelManagement.jsx";
import EducationDocumentManagement from "./pages/employee-onboarding/hr-configuration/education/documents/EducationDocumentManagement.jsx";
import CountryEducationMapping from "./pages/employee-onboarding/hr-configuration/education/mapping/CountryEducationMapping.jsx";
// import AdminApprovalActions from "./pages/employee-onboarding/admin/AdminApprovalActions.jsx";
import AdminApprovalDashboard from "./pages/employee-onboarding/admin/AdminApprovalDashboard.jsx";
import AdminOfferView from "./pages/employee-onboarding/admin/AdminOfferView.jsx";
import HrOnboardingDashboard from "./pages/employee-onboarding/hr/HrOnboardingDashboard.jsx";
import HrProfileView from "./pages/employee-onboarding/hr/HrProfileView.jsx";
import BackgroundCheckPage from "./pages/employee-onboarding/hr/BackgroundCheckPage.jsx";
import OnboardingTask from "./pages/employee-onboarding/onboarding-task/OnboardingTask.jsx";
import EmployeeDirectory from "./pages/employee-onboarding/employee-directory/EmployeeDirectory.jsx";
import EmployeeVerification from "./pages/employee-onboarding/employee-verification/EmployeeVerification.jsx";
import EmployeeDocumentsTemplate from "./pages/employee-onboarding/employee-documents-template/EmployeeDocumentsTemplate.jsx";
import OrganizationTree from "./pages/employee-onboarding/organization-tree/OrganizationTree.jsx";
import SummaryPage from "./pages/employee-onboarding/summary-page/SummaryPage.jsx";
import EmployeeDocumentsPage from "./pages/employee-onboarding/employeedocuments/EmployeeDocuments.jsx";
import HeadcountDemographicsPage from "./pages/employee-onboarding/analytics/HeadcountDemographics.jsx";
import EmployeeListPage from "./pages/employee-onboarding/employeelist/EmployeeList.jsx";
import EmployeeCredentials from "./pages/employee-onboarding/employee-credentials/EmployeeCredentials.jsx";
import CoreEmployeeDetails from "./pages/employee-onboarding/core-employee/CoreEmployeeDetailsDashboard.jsx";
import EmployeeOnboardingLayout from "./pages/employee-onboarding/EmployeeOnboardingLayout.jsx";
import OnboardingSummary from "./pages/employee-onboarding/summary-page/OnboardingSummary.jsx";
import DepartmentsMappingDashboard from "./pages/employee-onboarding/hr-configuration/departments/DepartmentsMappingDashboard.jsx";
import DepartmentsList from "./pages/employee-onboarding/hr-configuration/departments/departmentsList/DepartmentsList.jsx";
import DesignationsList from "./pages/employee-onboarding/hr-configuration/departments/designationsList/DesignationsList.jsx";
import WeeklyJoiningDashboard from "./pages/employee-onboarding/weekly-joining-report-dashboard/WeeklyJoiningDashboard.jsx";
import DocumentTemplates from "./pages/employee-onboarding/document-templates/DocumentTemplates.jsx";

import EmployeeDocuments from "./pages/employee-onboarding/employeedocuments/EmployeeDocuments.jsx";

import OfferPreview from "./pages/employee-onboarding/offer-preview/OfferPreview.jsx";
import FinalOfferPreview from "./pages/employee-onboarding/final-offer-preview/FinalOfferPreview.jsx";
import OfferGeneratedPreview from "./pages/employee-onboarding/offer-generated-preview/OfferGeneratedPreview.jsx";
// ✅ User Management
import CreateUser from "./pages/UserManagement/admin/userManagement/CreateUser";
import EditUser from "./pages/UserManagement/admin/userManagement/EditUser";
import UpdateUserRoles from "./pages/UserManagement/admin/userManagement/UpdateUserRoles";
import EditUserRoleForm from "./pages/UserManagement/admin/userManagement/EditUserRoleForm";
import UsersTable from "./pages/UserManagement/admin/userManagement/UsersTable";

// ✅ Roles & Permissions
import RoleManagement from "./pages/UserManagement/admin/roleManagement/RoleManagement";
import PermissionManagement from "./pages/UserManagement/admin/permissionManagement/PermissionManagement";
import PermissionGroupManagement from "./pages/UserManagement/admin/permissionGroupManagement/PermissionGroupManagement";
import GroupDetails from "./pages/UserManagement/admin/permissionGroupManagement/GroupDetails";

import AccessPointForm from "./pages/UserManagement/admin/accessPointManagement/AccessPointForm";
import AccessPointDetails from "./pages/UserManagement/admin/accessPointManagement/AccessPointDetails";
import AccessPointEdit from "./pages/UserManagement/admin/accessPointManagement/AccessPointEdit";
import AccessPointMapping from "./pages/UserManagement/admin/accessPointManagement/AccessPointMapping";
import AccessPointManagement from "./pages/UserManagement/admin/accessPointManagement/AccessPointManagement";
import BulkAccessPointCreate from "./pages/UserManagement/admin/accessPointManagement/BulkAccessPointCreate";
import BulkPermissionMapping from "./pages/UserManagement/admin/accessPointManagement/BulkPermissionMapping";
import Profile from "./pages/UserManagement/user/Profile";
import EditProfile from "./pages/UserManagement/user/EditProfile";

import Register from "./pages/UserManagement/auth/Register";
import ForgotPassword from "./pages/UserManagement/auth/ForgotPassword";

// ✅ Leave Management
import EmployeePanel from "./pages/leave_management/EmployeePanel";
import AdminPanel from "./pages/leave_management/AdminPanel";
import HRManageTools from "./pages/leave_management/HRManageTools";
import EmployeeLeaveBalances from "./pages/leave_management/models/EmployeeLeaveBalances";
import Unauthorized from "./pages/leave_management/Unauthorized";
import EditHolidaysPage from "./pages/leave_management/models/EditHolidaysPage";
// import ManagerDashboard from "./pages/Timesheet/ManagerDashboard";
import LeavePolicy from "./pages/leave_management/models/LeavePolicy";
import LeaveDetailsPage from "./pages/leave_management/charts/LeaveDetailsPage";
import ManageBlockLeave from "./pages/leave_management/models/ManageBlockLeave";
// import ProtectedRoute from "./pages/leave_management/ProtectedRoutes";
import ApprovalRulesPage from "./pages/leave_management/models/ApprovalRulesPage.jsx";
import RiskRegisterPage from "./pages/Projects/manager/riskManagement/RiskRegisterPage.jsx";
import LeaveUploadWizard from "./pages/leave_management/models/LeaveUploadWizard.jsx";
import ApplyLeaveOnBehalf from "./pages/leave_management/models/ApplyLeaveOnBehalf.jsx";

import EmployeeExitDashboard from "./pages/employee-exit/EmployeeExitDashboard.jsx";
import ExitDetailsPage from "./pages/employee-exit/ExitDetailsPage.jsx";

import { showStatusToast } from "./components/toastfy/toast";
import { IdentificationIcon } from "@heroicons/react/24/outline";
import OnboardingDashboard from "./pages/employee-onboarding/onboarding-task/OnboardingDashboard.jsx";
import OnboardingSummaryPage from "./pages/employee-onboarding/summary-page/SummaryPage.jsx";



const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const isfirsttlogin = localStorage.getItem("isfirsttlogin");

  // console.log("isfirsttlogin:", isfirsttlogin);

  // ✅ Redirect if first login
  if (isfirsttlogin === "true") {
    logout();
    localStorage.setItem("isfirsttlogin", true);
    showStatusToast("Please change your password first.");
    return <Navigate to="/" replace />;
  }

  // ✅ If not authenticated, go to login
  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location.pathname }} replace />;
  }

  // ✅ Role-based restriction check
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = user?.roles?.some((role) => allowedRoles.includes(role));
    console.log("ProtectedRoute check:", {
      isAuthenticated,
      user,
      allowedRoles,
      match: hasRole,
    });

    if (!hasRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // ✅ Default: render protected content
  return <>{children}</>;
};

const SaveLastPath = () => {
  const location = useLocation();
  useEffect(() => {
    if (location.pathname !== "/" && location.pathname !== "/login") {
      localStorage.setItem("lastPath", location.pathname + location.search);
    }
  }, [location]);
  return null;
};

// ✅ Project Manager Demo Layout
const ProjectManager = () => {
  const [showCreateProjectModal, setShowCreateProjectModal] =
    React.useState(false);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* <div className="flex-1 flex flex-col">
        <ProjectTabs selectedTab="summary" onTabSelect={() => {}} />
        <main className="flex-1 overflow-auto bg-white">
          <Summary project={null} tasks={[]} />
        </main>
      </div>

      <CreateProjectModal
        isOpen={showCreateProjectModal}
        onClose={() => setShowCreateProjectModal(false)}
        onProjectCreated={() => {}}
      /> */}
    </div>
  );
};

const RoleOffEntry = () => {
  const { user } = useAuth();

  if (user?.roles?.includes("DELIVERY-MANAGER")) {
    return <Navigate to="/resource-management/roleoff/dm" replace />;
  }

  if (user?.roles?.includes("RESOURCE-MANAGER")) {
    return <Navigate to="/resource-management/roleoff/rm" replace />;
  }

  return <Navigate to="/resource-management/roleoff/pm" replace />;
};

// ✅ Application Routes
const AppRoutes = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only perform auto-restoration if we are on the landing page or login redirect
    const currentPath = location.pathname;

    if (isAuthenticated && (currentPath === "/" || currentPath === "/login")) {
      const lastPath = localStorage.getItem("lastPath");

      if (lastPath === "/change-password" && currentPath !== "/change-password") {
        navigate("/change-password", { replace: true });
      }
      else if (lastPath && lastPath !== "/" && lastPath !== "/login" && lastPath !== currentPath) {
        navigate(lastPath, { replace: true });
      }
      else if (currentPath === "/") {
        if (user?.roles?.includes("DELIVERY-MANAGER")) {
          navigate("/resource-management/demand", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      }
    }
  }, [isAuthenticated, user, navigate]); // Added user dependency

  return (
    <>
      <Routes>
        {/* Public Route */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ForgotPassword />} />
        {/* Unauthorized should be here */}
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/change-password" element={<InitialPasswordSetup />} />
        {/* Protected Routes */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          {/* Main */}
          <Route path="/dashboard" element={<Dashboard />} />
          {/* <Route path="/projects/manager" element={<ProjectManager />} /> */}
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/timesheets" element={<TimesheetHistoryPage />} />
          {/* <Route path="/managerapproval" element={<ManagerApprovalPage />} /> */}
          <Route path="/managerapproval" element={<TSAdminPanel />} />
          <Route path="/timesheet/dashboard" element={<DashboardPage />} />
          <Route
            path="/timesheets/managerdashboard"
            element={<ManagerDashboard />}
          />
          <Route
            path="/timesheets/managerreport"
            element={<ManagerReportSection />}
          />
          <Route
            path="/timesheets/reportdashboard"
            element={<ReportDashboard />}
          />
          <Route
            path="/timesheets/managermonthlyreport"
            element={<ManagerMonthlyReport />}
          />
          <Route
            path="/timesheets/monthlytsreport"
            element={<MonthlyTSReport />}
          />
          <Route path="/timesheets/history" element={<TimesheetHistory />} />
          <Route path="/intranet-form" element={<IntranetForm />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/edit" element={<EditProfile />} />
          {/* Projects */}
          {/* <Route path="/projects/dashboard" element={<AdminDashboard />} /> */}
          <Route path="/projects/developer" element={<ReadOnlyDashboard />} />
          <Route
            path="/projects"
            element={
              // <ProtectedRoute allowedRoles={["Manager"]}>
              <ProjectDashboard />
              // </ProtectedRoute>
            }
          />

          <Route path="/projects" element={<ProjectManager />} />
          <Route path="/projects/:projectId" element={<ProjectTabs />} />
          <Route path="/projects/list" element={<ProjectList />} />
          {/* <Route
  path="/projects/:projectId/issuetracker"
  element={
    <ProtectedRoute allowedRoles={["General", "Manager"]}>
      <IssueTracker />
    </ProtectedRoute>
  }
/> */}
          <Route
            path="/projects/:projectId/issuetracker"
            element={<IssueTracker />}
          />
          <Route
            path="/projects/:projectId/cycles/runs/:runId/test-runs"
            element={<AddCasesFromProjectModal />}
          />
          <Route
            path="/projects/performance"
            element={<EmployeePerformance />}
          />
          <Route
            path="/projects/:projectId/cycles/:cycleId/runs"
            element={<CycleRunsPage />}
          />
          <Route path="/projects/user/myprofile" element={<Userprofile />} />
          <Route path="/projects/userlist" element={<UserProjectList />} />
          {/* <Route path="/projects/user/:userId" element={<UserProjectDashboard />} /> */}
          <Route
            path="/projects/userbacklog/:projectId"
            element={<UserBacklog />}
          />
          <Route path="/projects/admin" element={<ProjectManager />} />
          <Route
            path="/projects/user/:projectId"
            element={<UserProjectTabs />}
          />
          <Route
            path="/projects/:projectId/user/userissuetracker"
            element={<UserIssueTracker />}
          />
          <Route
            path="/projects/:projectId/issues/:type/:id/view"
            element={<ViewSheet />}
          />
          <Route
            path="/projects/:projectId/status-report"
            element={<ProjectStatusReportWrapper />}
          />
          <Route
            path="/projects/:projectId/risk-management"
            element={<RiskRegisterPage />}
          />
          <Route
            path="/projects/:projectId/risk-management"
            element={<RiskRegisterPage />}
          />
          <Route path="/my-work" element={<MyWorkPage />} />
          {/* Employee Onboarding */}

          {/* <Route path="/employee-onboarding" element={<EmpDashboard />}/>
          <Route path="/employee-onboarding/onboarding-task" element={<OnboardingTask />} />
          <Route path="/employee-onboarding/employee-directory" element={<EmployeeDirectory />} />
          <Route path="/employee-onboarding/employee-verification" element={<EmployeeVerification />} />
          <Route path="/employee-onboarding/employee-documents-template" element={<EmployeeDocumentsTemplate />} />
          <Route path = "/employee-onboarding/organization-tree" element={<OrganizationTree />} />
          <Route path = "/employee-onboarding/organization-tree" element={<OrganizationTree />} />
          <Route path="/employee-onboarding/summary-page" element={<SummaryPage />} />
          <Route path="analytics" element={<HeadcountDemographicsPage />} />
          <Route path="/employee-onboarding/offer/:user_uuid" element={<ViewEmpDetails />}/>
          <Route path="/employee-onboarding/employeeProfile" element={<EmployeeProfileView />}/>
          <Route path="/employee-onboarding" element={<EmpDashboard />} />
          <Route path="/employee-onboarding/create" element={<CreateOffer />} />
          <Route path="/employee-onboarding/bulk-upload" element={<BulkUpload />}/>
          <Route path="/employee-onboarding/hr-configuration/country" element={<CountryManagement />}/>
          <Route path="/employee-onboarding/hr-configuration" element={<HrConfiguration />}/>
          <Route path="/employee-onboarding/hr-configuration/identity" element={<IdentityTypeManagement />}/>
          <Route path="/employee-onboarding/hr-configuration/mapping" element={<CountryIdentityMapping />}/>
          <Route path="/employee-onboarding/hr-configuration/education" element={<EducationDashboard />}/>
          <Route path="/employee-onboarding/hr-configuration/education/levels" element={<EducationLevelManagement />}/>
          <Route path="/employee-onboarding/hr-configuration/education/documents" element={<EducationDocumentManagement />}/>
          <Route path="/employee-onboarding/hr-configuration/education/mapping" element={<CountryEducationMapping />}/>
          <Route path="/employee-onboarding/admin/approval-dashboard" element={<AdminApprovalDashboard />}/>
          <Route path="/employee-onboarding/admin/offer/:user_uuid" element={<AdminOfferView />}/>
          <Route path="/employee-onboarding/hr" element={<HrOnboardingDashboard />}/>
          <Route path="/employee-onboarding/hr/profile/:user_uuid" element={<HrProfileView />}/>
          <Route path="/employee-onboarding/analytics" element={<HeadcountDemographicsPage />}/>
          <Route path="/employee-onboarding/employeelist" element={<EmployeeListPage/>}/>
          <Route path="/employee-onboarding/employeedocuments" element={<EmployeeDocuments/>}/>
          <Route path="/employee-onboarding/employee-credentials" element={<EmployeeCredentials/>}/>
          <Route path="/employee-onboarding/core-employee" element={<CoreEmployeeDetails/>}/> */}

          {/* Employee Onboarding */}
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/employee-onboarding/*" element={<EmployeeOnboardingLayout />}>

            <Route index element={
              <ProtectedRoute roles={["HR", "MANAGER"]}>
                <EmpDashboard />
              </ProtectedRoute>
            }
            />

            <Route path="create" element={<ProtectedRoute roles={["HR"]}><CreateOffer /></ProtectedRoute>} />
            <Route path="bulk-upload" element={<ProtectedRoute roles={["HR"]}><BulkUpload /></ProtectedRoute>} />
            <Route path="onboarding-task" element={<ProtectedRoute roles={["HR", "MANAGER", "ADMIN"]}><OnboardingTask /></ProtectedRoute>} />

            <Route path="hr-configuration" element={<ProtectedRoute roles={["HR", "ADMIN"]}><HrConfiguration /></ProtectedRoute>} />
            <Route path="hr-configuration/country" element={<ProtectedRoute roles={["HR", "ADMIN"]}><CountryManagement /></ProtectedRoute>} />
            <Route path="hr-configuration/identity" element={<ProtectedRoute roles={["HR", "ADMIN"]}><IdentityTypeManagement /></ProtectedRoute>} />
            <Route path="hr-configuration/mapping" element={<ProtectedRoute roles={["HR", "ADMIN"]}><CountryIdentityMapping /></ProtectedRoute>} />
            <Route path="hr-configuration/education" element={<ProtectedRoute roles={["HR", "ADMIN"]}><EducationDashboard /></ProtectedRoute>} />
            <Route path="hr-configuration/education/levels" element={<ProtectedRoute roles={["HR", "ADMIN"]}><EducationLevelManagement /></ProtectedRoute>} />
            <Route path="hr-configuration/education/documents" element={<ProtectedRoute roles={["HR", "ADMIN"]}><EducationDocumentManagement /></ProtectedRoute>} />
            <Route path="hr-configuration/education/mapping" element={<ProtectedRoute roles={["HR", "ADMIN"]}><CountryEducationMapping /></ProtectedRoute>} />
            <Route path="hr-configuration/departments" element={<ProtectedRoute roles={["HR", "ADMIN"]}><DepartmentsMappingDashboard /></ProtectedRoute>} />
            <Route path="hr-configuration/departments/departmentsList" element={<ProtectedRoute roles={["HR", "ADMIN"]}><DepartmentsList /></ProtectedRoute>} />
            <Route path="hr-configuration/departments/designationsList" element={<ProtectedRoute roles={["HR", "ADMIN"]}><DesignationsList /></ProtectedRoute>} />

            <Route path="hr" element={<ProtectedRoute roles={["HR"]}><HrOnboardingDashboard /></ProtectedRoute>} />
            <Route path="hr/profile/:user_uuid" element={<ProtectedRoute roles={["HR"]}><HrProfileView /></ProtectedRoute>} />
            <Route path="backgroundcheck" element={<ProtectedRoute roles={["HR"]}><BackgroundCheckPage /></ProtectedRoute>} />

            <Route path="admin/approval-dashboard" element={<ProtectedRoute roles={["ADMIN", "HR"]}><AdminApprovalDashboard /></ProtectedRoute>} />
            <Route path="admin/offer/:user_uuid" element={<ProtectedRoute roles={["ADMIN", "HR"]}><AdminOfferView /></ProtectedRoute>} />

            <Route path="employee-directory" element={<ProtectedRoute ><EmployeeDirectory /></ProtectedRoute>} />
            <Route path="employeelist" element={<ProtectedRoute ><EmployeeListPage /></ProtectedRoute>} />
            <Route path="organization-tree" element={<ProtectedRoute ><OrganizationTree /></ProtectedRoute>} />

            <Route path="employee-verification" element={<ProtectedRoute roles={["HR", "MANAGER"]}><EmployeeVerification /></ProtectedRoute>} />
            <Route path="employee-documents-template" element={<ProtectedRoute roles={["HR"]}><EmployeeDocumentsTemplate /></ProtectedRoute>} />
            <Route path="employeedocuments" element={<ProtectedRoute roles={["HR", "MANAGER"]}><EmployeeDocumentsPage /></ProtectedRoute>} />
            {/* <Route path="employee-credentials" element={<ProtectedRoute roles={["HR","MANAGER"]}><EmployeeCredentials /></ProtectedRoute>} /> */}
            <Route path="employeeProfile" element={<ProtectedRoute ><EmployeeProfileView /></ProtectedRoute>} />
            <Route path="employeeProfile/:employee_uuid" element={<ProtectedRoute ><EmployeeProfileView /></ProtectedRoute>}></Route>
            <Route path="core-employee" element={<ProtectedRoute roles={["HR", "MANAGER"]}><CoreEmployeeDetails /></ProtectedRoute>} />
            <Route path="employee-onboarding/core-employee/create/:userUuid" element={<CoreEmployeeDetails />} />

            <Route path="summary-page" element={<ProtectedRoute roles={["HR", "MANAGER", "ADMIN"]}><SummaryPage /></ProtectedRoute>} />
            <Route path="onboarding-summary" element={<OnboardingSummary />} />
            <Route path="analytics" element={<ProtectedRoute roles={["HR", "MANAGER"]}><HeadcountDemographicsPage /></ProtectedRoute>} />

            <Route path="weekly-joining-report-dashboard" element={<ProtectedRoute roles={["HR", "MANAGER"]}><WeeklyJoiningDashboard /></ProtectedRoute>} />
            <Route path="document-templates" element={<ProtectedRoute roles={["HR"]}><DocumentTemplates /></ProtectedRoute>} />
            <Route path="offer/:user_uuid" element={<ViewEmpDetails />} />
            <Route path="offer-preview/:offerId" element={<OfferPreview />} />
            <Route path="final-offer-preview/:offerId" element={<FinalOfferPreview />} />
            <Route path="offer-generated-preview/:offerId" element={<OfferGeneratedPreview />} />



          </Route>
          {/* User Management */}
          <Route path="/user-management/users" element={<UsersTable />} />
          <Route
            path="/user-management/users/create"
            element={<CreateUser />}
          />
          <Route
            path="/user-management/users/edit/:id"
            element={<EditUser />}
          />
          <Route
            path="/user-management/users/roles"
            element={<UpdateUserRoles />}
          />
          <Route
            path="/user-management/roles/edit-role/:userId"
            element={<EditUserRoleForm />}
          />
          <Route path="/user-management/roles" element={<RoleManagement />} />
          <Route
            path="/user-management/permissions"
            element={<PermissionManagement />}
          />
          <Route
            path="/user-management/groups"
            element={<PermissionGroupManagement />}
          />
          <Route
            path="/user-management/groups/:groupId"
            element={<GroupDetails />}
          />
          <Route
            path="/user-management/access-points"
            element={<AccessPointManagement />}
          />
          <Route
            path="/user-management/access-points/create"
            element={<AccessPointForm />}
          />
          <Route
            path="/user-management/access-points/:access_uuid"
            element={<AccessPointDetails />}
          />
          <Route
            path="/user-management/access-points/edit/:access_uuid"
            element={<AccessPointEdit />}
          />
          <Route
            path="/user-management/access-points/admin/access-point-mapping"
            element={<AccessPointMapping />}
          />
          <Route
            path="/user-management/access-points/create-bulk"
            element={<BulkAccessPointCreate />}
          />
          <Route
            path="/user-management/access-point-map-permission-bulk"
            element={<BulkPermissionMapping />}
          />
          {/* <Route
            path="/user-management/users"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Super Admin"]}>
                <UsersTable />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management/users/create"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Super Admin"]}>
                <CreateUser />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management/users/edit/:id"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Super Admin"]}>
                <EditUser />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management/users/roles"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Super Admin"]}>
                <UpdateUserRoles />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management/roles/edit-role/:userId"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Super Admin"]}>
                <EditUserRoleForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management/roles"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Super Admin"]}>
                <RoleManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management/permissions"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Super Admin"]}>
                <PermissionManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management/groups"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Super Admin"]}>
                <PermissionGroupManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management/groups/:groupId"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Super Admin"]}>
                <GroupDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management/access-points"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Super Admin"]}>
                <AccessPointManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management/access-points/create"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Super Admin"]}>
                <AccessPointForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management/access-points/:access_id"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Super Admin"]}>
                <AccessPointDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management/access-points/edit/:access_id"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Super Admin"]}>
                <AccessPointEdit />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management/access-points/admin/access-point-mapping"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Super Admin"]}>
                <AccessPointMapping />
              </ProtectedRoute>
            }
          /> */}
          {/* Leave Management */}
          <Route
            path="/leave-management"
            element={
              <ProtectedRoute
                allowedRoles={["General", "HR", "Manager", "Hr-Manager"]}
              >
                <EmployeePanel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leave-management/manager"
            element={
              <ProtectedRoute allowedRoles={["Manager"]}>
                <AdminPanel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leave-management/hr"
            element={
              <ProtectedRoute allowedRoles={["HR"]}>
                <HRManageTools />
              </ProtectedRoute>
            }
          />
          <Route
            path={`/employee-leave-balance`}
            element={
              <ProtectedRoute allowedRoles={["HR"]}>
                <EmployeeLeaveBalances />
              </ProtectedRoute>
            }
          />
          <Route
            path={`/edit-holidays`}
            element={
              <ProtectedRoute allowedRoles={["HR"]}>
                <EditHolidaysPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={`/block-leave-dates/:employeeId`}
            element={
              <ProtectedRoute allowedRoles={["Manager"]}>
                <ManageBlockLeave />
              </ProtectedRoute>
            }
          />
          <Route
            path={`/leave-upload`}
            element={
              <ProtectedRoute allowedRoles={["HR"]}>
                <LeaveUploadWizard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leave-policy"
            element={
              <ProtectedRoute>
                <LeavePolicy />
              </ProtectedRoute>
            }
          />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route
            path={`/leave-details/:employeeId/:leaveName`}
            element={
              <ProtectedRoute allowedRoles={["General"]}>
                <LeaveDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/approval-rules"
            element={
              <ProtectedRoute allowedRoles={["HR", "Hr-Manager"]}>
                <ApprovalRulesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/behalf-leave"
            element={
              <ProtectedRoute allowedRoles={["HR", "Hr-Manager", "Manager"]}>
                <ApplyLeaveOnBehalf />
              </ProtectedRoute>
            }
          />

          <Route
            path="/leave-policies"
            element={
              <Navigate
                to="https://celebrated-renewal-07a16fae8e.strapiapp.com"
                replace
              />
            }
          />
          {/* Resource Management */}
          <Route
            path="/resource-management"
            element={
              <ProtectedRoute allowedRoles={["Admin", "RESOURCE-MANAGER"]}>
                <AdminPannel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resource-management/bench"
            element={
              <ProtectedRoute allowedRoles={["Admin", "RESOURCE-MANAGER"]}>
                <BenchPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resource-management/bench/report"
            element={
              <ProtectedRoute allowedRoles={["Admin", "RESOURCE-MANAGER"]}>
                <BenchPoolDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resource-management/bench/utilization-performance"
            element={
              <ProtectedRoute allowedRoles={["Admin", "RESOURCE-MANAGER"]}>
                <UtilizationPerformanceDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resource-management/bench/utilization-performance/projects/:projectId"
            element={
              <ProtectedRoute allowedRoles={["Admin", "RESOURCE-MANAGER"]}>
                <OperationalProjectDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resource-management/bench/utilization-reporting"
            element={
              <ProtectedRoute allowedRoles={["Admin", "RESOURCE-MANAGER"]}>
                <UtilizationReportingDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resource-management/client-details/:clientId"
            element={
              <ProtectedRoute
                allowedRoles={["General", "HR", "Manager", "Hr-Manager"]}
              >
                <ClientPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assets/:clientId/:assetId"
            element={
              <ProtectedRoute
                allowedRoles={["General", "HR", "Manager", "Hr-Manager"]}
              >
                <AssetDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manage-assets/:clientId"
            element={
              <ProtectedRoute
                allowedRoles={["General", "HR", "Manager", "Hr-Manager"]}
              >
                <AssetList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resource-management/projects"
            element={<RMSProjectList />}
          />
          <Route
            path="/resource-management/projects/:projectId"
            element={<RMSProjectDetails />}
          />
          <Route
            path="/resource-management/workforce-availability"
            element={<WorkforceAvailability />}
          />
          <Route
            path="/resource-management/workforce-availability/resource/:resourceId"
            element={<ResourceIntelligenceCenter />}
          />
          <Route
            path="/resource-management/demand"
            element={
              <ProtectedRoute allowedRoles={["RESOURCE-MANAGER", "DELIVERY-MANAGER", "Admin", "Super Admin"]}>
                <DemandWorkspacePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resource-management/demand/:demandId"
            element={
              <ProtectedRoute allowedRoles={["RESOURCE-MANAGER", "DELIVERY-MANAGER", "Admin", "Super Admin"]}>
                <DemandDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resource-management/roleoff"
            element={
              <ProtectedRoute allowedRoles={["PROJECT-MANAGER", "RESOURCE-MANAGER", "DELIVERY-MANAGER", "Admin", "Super Admin"]}>
                <RoleOffEntry />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resource-management/roleoff/pm"
            element={
              <ProtectedRoute allowedRoles={["PROJECT-MANAGER"]}>
                <PMRoleOffPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resource-management/roleoff/rm"
            element={
              <ProtectedRoute allowedRoles={["RESOURCE-MANAGER"]}>
                <RMRoleOffPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resource-management/roleoff/dm"
            element={
              <ProtectedRoute allowedRoles={["DELIVERY-MANAGER"]}>
                <DMRoleOffPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/resource-management/roleoff/report"
            element={
              <ProtectedRoute allowedRoles={["PROJECT-MANAGER", "RESOURCE-MANAGER", "DELIVERY-MANAGER"]}>
                <RoleOffDashboard />
              </ProtectedRoute>
            }
          />
          {/* employee exit routes*/}
          <Route element={<EmployeeOnboardingLayout />}>
            <Route path="/employee-exit" element={<EmployeeExitDashboard />} />
            <Route path="/employee-exit/:exit_uuid" element={<ExitDetailsPage />} />
          </Route>
        </Route>
      </Routes>
      <SaveLastPath />
    </>
  );
};

// 🚀 App Entry Point
function App() {
  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <Router basename={window.__APP_CONFIG__.basePath}>
        <></>
        <AuthProvider>
          <NotificationProvider>
            <div className="min-h-screen bg-gray-50">
              <AppRoutes />
            </div>
          </NotificationProvider>
        </AuthProvider>
      </Router>
    </>
  );
}

export default App;
