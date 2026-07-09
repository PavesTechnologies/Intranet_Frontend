import React, { useState } from "react";
import {
  AlertCircle,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import api from "../../../api/axiosInstance";
import Button from "../../../components/Button/Button";
import { PageCard } from "../../../components/Cards/PageCard";
import FilterListbox from "../../../components/filter/FilterListbox";
import SearchInput from "../../../components/filter/Searchbar";
import { Fonts } from "../../../components/Fonts/Fonts";
import LoadingSpinner from "../../../components/LoadingSpinner";
import StatusBadge from "../../../components/status/statusbadge";
import PageHeader from "../../../components/ui/PageHeader";
import FilterCard from "../../../components/ui/FilterCard";

const categoryOptions = ["Identity", "Education", "Work", "HR Document"];

const filterButtonClassName =
  "w-full cursor-default rounded-lg border border-gray-300 bg-white py-2.5 pl-4 pr-10 text-left text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[#0A0082]/20 focus:border-[#0A0082]";

function buildFilterOptions(defaultLabel, options) {
  return [
    { value: "", label: defaultLabel },
    ...options.map((option) => ({ value: option, label: option })),
  ];
}

function getInitials(name) {
  return String(name || "")
    .split(" ")
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

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
      doc.category,
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
      "hr document",
    ].includes(normalized);
  };

  const getDocumentCategory = (doc) => {
    const path = String(doc.file_path || "").toLowerCase();
    const text = getSearchableDocumentText(doc);

    if (
      path.includes("identity_documents") ||
      doc.identity_type ||
      includesAny(text, [
        "aadhaar",
        "aadhar",
        "pan",
        "passport",
        "voter",
        "driving licence",
        "driving license",
      ])
    ) {
      return "Identity";
    }

    if (
      path.includes("education_documents") ||
      doc.education_document_uuid ||
      includesAny(text, [
        "10th",
        "12th",
        "marksheet",
        "ssc",
        "hsc",
        "intermediate",
        "degree",
        "diploma",
        "provisional",
        "education",
      ])
    ) {
      return "Education";
    }

    if (
      path.includes("experience_documents") ||
      doc.experience_uuid ||
      includesAny(text, [
        "offer",
        "relieving",
        "experience",
        "salary slip",
        "appointment",
        "work",
      ])
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
      doc.document_name,
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
      if (
        includesAny(text, [
          "driving licence",
          "driving license",
          "license",
          "licence",
        ])
      ) {
        return "Driving Licence";
      }
      return "Identity Document";
    }

    if (category === "Education") {
      if (includesAny(text, ["10th", "ssc", "secondary"])) {
        return "10th Marksheet";
      }
      if (
        includesAny(text, ["12th", "hsc", "intermediate", "senior secondary"])
      ) {
        return "12th Marksheet";
      }
      if (text.includes("diploma")) return "Diploma Certificate";
      if (
        includesAny(text, [
          "degree",
          "graduation",
          "bachelor",
          "btech",
          "b.e",
          "be ",
        ])
      ) {
        return "Degree Certificate";
      }
      if (text.includes("provisional")) return "Provisional Certificate";
      if (includesAny(text, ["marksheet", "mark sheet"])) {
        return "Education Marksheet";
      }
      return "Education Document";
    }

    if (category === "Work") {
      if (includesAny(text, ["offer", "appointment"])) return "Offer Letter";
      if (text.includes("relieving")) return "Relieving Letter";
      if (text.includes("experience")) return "Experience Letter";
      if (includesAny(text, ["salary slip", "payslip", "pay slip"])) {
        return "Salary Slip";
      }
      return "Work Document";
    }

    return "Document";
  };

  React.useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);

        const [documentsResponse] = await Promise.all([
          api.get(
            `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/hr/employees/documents`,
            {
              headers: {
                accept: "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            },
          ),
          api.get(
            `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/offerletters/user_id/details`,
            {
              headers: {
                accept: "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            },
          ),
        ]);

        const formattedEmployees = documentsResponse.data
          .filter((emp) => emp.emp_id)
          .map((emp) => ({
            id: emp.user_uuid,
            empId: emp.emp_id,
            name: emp.name,
            department: emp.department,
            documents: emp.documents.map((doc, index) => {
              const category = getDocumentCategory(doc);

              return {
                id: `${emp.emp_id}-${index}`,
                docName: getDocumentName(doc, category),
                fileUrl: doc.file_path,
                category,
                type: "Uploaded",
                status: "Signed",
                updated: "Recently",
              };
            }),
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
    if (!window.confirm("Are you sure you want to delete this document?")) {
      return;
    }

    setEmployees(
      employees.map((emp) => {
        if (emp.id !== empId) return emp;
        return {
          ...emp,
          documents: emp.documents.filter((doc) => doc.id !== docId),
        };
      }),
    );
  };

  const viewDocument = async (filePath, docId) => {
    try {
      setLoadingDoc(docId);
 

      const response = await api.get(
        `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/hr/view_documents?file_path=${filePath}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
 
      let signedUrl = response.data?.url || response.data;
 
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
    } catch (err) {
      console.error("ERROR:", err);
      alert("Unable to open document");
    } finally {
      setLoadingDoc(null);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "Identity":
        return <ShieldCheck className="h-4 w-4 text-pink-500" />;
      case "Work":
        return <Briefcase className="h-4 w-4 text-emerald-500" />;
      case "Education":
      case "HR Document":
      default:
        return <FileText className="h-4 w-4 text-[#0A0082]" />;
    }
  };

  const departmentOptions = [
    ...new Set(employees.map((emp) => emp.department).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.id.toLowerCase().includes(search.toLowerCase());
    const matchesDepartment =
      !departmentFilter || emp.department === departmentFilter;
    const matchesCategory =
      !categoryFilter ||
      emp.documents.some((doc) => doc.category === categoryFilter);

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
    a.localeCompare(b),
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
          }),
        }))
        .filter((emp) => emp);

      return {
        departmentName,
        groupCategoryFilter,
        visibleEmployees,
      };
    })
    .filter((group) => group.visibleEmployees.length > 0);

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <LoadingSpinner text="Loading documents..." size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[360px] items-center justify-center p-4">
        <PageCard className="max-w-md border-red-100 p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <h2 className={Fonts.subheading}>Failed to load data</h2>
            <p className="text-sm font-medium text-gray-500">{error}</p>
            <Button
              className="mt-2"
              onClick={() => window.location.reload()}
              variant="outline"
            >
              Try Again
            </Button>
          </div>
        </PageCard>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Employee Documents"
        subtitle="Manage, verify, and seamlessly organize essential documents across your entire workforce."
      />

      <FilterCard description="Narrow the document list by name, ID, category, or department.">
        <div className="w-full min-w-0 sm:w-64">
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or ID..."
            className="h-[42px]"
          />
        </div>
        <div className="w-full min-w-0 sm:w-52">
          <FilterListbox
            buttonClassName={filterButtonClassName}
            options={buildFilterOptions("All Categories", categoryOptions)}
            value={categoryFilter}
            onChange={setCategoryFilter}
          />
        </div>
        <div className="w-full min-w-0 sm:w-52">
          <FilterListbox
            buttonClassName={filterButtonClassName}
            options={buildFilterOptions(
              "All Departments",
              departmentOptions,
            )}
            value={departmentFilter}
            onChange={setDepartmentFilter}
          />
        </div>
      </FilterCard>

      {visibleDepartmentGroups.length === 0 ? (
        <PageCard className="border-dashed border-gray-300">
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 rounded-full bg-gray-100 p-4">
              <AlertCircle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">
              No employees found
            </h3>
            <p className="mt-2 max-w-sm text-sm text-gray-500">
              We couldn't find any employees matching your current search and
              filter criteria.
            </p>
          </div>
        </PageCard>
      ) : (
        <div className="space-y-6">
          {visibleDepartmentGroups.map(
            ({ departmentName, groupCategoryFilter, visibleEmployees }) => {
              const totalDocs = visibleEmployees.reduce(
                (sum, emp) => sum + emp.documentsToShow.length,
                0,
              );

              return (
                <PageCard key={departmentName} className="overflow-visible">
                  <div className="border-b border-gray-200 px-6 py-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-[#0A0082]">
                          <Briefcase className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className={Fonts.subheading}>
                            {departmentName}
                          </h2>
                          <p className="text-sm text-gray-500">
                            {visibleEmployees.length}{" "}
                            {visibleEmployees.length === 1
                              ? "candidate"
                              : "candidates"}{" "}
                            &bull; {totalDocs}{" "}
                            {totalDocs === 1 ? "document" : "documents"}
                          </p>
                        </div>
                      </div>

                      <div className="w-full sm:w-72">
                        <FilterListbox
                          buttonClassName={filterButtonClassName}
                          options={buildFilterOptions(
                            "All In This Department",
                            categoryOptions,
                          )}
                          value={groupCategoryFilter}
                          onChange={(value) =>
                            setGroupCategoryFilters((prev) => ({
                              ...prev,
                              [departmentName]: value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 p-4 sm:p-6">
                    {visibleEmployees.map((emp) => {
                      const documentsToShow = emp.documentsToShow;
                      const isExpanded = expandedEmp === emp.id;

                      return (
                        <PageCard
                          key={emp.id}
                          className={`overflow-hidden transition ${
                            isExpanded
                              ? "border-[#0A0082]/30 shadow-md"
                              : "hover:border-gray-300"
                          }`}
                        >
                          <button
                            type="button"
                            className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-gray-50"
                            onClick={() =>
                              setExpandedEmp(isExpanded ? null : emp.id)
                            }
                          >
                            <div className="flex min-w-0 items-center gap-4">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-[#0A0082]">
                                {getInitials(emp.name)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="truncate text-base font-semibold text-gray-900">
                                    {emp.name}
                                  </h3>
                                  <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                                    {emp.empId}
                                  </span>
                                </div>
                                <p className="mt-0.5 text-sm font-medium text-gray-500">
                                  {emp.department}
                                </p>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-4">
                              <div className="hidden text-right sm:block">
                                <span className="block text-sm font-medium text-gray-700">
                                  {documentsToShow.length}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {documentsToShow.length === 1
                                    ? "Document"
                                    : "Documents"}
                                </span>
                              </div>
                              <span className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500">
                                {isExpanded ? (
                                  <ChevronUp className="h-5 w-5" />
                                ) : (
                                  <ChevronDown className="h-5 w-5" />
                                )}
                              </span>
                            </div>
                          </button>

                          <div
                            className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                              isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                            }`}
                          >
                            <div className="overflow-hidden">
                              <div className="border-t border-gray-200 bg-gray-50">
                                <div className="overflow-x-auto px-5 py-4">
                                  <table className="w-full whitespace-nowrap text-left text-sm">
                                    <thead>
                                      <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                                        <th className="pb-3 pl-2 pr-4">
                                          Document Details
                                        </th>
                                        <th className="px-4 pb-3">Type</th>
                                        <th className="px-4 pb-3">Category</th>
                                        <th className="px-4 pb-3">
                                          Last Updated
                                        </th>
                                        <th className="px-4 pb-3">Status</th>
                                        <th className="pb-3 pl-4 pr-2 text-right">
                                          Actions
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                      {documentsToShow.map((doc) => (
                                        <tr
                                          key={doc.id}
                                          className="transition hover:bg-white"
                                        >
                                          <td className="py-4 pl-2 pr-4">
                                            <div className="flex items-center gap-3">
                                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white ring-1 ring-gray-200">
                                                {getCategoryIcon(doc.category)}
                                              </div>
                                              <span className="font-semibold text-gray-900">
                                                {doc.docName}
                                              </span>
                                            </div>
                                          </td>
                                          <td className="px-4 py-4 font-medium text-gray-600">
                                            {doc.type}
                                          </td>
                                          <td className="px-4 py-4 text-gray-600">
                                            {doc.category}
                                          </td>
                                          <td className="px-4 py-4 text-gray-500">
                                            {doc.updated}
                                          </td>
                                          <td className="px-4 py-4">
                                            <StatusBadge
                                              label={doc.status}
                                              size="sm"
                                            />
                                          </td>
                                          <td className="py-4 pl-4 pr-2 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                              <Button
                                                size="small"
                                                variant="outline"
                                                loading={loadingDoc === doc.id}
                                                loadingText="Loading..."
                                                onClick={() =>
                                                  viewDocument(
                                                    doc.fileUrl,
                                                    doc.id,
                                                  )
                                                }
                                              >
                                                <Eye className="h-4 w-4" />
                                                <span className="hidden lg:inline">
                                                  View
                                                </span>
                                              </Button>
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
                        </PageCard>
                      );
                    })}
                  </div>
                </PageCard>
              );
            },
          )}
        </div>
      )}
    </div>
  );
}
