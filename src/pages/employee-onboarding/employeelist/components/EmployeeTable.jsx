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
        <col style={{ width: "200px" }} />    {/* Employee */}
        <col style={{ width: "200px" }} />    {/* Dept & Loc */}
        <col style={{ width: "120px" }} />    {/* workMode */}
        <col style={{ width: "260px" }} />    {/* Email */}
        <col style={{ width: "160px" }} />    {/* Employment Status */}
        <col style={{ width: "260px" }} />    {/* ⭐ Designation (extended) */}
        <col style={{ width: "180px" }} />    {/* Manager */}
        <col style={{ width: "140px" }} />    {/* DOJ */}
        <col style={{ width: "120px" }} />    {/* EmployeeType*/}
        <col style={{ width: "120px" }} />    {/* Experience */}
      </colgroup>

      <thead style={{ background: "#f6f7fb", textAlign: "left" }}>
        <tr>
          <th>Employee</th>
          <th>Dept & Loc</th>
          <th>workMode</th>
          <th>Email</th>
          <th>Employment Status</th>
          <th>Designation</th>
          <th>Manager</th>
          <th>DOJ</th>
          <th>EmployeeType</th>
          <th>Experience</th>
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
