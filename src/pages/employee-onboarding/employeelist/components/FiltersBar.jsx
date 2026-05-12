import FilterListbox from "../../../../components/filter/FilterListbox";

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
      <FilterListbox
        options={[{value:"",label:"All Departments"},{value:"Engineering",label:"Engineering"},{value:"Human Resources",label:"Human Resources"}]}
        value={department}
        onChange={setDepartment}
      />

      {/* Location */}
      <FilterListbox
        options={[{value:"",label:"All Locations"}, ...locationOptions.map((loc) => ({value: loc, label: loc}))]}
        value={locations[0] || ""}
        onChange={(val) => setLocations([val])}
      />
    </div>
  );
}

const selectStyle = {
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid #ddd",
  fontSize: 13,
};
