import { useLocation, useNavigate } from "react-router-dom";

const primaryNav = [
  {
    label: "Dashboard",
    path: "/account-receivable/dashboard",
  },
  {
    label: "Project Billing Setup",
    path: "/account-receivable/project-billing-setup/overview",
    matchPath: "/account-receivable/project-billing-setup",
  },
  {
    label: "Billing Data Acquisition",
    path: "/account-receivable/billing-data-acquisition",
  },
];

const projectBillingNav = [
  {
    label: "Overview",
    path: "/account-receivable/project-billing-setup/overview",
  },
  {
    label: "Billing Configurations",
    path: "/account-receivable/project-billing-setup/configurations",
  },
  {
    label: "Configuration History",
    path: "/account-receivable/project-billing-setup/history",
  },
];

const isActivePath = (pathname, path) => pathname === path || pathname.startsWith(`${path}/`);

export default function AccountReceivableNavBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isProjectBillingSetup = pathname.startsWith("/account-receivable/project-billing-setup");

  return (
    <div>
      <div className="relative z-30 border-b bg-white">
        <div className="flex flex-wrap gap-6 px-6 py-1">
          {primaryNav.map((item) => {
            const activePath = item.matchPath || item.path;
            const isActive = isActivePath(pathname, activePath);

            return (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(item.path)}
                className="relative cursor-pointer py-1 text-sm font-semibold"
              >
                <span className={isActive ? "text-gray-900" : "text-gray-500 hover:text-gray-900"}>
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute left-1/2 -bottom-[6px] z-40 h-0 w-0 -translate-x-1/2 border-b-8 border-l-8 border-r-8 border-b-blue-700 border-l-transparent border-r-transparent" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {isProjectBillingSetup && (
        <div className="relative z-10 mt-4 border-b bg-gray-200">
          <div className="flex flex-wrap gap-6 px-6">
            {projectBillingNav.map((item) => {
              const isActive = isActivePath(pathname, item.path);

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className="relative cursor-pointer py-1 text-sm font-medium"
                >
                  <span className={isActive ? "text-gray-900" : "text-gray-500 hover:text-gray-900"}>
                    {item.label}
                  </span>
                  {isActive && (
                    <span className="absolute left-1/2 -bottom-1 h-0 w-0 -translate-x-1/2 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-green-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
