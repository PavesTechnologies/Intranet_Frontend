import { useState, useRef, useEffect } from "react";

 export default function FiltersBar({
  department,
  setDepartment,
  status,
  setStatus,
  locations = [],
  setLocations,
  locationOptions = [],
  departments = []
}){
  const filtersConfig = [
  {
    key: "dept",
    label: "Department",
    options: ["All", ...(departments || [])],
  },
   {
      key: "location",
      label: "All Locations",
      options: ["All", ...(locationOptions || [])],
    },
  {
    key: "date",
    label: "Date Range",
    options: ["Today", "This Month", "This Year"],
  },
  {
    key: "worker",
    label: "Worker Type",
    options: ["All", "Permanent", "Contract"],
  },
];

  const [openKey, setOpenKey] = useState(null);
  const containerRef = useRef();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!containerRef.current?.contains(e.target)) {
        setOpenKey(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = (key) => {
    setOpenKey(openKey === key ? null : key);
  };

 const handleLocationSelect = (loc) => {
  const safeLocations = locations || [];

  if (loc === "All") {
    setLocations([]);
    setOpenKey(null);
    return;
  }

  if (safeLocations.includes(loc)) {
    setLocations(safeLocations.filter((l) => l !== loc));
  } else {
    setLocations([...safeLocations, loc]);
  }
};
  // 🔹 Single select for department & status
  const handleSingleSelect = (key, value) => {
    if (key === "department") {
      setDepartment(value === "All" ? "" : value);
    } else if (key === "status") {
      setStatus(value === "All" ? "" : value);
    }

    setOpenKey(null);
  };
  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        gap: 12,
        margin: "20px 0",
        flexWrap: "wrap",
      }}
    >
      {filtersConfig.map((filter) => (
        <div key={filter.key} style={{ position: "relative" }}>
          {/* Filter Box */}
          <div
            onClick={() => toggleDropdown(filter.key)}
            style={{
              background: "#fff",
              padding: "10px 14px",
              borderRadius: 6,
              border: "1px solid #e2e6ea",
              minWidth: 170,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            <span>
               {filter.key === "dept"
            ? department || filter.label
            : filter.key === "location"
            ? locations && locations.length > 0
              ? locations.join(", ")
              : filter.label
            : filter.label}
            </span>
            <span style={{ fontSize: 12 }}>▾</span>
          </div>

          {/* Dropdown */}
          {openKey === filter.key && (
            <div
              style={{
                position: "absolute",
                top: "105%",
                left: 0,
                width: "100%",
                background: "#fff",
                border: "1px solid #e2e6ea",
                borderRadius: 6,
                boxShadow: "0 3px 8px rgba(0,0,0,0.08)",
                zIndex: 100,
                maxHeight: 180,
                overflowY: "auto",
              }}
            >
              {filter.options.map((opt, i) => (
                <div
                  key={i}
                  onClick={() => {
                  if (filter.key === "location") {
                    handleLocationSelect(opt);
                  } else if (filter.key === "dept") {
                    handleSingleSelect("department", opt);
                  }
                }}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontSize: 14,
                    borderBottom:
                      i !== filter.options.length - 1
                        ? "1px solid #f0f0f0"
                        : "none",
                  }}
                  onMouseEnter={(e) =>
                    (e.target.style.background = "#f6f7fb")
                  }
                  onMouseLeave={(e) =>
                    (e.target.style.background = "white")
                  }
                >
                  {opt}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
