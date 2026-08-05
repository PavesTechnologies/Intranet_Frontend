import { Outlet } from "react-router-dom";
import AccountReceivableNavBar from "./components/NavigationBar";

export default function AccountReceivableLayout() {
  return (
    <div className="w-full">
      <AccountReceivableNavBar />

      <div className="px-4 py-6">
        <Outlet />
      </div>
    </div>
  );
}
