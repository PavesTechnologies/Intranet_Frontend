import EmployeeRow from "./EmployeeRow";

export default function EmployeeTable({ data }) {
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: 14,
        background: "white",
        tableLayout: "fixed", // important for fixed column width
      }}
    >

      {/* 🔹 Column Width Control */}
      <colgroup>
        <col style={{ width: "40px" }} />     {/* checkbox / avatar */}
        <col style={{ width: "200px" }} />    {/* Employee */}
        <col style={{ width: "140px" }} />    {/* Login */}
        <col style={{ width: "180px" }} />    {/* Username */}
        <col style={{ width: "200px" }} />    {/* Dept & Loc */}
        <col style={{ width: "120px" }} />    {/* workMode */}
        <col style={{ width: "220px" }} />    {/* Email & Status */}
        <col style={{ width: "260px" }} />    {/* ⭐ Designation (extended) */}
        <col style={{ width: "180px" }} />    {/* Manager */}
        <col style={{ width: "140px" }} />    {/* DOJ */}
        <col style={{ width: "120px" }} />    {/* workstatus*/}
        <col style={{ width: "120px" }} />    {/* Experience */}
        <col style={{ width: "90px" }} />     {/* Actions */}
      </colgroup>

      <thead style={{ background: "#f6f7fb", textAlign: "left" }}>
        <tr>
          <th></th>
          <th>Employee</th>
          <th>Login Status</th>
          <th>Username</th>
          <th>Dept & Loc</th>
          <th>workMode</th>
          <th>Email & Status</th>
          <th>Designation</th>
          <th>Manager</th>
          <th>DOJ</th>
          <th>EmployeeType</th>
          <th>Experience</th>
          <th>Actions</th>
        </tr>
      </thead>

      <tbody>
        {(data || []).map((emp, i) => (
          <EmployeeRow key={i} emp={emp} index={i} />
        ))}
      </tbody>
    </table>
  );
}
