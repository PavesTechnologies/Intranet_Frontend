import AvatarCircle from "./AvatarCircle";
import StatusBadge from "./StatusBadge";
import ActionMenu from "./ActionMenu";

export default function EmployeeRow({ emp , index}) {
  return (
    <tr style={{ borderBottom: "1px solid #eee" }}>
      <td>
        <input type="checkbox" />
      </td>

      {/* Employee */}
      <td style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <AvatarCircle name={emp.name} index={index} />
        <div>
          <div style={{ fontWeight: 600 }}>{emp.name}</div>
          <div style={{ fontSize: 12, color: "#777" }}>{emp.id}</div>
        </div>
      </td>

      

      <td>
        <StatusBadge text={emp.loginStatus} />
        <div style={{ fontSize: 11, color: "#777" }}>
          on {emp.loginDate}
        </div>
      </td>

      <td>{emp.username}</td>
      <td>
        <div className="font-semibold">{emp.department || ""}</div>
        <div className="text-gray-500 text-sm">{emp.location}</div>
      </td>
      <td>
        {emp.workmode}
      </td>
      <td>
        <div>{emp.email}</div>
        <StatusBadge text={emp.emailStatus} />
      </td>
      <td>{emp.designation}</td>
      <td>{emp.manager}</td>
      <td>{emp.doj}</td>
      <td>
        {emp.employeeType} 
        </td>
      <td>{emp.experience}</td>
      <td><ActionMenu /></td>
    </tr>
  );
}
