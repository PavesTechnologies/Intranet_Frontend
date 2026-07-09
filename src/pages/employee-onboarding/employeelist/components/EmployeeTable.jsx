import GenericTable from "../../../../components/Table/table";
import AvatarCircle from "./AvatarCircle";
import StatusBadge from "./StatusBadge";

const headers = [
  "Employee",
  "Dept & Loc",
  "Work Mode",
  "Email",
  "Employment Status",
  "Designation",
  "Manager",
  "DOJ",
  "Employee Type",
  "Experience",
];

const columns = [
  "employee",
  "deptLoc",
  "workmode",
  "email",
  "status",
  "designation",
  "manager",
  "doj",
  "employeeType",
  "experience",
];

export default function EmployeeTable({ data, loading = false }) {
  const rows = (data || []).map((emp, index) => ({
    employee: (
      <div className="flex items-center gap-2 text-left">
        <AvatarCircle name={emp.name} index={index} />
        <div>
          <div className="font-semibold text-gray-900">{emp.name}</div>
          <div className="text-xs text-gray-500">{emp.id}</div>
        </div>
      </div>
    ),
    deptLoc: (
      <div>
        <div className="font-semibold">{emp.department || ""}</div>
        <div className="text-sm text-gray-500">{emp.location}</div>
      </div>
    ),
    workmode: emp.workmode,
    email: emp.email,
    status: <StatusBadge text={emp.employmentStatus} />,
    designation: emp.designation,
    manager: emp.reporting_manager_uuid,
    doj: emp.doj,
    employeeType: emp.employeeType,
    experience: emp.experience,
  }));

  return (
    <div className="min-w-[1300px] [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10">
      <GenericTable
        headers={headers}
        rows={rows}
        columns={columns}
        loading={loading}
      />
    </div>
  );
}
