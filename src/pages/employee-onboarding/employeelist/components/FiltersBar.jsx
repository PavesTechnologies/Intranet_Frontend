export default function FiltersBar({
  department,
  setDepartment,
  locations,
  setLocations,
  locationOptions,
}) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      {/* Department */}
      <select
        value={department}
        onChange={(e) => setDepartment(e.target.value)}
        style={selectStyle}
      >
        <option value="">All Departments</option>
        <option>Engineering</option>
        <option>Human Resources</option>
      </select>


      {/* Location */}
      <select
        value={location}
        onChange={
          (e) => setLocations([e.target.value])
        }  
        style={selectStyle}
      >
        <option value="">All Locations</option>
        {locationOptions.map((loc) => (
          <option key={loc}>{loc}</option>
        ))}
      </select>
    </div>
  );
}

const selectStyle = {
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid #ddd",
  fontSize: 13,
};
