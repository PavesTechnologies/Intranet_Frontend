import { Outlet } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

import { useAuth } from "../../../../contexts/AuthContext";
import { Fonts } from "../../../../components/Fonts/Fonts";

export default function UserManagement() {
  const { user } = useAuth();

  const isAdmin =
    user?.roles?.includes("Admin") || user?.roles?.includes("Super Admin");

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700">
              <ShieldAlert size={22} />
            </div>

            <div>
              <h2 className={Fonts.heading4}>User Management</h2>
              <p className="mt-1 text-sm text-red-700">
                You do not have permission to view this page.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Outlet />
    </div>
  );
}