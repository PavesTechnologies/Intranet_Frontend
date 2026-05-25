import { useNavigate } from "react-router-dom";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";

export default function EducationDashboard() {
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6 text-gray-900">Education Configuration</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PageCard className="cursor-pointer hover:shadow-lg transition">
          <div onClick={() => navigate("levels")} className="w-full h-full">
            <PageCardContent>
              <h2 className="font-semibold text-blue-900">Education Levels</h2>
            </PageCardContent>
          </div>
        </PageCard>
        <PageCard className="cursor-pointer hover:shadow-lg transition">
          <div onClick={() => navigate("documents")} className="w-full h-full">
            <PageCardContent>
              <h2 className="font-semibold text-blue-900">Education Documents</h2>
            </PageCardContent>
          </div>
        </PageCard>
        <PageCard className="cursor-pointer hover:shadow-lg transition">
          <div onClick={() => navigate("mapping")} className="w-full h-full">
            <PageCardContent>
              <h2 className="font-semibold text-blue-900">Country Education Mapping</h2>
            </PageCardContent>
          </div>
        </PageCard>
        <PageCard className="cursor-pointer hover:shadow-lg transition">
          <div onClick={() => navigate("degrees")} className="w-full h-full">
            <PageCardContent>
              <h2 className="font-semibold text-blue-900">Degree Master</h2>
              <p className="text-sm text-gray-500 mt-1">Manage degree types mapped to education levels</p>
            </PageCardContent>
          </div>
        </PageCard>
      </div>
    </div>
  );
}
