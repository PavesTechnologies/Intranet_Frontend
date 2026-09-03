import { Outlet } from "react-router-dom";

export default function AccountReceivableLayout() {
  return (
    <div className="w-full">
      <div className="px-4 py-6">
        <Outlet />
      </div>
    </div>
  );
}
