import { useNavigate } from "react-router-dom";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";

export default function DepartmentsMappingDashboard() {
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6 text-gray-900">Departments Configuration</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PageCard className="cursor-pointer hover:shadow-lg transition">
          <div onClick={() => navigate("departmentsList")} className="w-full h-full">
            <PageCardContent>
              <h2 className="font-semibold text-blue-900">Departments</h2>
            </PageCardContent>
          </div>
        </PageCard>
        <PageCard className="cursor-pointer hover:shadow-lg transition">
          <div onClick={() => navigate("designationsList")} className="w-full h-full">
            <PageCardContent>
              <h2 className="font-semibold text-blue-900">Designations</h2>
            </PageCardContent>
          </div>
        </PageCard>
      </div>
    </div>
  );
}
