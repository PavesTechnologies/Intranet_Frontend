import React, { useState } from "react";

export default function EmployeeCredentialsPage() {
  const roles = ["EMPLOYEE", "MANAGER", "HR", "ADMIN"];
  const deptMap = {
    Engineering: "ENG",
    HR: "HR",
    Finance: "FIN",
    Sales: "SAL",
    IT: "IT",
  };

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    department: "",
    designation: "",
    role: "EMPLOYEE",
  });

  const [preview, setPreview] = useState(null);
  const [history, setHistory] = useState([]);

  // Generate credentials
  const handleGenerate = () => {
    if (!form.firstName || !form.department) {
      alert("First Name & Department required");
      return;
    }

    const year = new Date().getFullYear();
    const seq = Math.floor(1000 + Math.random() * 9000);
    const prefix = deptMap[form.department] || "EMP";

    const empId = `${prefix}${year}${seq}`;
    const email = `${form.firstName.toLowerCase()}.${form.lastName.toLowerCase()}@company.com`;
    const tempPass = Math.random().toString(36).slice(-8);

    setPreview({ empId, email, tempPass });
  };

  // Create → store directly in table (same as your previous)
  const handleCreate = () => {
    if (!preview) return;

    const newEmployee = {
      empId: preview.empId,
      name: `${form.firstName} ${form.lastName}`,
      email: preview.email,
      department: form.department,
      role: form.role,
      tempPass: preview.tempPass,
      createdAt: new Date().toLocaleString(),
    };

    setHistory([newEmployee, ...history]);
    resetForm();
  };

  // Edit preview → load back to form
  const handleEdit = () => {
    const [firstName, lastName] = `${form.firstName} ${form.lastName}`.split(" ");
    setForm({ ...form, firstName, lastName });
  };

  // Delete preview → clear generated data
  const handleDelete = () => {
    setPreview(null);
  };

  const resetForm = () => {
    setForm({
      firstName: "",
      lastName: "",
      department: "",
      designation: "",
      role: "EMPLOYEE",
    });
    setPreview(null);
  };

  return (
    <div style={styles.page}>

      {/* HEADER */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-4xl font-semibold text-gray-900">
            Employee Directory
          </h2>
          <p className="text-gray-500 text-sm">
            Manage and browse organizational talent.
          </p>
        </div>
        </div>

      {/* GENERATOR */}
      <div style={styles.card}>
        <h3 className="text-3xl font-semibold text-gray-700">Credentials Generator</h3>

        <div style={styles.grid}>
          <input
            placeholder="First Name *"
            value={form.firstName}
            onChange={(e) =>
              setForm({ ...form, firstName: e.target.value })
            }
          />

          <input
            placeholder="Last Name"
            value={form.lastName}
            onChange={(e) =>
              setForm({ ...form, lastName: e.target.value })
            }
          />

          <select
            value={form.department}
            onChange={(e) =>
              setForm({ ...form, department: e.target.value })
            }
          >
            <option value="">Select Department *</option>
            {Object.keys(deptMap).map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>

          <input
            placeholder="Designation"
            value={form.designation}
            onChange={(e) =>
              setForm({ ...form, designation: e.target.value })
            }
          />

          <select
            value={form.role}
            onChange={(e) =>
              setForm({ ...form, role: e.target.value })
            }
          >
            {roles.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>

        <button style={styles.primary} onClick={handleGenerate}>
          Generate Credentials
        </button>

        {/* PREVIEW SECTION */}
        {preview && (
          <div style={styles.preview}>
            <p><b>Employee ID:</b> {preview.empId}</p>
            <p><b>Email:</b> {preview.email}</p>
            <p><b>Temp Password:</b> {preview.tempPass}</p>

            <div style={styles.btnRow}>
              <button style={styles.createBtn} onClick={handleCreate}>
                Create
              </button>
              <button style={styles.editBtn} onClick={handleEdit}>
                Edit
              </button>
              <button style={styles.deleteBtn} onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* HISTORY TABLE */}
      <div style={styles.card}>
        <h3 className="text-3xl font-semibold text-gray-700">Credentials History</h3>

        {history.length === 0 ? (
          <p style={{ color: "#777" }}>No records yet</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Emp ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Dept</th>
                <th>Role</th>
                <th>Password</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {history.map((e, i) => (
                <tr key={i}>
                  <td>{e.empId}</td>
                  <td>{e.name}</td>
                  <td>{e.email}</td>
                  <td>{e.department}</td>
                  <td>{e.role}</td>
                  <td>{e.tempPass}</td>
                  <td>{e.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { width: "95%", margin: "20px auto", fontFamily: "Arial" },
  header: { borderBottom: "2px solid #1976d2", marginBottom: 20, paddingBottom: 8 },
  card: { border: "1px solid #ddd", borderRadius: 8, padding: 16, marginBottom: 20 },
  grid: { display: "grid", gap: 10, marginBottom: 10 },
  preview: { background: "#f5f7fb", padding: 10, borderRadius: 6, marginTop: 10 },
  btnRow: { display: "flex", gap: 8, marginTop: 10 },
  primary: { width: "100%", padding: 10, background: "#1976d2", color: "#fff", border: "none", borderRadius: 5 },
  createBtn: { flex: 1, padding: 8, background: "green", color: "#fff", border: "none", borderRadius: 5 },
  editBtn: { flex: 1, padding: 8, background: "#ff9800", color: "#fff", border: "none", borderRadius: 5 },
  deleteBtn: { flex: 1, padding: 8, background: "#e53935", color: "#fff", border: "none", borderRadius: 5 },
  table: { width: "100%", borderCollapse: "collapse" },
};


// import React, { useState } from "react";

// export default function EmployeeCredentialsPage() {
//   const roles = ["EMPLOYEE", "MANAGER", "HR", "ADMIN"];
//   const deptMap = {
//     Engineering: "ENG",
//     HR: "HR",
//     Finance: "FIN",
//     Sales: "SAL",
//     IT: "IT",
//   };

//   const [form, setForm] = useState({
//     firstName: "",
//     lastName: "",
//     department: "",
//     designation: "",
//     role: "EMPLOYEE",
//   });

//   const [preview, setPreview] = useState(null);
//   const [history, setHistory] = useState([]);

//   // Generate credentials
//   const handleGenerate = () => {
//     if (!form.firstName || !form.department) {
//       alert("First Name & Department required");
//       return;
//     }

//     const year = new Date().getFullYear();
//     const seq = Math.floor(1000 + Math.random() * 9000);
//     const prefix = deptMap[form.department] || "EMP";

//     const empId = `${prefix}${year}${seq}`;
//     const email = `${form.firstName.toLowerCase()}.${form.lastName.toLowerCase()}@company.com`;
//     const tempPass = Math.random().toString(36).slice(-8);

//     setPreview({ empId, email, tempPass });
//   };

//   // Create employee → store in history
//   const handleCreate = () => {
//     if (!preview) return;

//     const newEmployee = {
//       empId: preview.empId,
//       name: `${form.firstName} ${form.lastName}`,
//       email: preview.email,
//       department: form.department,
//       role: form.role,
//       tempPass: preview.tempPass,
//       createdAt: new Date().toLocaleString(),
//     };

//     setHistory([newEmployee, ...history]);

//     // Reset form only
//     setForm({
//       firstName: "",
//       lastName: "",
//       department: "",
//       designation: "",
//       role: "EMPLOYEE",
//     });
//     setPreview(null);
//   };

//   return (
//     <div style={styles.page}>

//       {/* ================= HEADER ================= */}
//       <div className="flex">
//         <div>
//           <h2 className="text-4xl font-semibold text-gray-900">
//             Employee Directory
//           </h2>
//           <p className="text-gray-500 text-sm">
//             Manage and browse organizational talent.
//           </p>
//         </div>
//         </div>

//       {/* ================= GENERATOR ================= */}
//       <div style={styles.card}>
//         <h3>Credentials Generator</h3>

//         <div style={styles.grid}>
//           <input
//             placeholder="First Name *"
//             value={form.firstName}
//             onChange={(e) =>
//               setForm({ ...form, firstName: e.target.value })
//             }
//           />

//           <input
//             placeholder="Last Name"
//             value={form.lastName}
//             onChange={(e) =>
//               setForm({ ...form, lastName: e.target.value })
//             }
//           />

//           <select
//             value={form.department}
//             onChange={(e) =>
//               setForm({ ...form, department: e.target.value })
//             }
//           >
//             <option value="">Select Department *</option>
//             {Object.keys(deptMap).map((d) => (
//               <option key={d}>{d}</option>
//             ))}
//           </select>

//           <input
//             placeholder="Designation"
//             value={form.designation}
//             onChange={(e) =>
//               setForm({ ...form, designation: e.target.value })
//             }
//           />

//           <select
//             value={form.role}
//             onChange={(e) =>
//               setForm({ ...form, role: e.target.value })
//             }
//           >
//             {roles.map((r) => (
//               <option key={r}>{r}</option>
//             ))}
//           </select>
//         </div>

//         <button style={styles.primary} onClick={handleGenerate}>
//           Generate Credentials
//         </button>

//         {/* Preview */}
//         {preview && (
//           <div style={styles.preview}>
//             <p><b>Employee ID:</b> {preview.empId}</p>
//             <p><b>Email:</b> {preview.email}</p>
//             <p><b>Temp Password:</b> {preview.tempPass}</p>

//             <button style={styles.createBtn} onClick={handleCreate}>
//               Create Employee
//             </button>
//           </div>
//         )}
//       </div>

//       {/* ================= HISTORY ================= */}
//       <div style={styles.card}>
//         <h3>Credentials History</h3>

//         {history.length === 0 ? (
//           <p style={{ color: "#777" }}>No credentials generated yet</p>
//         ) : (
//           <table style={styles.table}>
//             <thead>
//               <tr>
//                 <th>Emp ID</th>
//                 <th>Name</th>
//                 <th>Email</th>
//                 <th>Dept</th>
//                 <th>Role</th>
//                 <th>Temp Pass</th>
//                 <th>Created</th>
//               </tr>
//             </thead>
//             <tbody>
//               {history.map((e, i) => (
//                 <tr key={i}>
//                   <td>{e.empId}</td>
//                   <td>{e.name}</td>
//                   <td>{e.email}</td>
//                   <td>{e.department}</td>
//                   <td>{e.role}</td>
//                   <td>{e.tempPass}</td>
//                   <td>{e.createdAt}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         )}
//       </div>
//     </div>
//   );
// }

// const styles = {
//   page: { maxWidth: 900, margin: "30px auto", fontFamily: "Arial" },

//   header: {
//     marginBottom: 20,
//     paddingBottom: 10,
//     borderBottom: "2px solid #1976d2",
//   },

//   card: {
//     border: "1px solid #ddd",
//     borderRadius: 8,
//     padding: 15,
//     marginBottom: 20,
//     background: "#fff",
//   },

//   grid: {
//     display: "grid",
//     gap: 10,
//     marginBottom: 10,
//   },

//   preview: {
//     marginTop: 10,
//     padding: 10,
//     background: "#f5f7fb",
//     borderRadius: 6,
//   },

//   primary: {
//     width: "100%",
//     padding: 10,
//     background: "#1976d2",
//     color: "#fff",
//     border: "none",
//     borderRadius: 5,
//   },

//   createBtn: {
//     width: "100%",
//     padding: 10,
//     marginTop: 8,
//     background: "green",
//     color: "#fff",
//     border: "none",
//     borderRadius: 5,
//   },

//   table: {
//     width: "100%",
//     borderCollapse: "collapse",
//   },
// };


