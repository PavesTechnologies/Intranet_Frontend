import { useEffect, useState } from "react";
import axios from "axios";
import api from "../../../api/axiosInstance";
import LoadingSpinner from "../../../components/LoadingSpinner";
import { showStatusToast } from "../../../components/toastfy/toast.jsx";
import FiltersBar from "./components/FiltersBar";
import SectionTabs from "./components/SectionTabs";
import ChartCard from "./components/ChartCard";
import CardContainer from "./components/CardContainer";
import { fetchDashboardAnalytics } from "./analyticsapi";
import BarChartCard from "./components/BarChartCard";
import DeptBarChartCard from "./components/DeptBarChartCard";

const PHONE_CODE_TO_COUNTRY = {
  "1": "United States",
  "7": "Russia",
  "20": "Egypt",
  "27": "South Africa",
  "30": "Greece",
  "31": "Netherlands",
  "32": "Belgium",
  "33": "France",
  "34": "Spain",
  "36": "Hungary",
  "39": "Italy",
  "40": "Romania",
  "41": "Switzerland",
  "43": "Austria",
  "44": "United Kingdom",
  "45": "Denmark",
  "46": "Sweden",
  "47": "Norway",
  "48": "Poland",
  "49": "Germany",
  "52": "Mexico",
  "54": "Argentina",
  "55": "Brazil",
  "56": "Chile",
  "57": "Colombia",
  "60": "Malaysia",
  "61": "Australia",
  "62": "Indonesia",
  "63": "Philippines",
  "64": "New Zealand",
  "65": "Singapore",
  "66": "Thailand",
  "81": "Japan",
  "82": "South Korea",
  "84": "Vietnam",
  "86": "China",
  "90": "Turkey",
  "91": "India",
  "92": "Pakistan",
  "94": "Sri Lanka",
  "95": "Myanmar",
  "98": "Iran",
  "234": "Nigeria",
  "254": "Kenya",
  "351": "Portugal",
  "353": "Ireland",
  "358": "Finland",
  "380": "Ukraine",
  "420": "Czech Republic",
  "852": "Hong Kong",
  "880": "Bangladesh",
  "886": "Taiwan",
  "960": "Maldives",
  "961": "Lebanon",
  "962": "Jordan",
  "966": "Saudi Arabia",
  "967": "Yemen",
  "968": "Oman",
  "971": "UAE",
  "972": "Israel",
  "973": "Bahrain",
  "974": "Qatar",
  "975": "Bhutan",
  "977": "Nepal",
  "992": "Tajikistan",
  "994": "Azerbaijan",
  "995": "Georgia",
  "998": "Uzbekistan",
};

const getCountryFromCode = (code) => {
  if (!code) return null;
  const clean = String(code).replace(/^\+/, "").trim();
  return PHONE_CODE_TO_COUNTRY[clean] || null;
};

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
      const res = await api.get(
        `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/masters/departments/`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      setDepartments((res.data || []).map((department) => department.department_name));
    } catch {
      showStatusToast("Failed to load departments", "error");
    }
  };

  const computeNationalityFromEmployees = async () => {
    try {
      const res = await axios.get(
        `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/offerletters/`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      const offers = Array.isArray(res.data) ? res.data : res.data?.data || [];

      const counts = {};
      offers.forEach((offer) => {
        const country =
          (offer.nationality && offer.nationality.trim() && offer.nationality.toLowerCase() !== "unknown"
            ? offer.nationality.trim()
            : null) ||
          getCountryFromCode(offer.country_code) ||
          "Not Specified";
        counts[country] = (counts[country] || 0) + 1;
      });

      return Object.entries(counts)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);
    } catch {
      return null;
    }
  };

  const loadAnalytics = async () => {
    setLoading(true);
    const [data, computedNationality] = await Promise.all([
      fetchDashboardAnalytics(),
      computeNationalityFromEmployees(),
    ]);

    if (data) {
      let demographicsData = data.demographics || data;
      let workerDeptData = data.workerDept || [];
      let genderDeptData = data.genderDept || [];
      let employmentDeptData = data.employmentDept || [];

      if (computedNationality && computedNationality.length > 0) {
        demographicsData = { ...demographicsData, nationality: computedNationality };
      }

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

      const NATIONALITY_COLORS = [
        "#5b8def", "#d97b7b", "#7b6ed6", "#59b3b8",
        "#e3b52e", "#c06dbf", "#e26a47", "#14b8a6",
      ];
      const nationalityWithColor = (demographicsData.nationality || []).map(
        (item, idx) => ({
          ...item,
          color: NATIONALITY_COLORS[idx % NATIONALITY_COLORS.length],
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
