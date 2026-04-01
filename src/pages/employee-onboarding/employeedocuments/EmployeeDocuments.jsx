import React, { useState } from "react";
import {
  Search,
  Filter,
  Eye,
  Trash2,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FileBadge,
  ShieldCheck,
  Clock,
  Briefcase
} from "lucide-react";

export default function EmployeeDocumentsPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [groupCategoryFilters, setGroupCategoryFilters] = useState({});
  const [expandedEmp, setExpandedEmp] = useState(null);

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingDoc, setLoadingDoc] = useState(null);

  const normalizeValue = (value) =>
    String(value || "")
      .replace(/[_-]+/g, " ")
      .replace(/\.[a-z0-9]+$/i, "")
      .trim();

  const getSearchableDocumentText = (doc) =>
    [
      doc.file_path,
      doc.document_name,
      doc.document_type,
      doc.doc_type,
      doc.identity_type,
      doc.identity_type_name,
      doc.uploaded_column,
      doc.uploaded_type,
      doc.education_type,
      doc.education_level,
      doc.degree_name,
      doc.specialization,
      doc.category
    ]
      .filter(Boolean)
      .map((value) => normalizeValue(value).toLowerCase())
      .join(" ");

  const includesAny = (text, keywords) =>
    keywords.some((keyword) => text.includes(keyword));

  const isGenericParentLabel = (value) => {
    const normalized = normalizeValue(value).toLowerCase();
    return [
      "document",
      "education document",
      "identity document",
      "experience document",
      "work document",
      "hr document"
    ].includes(normalized);
  };

  const getDocumentCategory = (doc) => {
    const path = String(doc.file_path || "").toLowerCase();
    const text = getSearchableDocumentText(doc);

    if (
      path.includes("identity_documents") ||
      doc.identity_type ||
      includesAny(text, ["aadhaar", "aadhar", "pan", "passport", "voter", "driving licence", "driving license"])
    ) {
      return "Identity";
    }

    if (
      path.includes("education_documents") ||
      doc.education_document_uuid ||
      includesAny(text, ["10th", "12th", "marksheet", "ssc", "hsc", "intermediate", "degree", "diploma", "provisional", "education"])
    ) {
      return "Education";
    }

    if (
      path.includes("experience_documents") ||
      doc.experience_uuid ||
      includesAny(text, ["offer", "relieving", "experience", "salary slip", "appointment", "work"])
    ) {
      return "Work";
    }

    return "HR Document";
  };

  const getDocumentName = (doc, category) => {
    const explicitName = [
      doc.uploaded_column,
      doc.uploaded_type,
      doc.identity_type_name,
      doc.identity_type,
      doc.education_level,
      doc.education_type,
      doc.degree_name,
      doc.doc_type,
      doc.document_type,
      doc.document_name
    ].find((value) => value && !isGenericParentLabel(value));

    if (explicitName) {
      return normalizeValue(explicitName);
    }

    const text = getSearchableDocumentText(doc);

    if (category === "Identity") {
      if (includesAny(text, ["aadhaar", "aadhar"])) return "Aadhaar Card";
      if (text.includes("pan")) return "PAN Card";
      if (text.includes("passport")) return "Passport";
      if (includesAny(text, ["voter", "voter id"])) return "Voter ID";
      if (includesAny(text, ["driving licence", "driving license", "license", "licence"])) return "Driving Licence";
      return "Identity Document";
    }

    if (category === "Education") {
      if (includesAny(text, ["10th", "ssc", "secondary"])) return "10th Marksheet";
      if (includesAny(text, ["12th", "hsc", "intermediate", "senior secondary"])) return "12th Marksheet";
      if (text.includes("diploma")) return "Diploma Certificate";
      if (includesAny(text, ["degree", "graduation", "bachelor", "btech", "b.e", "be "])) return "Degree Certificate";
      if (text.includes("provisional")) return "Provisional Certificate";
      if (includesAny(text, ["marksheet", "mark sheet"])) return "Education Marksheet";
      return "Education Document";
    }

    if (category === "Work") {
      if (includesAny(text, ["offer", "appointment"])) return "Offer Letter";
      if (text.includes("relieving")) return "Relieving Letter";
      if (text.includes("experience")) return "Experience Letter";
      if (includesAny(text, ["salary slip", "payslip", "pay slip"])) return "Salary Slip";
      return "Work Document";
    }

    return "Document";
  };

  React.useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);

        const token = localStorage.getItem("token");

        const response = await fetch(`${import.meta.env.VITE_EMPLOYEE_ONBOARDING_URL}/hr/employees/documents`, {
          method: "GET",
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error("Failed to fetch documents");
        }

        const data = await response.json();

        const formattedEmployees = data.map((emp) => ({
          id: emp.user_uuid,
          empId: emp.emp_id,
          name: emp.name,
          department: emp.department,
          documents: emp.documents.map((doc, index) => {
            const category = getDocumentCategory(doc);
            const type = "Uploaded";
            const status = "Signed";

            return {
              id: `${emp.emp_id}-${index}`,
              docName: getDocumentName(doc, category),
              fileUrl: doc.file_path,
              category,
              type,
              status,
              updated: "Recently"
            };
          })
        }));

        setEmployees(formattedEmployees);
      } catch (err) {
        console.error("Error fetching documents:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const deleteDocument = (empId, docId) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;

    setEmployees(employees.map((emp) => {
      if (emp.id !== empId) return emp;
      return {
        ...emp,
        documents: emp.documents.filter((doc) => doc.id !== docId)
      };
    }));
  };

  const viewDocument = async (filePath, docId) => {
    try {
      setLoadingDoc(docId);

      const token = localStorage.getItem("token");

      const response = await fetch(
        `${import.meta.env.VITE_EMPLOYEE_ONBOARDING_URL}/hr/view_documents?file_path=${filePath}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const textResult = await response.text();

      let signedUrl;

      try {
        const parsed = JSON.parse(textResult);
        signedUrl = parsed.url || parsed;
      } catch {
        signedUrl = textResult;
      }

      if (typeof signedUrl !== "string") {
        signedUrl = String(signedUrl);
      }

      signedUrl = signedUrl.replace(/^"+|"+$/g, "").trim();

      if (!signedUrl || !signedUrl.startsWith("http")) {
        throw new Error("Invalid URL");
      }

      const link = document.createElement("a");
      link.href = signedUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("ERROR:", error);
      alert("Unable to open document");
    } finally {
      setLoadingDoc(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Signed":
        return "bg-emerald-100/80 text-emerald-700 border-emerald-200/50 shadow-sm";
      case "Verified":
        return "bg-blue-100/80 text-blue-700 border-blue-200/50 shadow-sm";
      case "Pending":
      default:
        return "bg-amber-100/80 text-amber-700 border-amber-200/50 shadow-sm";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Signed":
        return <FileBadge className="mr-1.5 h-3.5 w-3.5" />;
      case "Verified":
        return <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />;
      case "Pending":
      default:
        return <Clock className="mr-1.5 h-3.5 w-3.5" />;
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "Identity":
        return <ShieldCheck className="h-4 w-4 text-blue-500" />;
      case "Work":
        return <Briefcase className="h-4 w-4 text-emerald-500" />;
      case "HR Document":
      default:
        return <FileText className="h-4 w-4 text-indigo-500" />;
    }
  };

  const categoryOptions = ["Identity", "Education", "Work", "HR Document"];

  const departmentOptions = [...new Set(
    employees
      .map((emp) => emp.department)
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b));

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.id.toLowerCase().includes(search.toLowerCase());
    const matchesDepartment =
      !departmentFilter || emp.department === departmentFilter;
    const matchesCategory =
      !categoryFilter || emp.documents.some((doc) => doc.category === categoryFilter);

    return matchesSearch && matchesDepartment && matchesCategory;
  });

  const groupedEmployees = filteredEmployees.reduce((groups, emp) => {
    const departmentName = emp.department || "Unassigned";
    if (!groups[departmentName]) {
      groups[departmentName] = [];
    }
    groups[departmentName].push(emp);
    return groups;
  }, {});

  const departmentGroups = Object.entries(groupedEmployees).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  const visibleDepartmentGroups = departmentGroups
    .map(([departmentName, departmentEmployees]) => {
      const groupCategoryFilter = groupCategoryFilters[departmentName] || "";
      const visibleEmployees = departmentEmployees
        .map((emp) => ({
          ...emp,
          documentsToShow: emp.documents.filter((doc) => {
            const matchesGlobalCategory =
              !categoryFilter || doc.category === categoryFilter;
            const matchesGroupCategory =
              !groupCategoryFilter || doc.category === groupCategoryFilter;
            return matchesGlobalCategory && matchesGroupCategory;
          })
        }))
        .filter((emp) => emp.documentsToShow.length > 0);

      return {
        departmentName,
        groupCategoryFilter,
        visibleEmployees
      };
    })
    .filter((group) => group.visibleEmployees.length > 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Loading documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-2xl shadow-sm border border-red-100 max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <h2 className="text-lg font-bold text-slate-900">Failed to load data</h2>
          <p className="text-slate-500 font-medium">{error}</p>
          <button className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 font-semibold rounded-lg hover:bg-indigo-100 transition-colors" onClick={() => window.location.reload()}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-300">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-100">
          <div className="relative overflow-hidden px-8 py-10 sm:px-12">
            <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-indigo-50/50 opacity-70 blur-3xl"></div>
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-50/50 opacity-70 blur-3xl"></div>

            <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                  Employee Documents
                </h1>
                <p className="mt-3 flex items-center gap-2 text-sm text-slate-500 max-w-xl">
                  <FileText className="h-5 w-5 text-indigo-400" />
                  Manage, verify, and seamlessly organize essential documents across your entire workforce.
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <div className="relative group">
                  <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-indigo-500 to-blue-500 opacity-0 blur transition duration-500 group-focus-within:opacity-20"></div>
                  <div className="relative flex items-center">
                    <Search className="absolute left-3.5 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                    <input
                      type="text"
                      placeholder="Search name or ID..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-11 w-full rounded-xl border-0 bg-slate-50/80 pl-10 pr-4 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 backdrop-blur-sm transition-all focus:bg-white focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:w-64"
                    />
                  </div>
                </div>

                <div className="relative group">
                  <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 blur transition duration-500 group-focus-within:opacity-20"></div>
                  <div className="relative flex items-center">
                    <Filter className="absolute left-3.5 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="h-11 w-full appearance-none rounded-xl border-0 bg-slate-50/80 pl-10 pr-10 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 backdrop-blur-sm transition-all focus:bg-white focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:w-48"
                    >
                      <option value="">All Categories</option>
                      {categoryOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 h-4 w-4 text-slate-400 pointer-events-none transition-colors group-hover:text-slate-600" />
                  </div>
                </div>

                <div className="relative group">
                  <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 opacity-0 blur transition duration-500 group-focus-within:opacity-20"></div>
                  <div className="relative flex items-center">
                    <Briefcase className="absolute left-3.5 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                    <select
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      className="h-11 w-full appearance-none rounded-xl border-0 bg-slate-50/80 pl-10 pr-10 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 backdrop-blur-sm transition-all focus:bg-white focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:w-52"
                    >
                      <option value="">All Departments</option>
                      {departmentOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 h-4 w-4 text-slate-400 pointer-events-none transition-colors group-hover:text-slate-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {visibleDepartmentGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/50 py-20 text-center shadow-sm backdrop-blur-sm">
              <div className="rounded-full bg-slate-100 p-4 mb-4">
                <AlertCircle className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">No employees found</h3>
              <p className="mt-2 text-sm text-slate-500 max-w-sm">We couldn't find any employees matching your current search and filter criteria.</p>
            </div>
          ) : (
            visibleDepartmentGroups.map(({ departmentName, groupCategoryFilter, visibleEmployees }) => {
              const totalDocs = visibleEmployees.reduce(
                (sum, emp) => sum + emp.documentsToShow.length,
                0
              );

              return (
                <section
                  key={departmentName}
                  className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200"
                >
                  <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5 sm:px-8">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                            <Briefcase className="h-5 w-5" />
                          </div>
                          <div>
                            <h2 className="text-lg font-bold text-slate-900">{departmentName}</h2>
                            <p className="text-sm text-slate-500">
                              {visibleEmployees.length} {visibleEmployees.length === 1 ? "candidate" : "candidates"} • {totalDocs} {totalDocs === 1 ? "document" : "documents"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                        <div className="relative flex items-center">
                          <Filter className="absolute left-3.5 h-4 w-4 text-slate-400" />
                          <select
                            value={groupCategoryFilter}
                            onChange={(e) =>
                              setGroupCategoryFilters((prev) => ({
                                ...prev,
                                [departmentName]: e.target.value
                              }))
                            }
                            className="h-11 w-full appearance-none rounded-xl border-0 bg-slate-50 pl-10 pr-10 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:w-56"
                          >
                            <option value="">All In This Department</option>
                            {categoryOptions.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5 p-4 sm:p-6">
                    {visibleEmployees.map((emp) => {
                      const documentsToShow = emp.documentsToShow;
                      const isExpanded = expandedEmp === emp.id;

                      return (
                        <div
                          key={emp.id}
                          className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition-all duration-300 ${isExpanded ? "shadow-lg ring-indigo-100/50" : "hover:shadow-md hover:ring-slate-300"
                            }`}
                        >
                          <div
                            className="flex cursor-pointer items-center justify-between px-6 py-5 transition-colors hover:bg-slate-50/80"
                            onClick={() => setExpandedEmp(isExpanded ? null : emp.id)}
                          >
                            <div className="flex items-center gap-5">
                              <div className="relative">
                                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-indigo-200 to-blue-200 opacity-60 blur-sm"></div>
                                <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-50 to-white text-lg font-bold text-indigo-600 shadow-sm ring-1 ring-indigo-100">
                                  {emp.name
                                    .split(" ")
                                    .slice(0, 2)
                                    .map((word) => word.charAt(0).toUpperCase())
                                    .join("")}
                                </div>
                              </div>
                              <div>
                                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                                  {emp.name}
                                  <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200/50">
                                    {emp.empId}
                                  </span>
                                </h3>
                                <p className="mt-0.5 text-sm text-slate-500 font-medium">{emp.department}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-5">
                              <div className="hidden sm:flex flex-col items-end">
                                <span className="text-sm font-medium text-slate-700">
                                  {documentsToShow.length}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {documentsToShow.length === 1 ? "Document" : "Documents"}
                                </span>
                              </div>
                              <div className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${isExpanded ? "bg-indigo-50 text-indigo-600" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"}`}>
                                {isExpanded ? (
                                  <ChevronUp className="h-5 w-5" />
                                ) : (
                                  <ChevronDown className="h-5 w-5" />
                                )}
                              </div>
                            </div>
                          </div>

                          <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                            <div className="overflow-hidden">
                              <div className="border-t border-slate-100 bg-slate-50/50">
                                <div className="overflow-x-auto px-6 py-5">
                                  <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead>
                                      <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        <th scope="col" className="pb-3 pl-2 pr-4">Document Details</th>
                                        <th scope="col" className="px-4 pb-3">Type</th>
                                        <th scope="col" className="px-4 pb-3">Category</th>
                                        <th scope="col" className="px-4 pb-3">Last Updated</th>
                                        <th scope="col" className="px-4 pb-3">Status</th>
                                        <th scope="col" className="pb-3 pl-4 pr-2 text-right">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {documentsToShow.map((doc) => (
                                        <tr key={doc.id} className="group transition-colors hover:bg-white">
                                          <td className="py-4 pl-2 pr-4">
                                            <div className="flex items-center gap-3">
                                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 ring-1 ring-slate-200/50 group-hover:bg-white group-hover:shadow-sm transition-all">
                                                {getCategoryIcon(doc.category)}
                                              </div>
                                              <span className="font-semibold text-slate-900">{doc.docName}</span>
                                            </div>
                                          </td>
                                          <td className="px-4 py-4 text-slate-600 font-medium">{doc.type}</td>
                                          <td className="px-4 py-4 text-slate-600">
                                            <div className="flex items-center gap-2">
                                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                                              {doc.category}
                                            </div>
                                          </td>
                                          <td className="px-4 py-4 text-slate-500">{doc.updated}</td>
                                          <td className="px-4 py-4">
                                            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide ${getStatusBadge(doc.status)}`}>
                                              {getStatusIcon(doc.status)}
                                              {doc.status}
                                            </span>
                                          </td>
                                          <td className="py-4 pl-4 pr-2 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                              <button
                                                onClick={() => viewDocument(doc.fileUrl, doc.id)}
                                                disabled={loadingDoc === doc.id}
                                                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-white px-3 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 transition-all hover:bg-indigo-50 hover:text-indigo-700 hover:ring-indigo-300 disabled:opacity-50"
                                              >
                                                {loadingDoc === doc.id ? (
                                                  <>
                                                    <div className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                                    Loading...
                                                  </>
                                                ) : (
                                                  <>
                                                    <Eye className="h-4 w-4" />
                                                    <span className="hidden lg:inline">View</span>
                                                  </>
                                                )}
                                              </button>
                                              <button
                                                onClick={() => deleteDocument(emp.id, doc.id)}
                                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm ring-1 ring-inset ring-slate-300 transition-all hover:bg-red-50 hover:text-red-600 hover:ring-red-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                                                title="Delete Document"
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
