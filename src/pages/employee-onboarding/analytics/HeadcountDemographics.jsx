import { useEffect, useState } from "react";
import LoadingSpinner from "../../../components/LoadingSpinner";
import { showStatusToast } from "../../../components/toastfy/toast.jsx";
import FiltersBar from "./components/FiltersBar";
import SectionTabs from "./components/SectionTabs";
import ChartCard from "./components/ChartCard";
import CardContainer from "./components/CardContainer";
import { fetchDashboardAnalytics } from "./analyticsapi";
import BarChartCard from "./components/BarChartCard";
import DeptBarChartCard from "./components/DeptBarChartCard";

export default function HeadcountDemographicsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dept: "",
    date: "",
    worker: "",
  });
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [filters]);

  const fetchDepartments = async () => {
    try {
      const res = await fetch(
        `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/masters/departments/`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      const data = await res.json();
      setDepartments((data || []).map((department) => department.department_name));
    } catch {
      showStatusToast("Failed to load departments", "error");
    }
  };

  const loadAnalytics = async () => {
    setLoading(true);
    const data = await fetchDashboardAnalytics();

    if (data) {
      let demographicsData = data.demographics || data;
      let workerDeptData = data.workerDept || [];
      let genderDeptData = data.genderDept || [];
      let employmentDeptData = data.employmentDept || [];

      if (filters.dept) {
        workerDeptData = workerDeptData.filter((item) => item.dept === filters.dept);
        genderDeptData = genderDeptData.filter((item) => item.dept === filters.dept);
        employmentDeptData = employmentDeptData.filter(
          (item) => item.dept === filters.dept,
        );
      }

      if (filters.worker) {
        const workerKey =
          filters.worker === "Permanent"
            ? "permanent"
            : filters.worker === "Contract"
              ? "contingent"
              : "";

        if (workerKey) {
          workerDeptData = workerDeptData.map((item) => ({
            ...item,
            permanent: workerKey === "permanent" ? item.permanent || 0 : 0,
            contingent: workerKey === "contingent" ? item.contingent || 0 : 0,
          }));
        }
      }

      const genderWithColor = (demographicsData.gender || []).map((item) => ({
        ...item,
        color: item.label === "Female" ? "#b57bb5" : "#5b8def",
      }));

      const nationalityWithColor = (demographicsData.nationality || []).map(
        (item) => ({
          ...item,
          color: item.label === "India" ? "#5b8def" : "#d97b7b",
        }),
      );

      setAnalytics({
        demographics: {
          ...demographicsData,
          gender: genderWithColor,
          nationality: nationalityWithColor,
        },
        workerDept: workerDeptData,
        genderDept: genderDeptData,
        employmentDept: employmentDeptData,
      });
    } else {
      showStatusToast("Failed to load analytics data", "error");
    }

    setLoading(false);
  };

  if (loading && !analytics) {
    return (
      <div className="min-h-screen bg-slate-50">
        <LoadingSpinner text="Loading analytics..." />
      </div>
    );
  }

  if (!analytics) return null;

  const { demographics, workerDept, genderDept, employmentDept } = analytics;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <SectionTabs />

      <FiltersBar
        filters={filters}
        setFilters={setFilters}
        departments={departments}
      />

      <CardContainer>
        <ChartCard
          title="Gender"
          data={demographics?.gender || []}
          total={demographics?.total || 0}
          colors={["#b57bb5", "#5b8def"]}
          accentColor="#b57bb5"
        />
        <ChartCard
          title="Employment Type"
          data={demographics?.employmentType || []}
          total={demographics?.total || 0}
          colors={["#c06dbf", "#5b8def"]}
          accentColor="#c06dbf"
        />
        <ChartCard
          title="Worker Type"
          data={demographics?.workerType || []}
          total={demographics?.total || 0}
          colors={["#7b6ed6", "#5b8def"]}
          accentColor="#7b6ed6"
        />
        <ChartCard
          title="Nationality"
          data={demographics?.nationality || []}
          total={demographics?.total || 0}
          colors={["#d97b7b", "#5b8def"]}
          accentColor="#d97b7b"
        />
      </CardContainer>

      <CardContainer>
        <BarChartCard
          title="Age of Employees (in Years)"
          data={demographics?.ageGroups || []}
          xKey="group"
          accentColor="#5b8def"
          bars={[
            { key: "female", color: "#5b8def" },
            { key: "male", color: "#c06dbf" },
          ]}
        />
        <BarChartCard
          title="Years in Organisation"
          data={demographics?.experience || []}
          xKey="range"
          accentColor="#e3b52e"
          bars={[{ key: "value", color: "#e3b52e" }]}
        />
      </CardContainer>

      <DeptBarChartCard
        title="Headcount by Worker Type Across Department"
        data={workerDept || []}
        xKey="dept"
        accentColor="#7b6ed6"
        bars={[
          { key: "contingent", color: "#7b6ed6" },
          { key: "permanent", color: "#e26a47" },
        ]}
      />

      <DeptBarChartCard
        title="Headcount by Gender Across Department"
        data={genderDept || []}
        xKey="dept"
        accentColor="#5b8def"
        bars={[
          { key: "female", color: "#5b8def" },
          { key: "male", color: "#c06dbf" },
        ]}
      />

      <DeptBarChartCard
        title="Headcount by Employment Type Across Department"
        data={employmentDept || []}
        xKey="dept"
        accentColor="#59b3b8"
        bars={[
          { key: "full", color: "#59b3b8" },
          { key: "partTime", color: "#8b5cf6" },
          { key: "intern", color: "#f59e0b" },
          { key: "contract", color: "#ef4444" },
          { key: "freelance", color: "#14b8a6" },
        ]}
      />
    </div>
  );
}
