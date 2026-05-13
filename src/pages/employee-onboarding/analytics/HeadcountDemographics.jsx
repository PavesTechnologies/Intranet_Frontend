import { useState, useEffect } from "react";
import FiltersBar from "./components/FiltersBar";
import SectionTabs from "./components/SectionTabs";
import ChartCard from "./components/ChartCard";
import CardContainer from "./components/CardContainer";
import { fetchDashboardAnalytics } from "./analyticsapi";
import BarChartCard from "./components/BarChartCard";
import DeptBarChartCard from "./components/DeptBarChartCard";

export default function HeadcountDemographicsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [filters, setFilters] = useState({});
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    loadAnalytics();
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    const res = await fetch(
      `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/masters/departments/`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`, // ✅ ADD THIS  
        },
      },
    );

    const data = await res.json();

    setDepartments(data.map((d) => d.department_name));
  };


  const loadAnalytics = async () => {
    const data = await fetchDashboardAnalytics();

    if (data) {
      let demographicsData = data.demographics || data;

      let workerDeptData = data.workerDept || [];
      let genderDeptData = data.genderDept || [];
      let employmentDeptData = data.employmentDept || [];

      // 🔥 APPLY DEPARTMENT FILTER
      if (filters.dept && filters.dept !== "All") {
        workerDeptData = workerDeptData.filter((d) => d.dept === filters.dept);

        genderDeptData = genderDeptData.filter((d) => d.dept === filters.dept);

        employmentDeptData = employmentDeptData.filter(
          (d) => d.dept === filters.dept,
        );

        // 🔥 update total dynamically
        const totalFromDept = workerDeptData.reduce(
          (sum, d) => sum + (d.permanent || 0) + (d.contingent || 0),
          0,
        );

        demographicsData = {
          ...demographicsData,
          total: totalFromDept,
        };
      }

      // 🎨 COLORS
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
    }
  };
  if (!analytics) {
    return <div style={{ padding: 20 }}>Loading analytics...</div>;
  }

  const { demographics, workerDept, genderDept, employmentDept } = analytics;

  return (
    <div
      style={{
        padding: 20,
        background: "#f6f7fb",
        fontFamily: "Inter, sans-serif",
        minHeight: "100vh",
      }}
    >
      <SectionTabs />

      <h2 style={{ marginTop: 20 }}>Headcount Distribution by Demographics</h2>

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
        />

        <ChartCard
          title="Employment Type"
          data={demographics?.employmentType || []}
          total={demographics?.total || 0}
          colors={["#c06dbf", "#5b8def"]}
        />

        <ChartCard
          title="Worker Type"
          data={demographics?.workerType || []}
          total={demographics?.total || 0}
          colors={["#7b6ed6", "#5b8def"]}
        />

        <ChartCard
          title="Nationality"
          data={demographics?.nationality || []}
          total={demographics?.total || 0}
          colors={["#d97b7b", "#5b8def"]}
        />
      </CardContainer>

      <CardContainer>
        <BarChartCard
          title="Age of Employees (in Years)"
          data={demographics?.ageGroups || []}
          xKey="group"
          bars={[
            { key: "female", color: "#5b8def" },
            { key: "male", color: "#c06dbf" },
          ]}
        />
        <BarChartCard
          title="Years in Organisation"
          data={demographics?.experience || []}
          xKey="range"
          bars={[{ key: "value", color: "#e3b52e" }]}
        />
      </CardContainer>
      <DeptBarChartCard
        title="Headcount by Worker Type Across Department"
        data={workerDept || []}
        xKey="dept"
        bars={[
          { key: "contingent", color: "#7b6ed6" },
          { key: "permanent", color: "#e26a47" },
        ]}
      />

      <DeptBarChartCard
        title="Headcount by Gender Across Department"
        data={genderDept || []}
        xKey="dept"
        bars={[
          { key: "female", color: "#5b8def" },
          { key: "male", color: "#c06dbf" },
        ]}
      />

      <DeptBarChartCard
        title="Headcount by Employment Type Across Department"
        data={employmentDept || []}
        xKey="dept"
        bars={[{ key: "full", color: "#59b3b8" }]}
      />
    </div>
  );
}
