import React, { useState, useMemo, useEffect, useRef } from "react";
import Tree from "react-d3-tree";
import { jwtDecode } from "jwt-decode";
import Button  from "../../../components/Button/Button";

/* ---------------- AVATAR HELPERS ---------------- */

const palette = [
  "#4F46E5", // Indigo 600
  "#0ea5e9", // Sky 500
  "#10b981", // Emerald 500
  "#f59e0b", // Amber 500
  "#ef4444", // Red 500
  "#8b5cf6", // Violet 500
  "#ec4899", // Pink 500
  "#14b8a6", // Teal 500
];

const getColor = (name = "") => {

  if (!name) {
    return palette[0];
  }

  let hash = 0;

  for (let i = 0; i < name.length; i++) {
    hash += name.charCodeAt(i);
  }

  return palette[
    Math.abs(hash) % palette.length
  ];
};

const getInitials = (name = "") => {

  if (!name) {
    return "NA";
  }

  return name
    .split(" ")
    .map((n) => n?.[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
};



/* ---------------- TREE CREATION ---------------- */
const createNode = (employee) => ({
  name: employee.name,
  employee_id: employee.employee_id,
  attributes: {
    designation: employee.designation,
    department: employee.department,
    location: employee.location || "Hyderabad",
  },
  children: employee.children || [],
  _collapsed: true,
});

const createOrgTree = (manager, employees) => {

  return {
    name: manager?.name || "Organization",
    employee_id: manager?.employee_id,
    attributes: {
      designation: manager?.designation || "",
      department: manager?.department || "",
      location: manager?.location || "",
    },
    children: Array.isArray(employees)
  ? employees.map(createNode)
  : [],
  };
};


const filterDepartmentEmployees = (
  employees,
  department
) => {

  return employees.filter(
    (employee) =>
      employee.department === department
  );
};

const filterEmployeesBySearch = (
  node,
  search
) => {

  if (!node) return null;

  const searchText =
    search.toLowerCase();

  const matches =
    node.name
      ?.toLowerCase()
      .includes(searchText);

  const filteredChildren =
    node.children
      ?.map((child) =>
        filterEmployeesBySearch(
          child,
          search
        )
      )
      .filter(Boolean) || [];

  if (
    matches ||
    filteredChildren.length > 0
  ) {
    return {
      ...node,
      children: filteredChildren,
    };
  }

  return null;

};

const groupEmployeesByDepartment = (
  employees
) => {

  const grouped = {};

  employees.forEach((employee) => {

    const dept =
      employee.department ||
      "Others";

    if (!grouped[dept]) {
      grouped[dept] = [];
    }

    grouped[dept].push(employee);
  });

  return Object.keys(grouped).map(
    (department) => ({

      name: department,

      employee_id: department,

      attributes: {
        designation: "Department",
        department,
        location: "Hyderabad",
      },

      children:
        grouped[department].map(
          createNode
        ),
    })
  );
};

/* ---------------- EXPAND PATH ---------------- */

const expandPath = (node, targetName) => {
  if (!node.children) return false;

  let found = false;

  node.children.forEach((child) => {
    const childFound =
      child.name === targetName || expandPath(child, targetName);
    if (childFound) {
      child.__rd3t = { collapsed: false };
      found = true;
    }
  });

  return found;
};

/* ---------------- CUSTOM NODE ---------------- */

const CardNode = ({ nodeDatum, toggleNode, onExpand }) => {
  const hasChildren = !!nodeDatum.children?.length;

  return (
    <g>
      <foreignObject x="-140" y="-60" width="280" height="120">
        <div
          onClick={() => {

            if (
              !nodeDatum.children?.length
            ) {

              onExpand(nodeDatum);
            }

            toggleNode();
          }}
          className="w-full h-full bg-white rounded-xl border border-slate-200 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] hover:shadow-lg cursor-pointer flex flex-col p-4 relative overflow-hidden group transition-all duration-300 transform hover:-translate-y-0.5"
        >
          {/* Top colored edge accent */}
          <div
            className="absolute top-0 left-0 right-0 h-1.5 transition-colors group-hover:h-2 duration-300"
            style={{ backgroundColor: getColor(nodeDatum.name) }}
          />

          <div className="flex items-start gap-4 h-full relative z-10 top-0.5">
            <div
              className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-slate-50 relative top-1"
              style={{ backgroundColor: getColor(nodeDatum.name) }}
            >
              {getInitials(nodeDatum.name)}
            </div>

            <div className="flex-1 min-w-0 flex flex-col pt-0.5">
              <h3 className="text-[15px] font-bold text-slate-800 truncate tracking-tight">
                {nodeDatum.name}
              </h3>
              <p className="text-[13px] font-medium text-slate-500 truncate mt-0.5">
                {nodeDatum.attributes?.designation}
              </p>

              <div className="flex items-center gap-2 mt-auto mb-1 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold tracking-wider uppercase border border-slate-200/60 truncate max-w-full">
                  {nodeDatum.attributes?.department}
                </span>
                
                <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium ml-auto">
                  <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{nodeDatum.attributes?.location?.split(' ')[0]}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </foreignObject>

      {/* Expand/Collapse Handle */}
      {hasChildren && (
        <g onClick={toggleNode} className="cursor-pointer group" transform="translate(0, 60)">
          <circle r="12" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" className="group-hover:stroke-indigo-400 group-hover:shadow-lg transition-colors duration-300" />
          {nodeDatum.__rd3t?.collapsed ? (
            <path d="M -4 0 L 4 0 M 0 -4 L 0 4" stroke="#64748b" strokeWidth="2" strokeLinecap="round" className="group-hover:stroke-indigo-600 transition-colors" />
          ) : (
            <path d="M -4 0 L 4 0" stroke="#64748b" strokeWidth="2" strokeLinecap="round" className="group-hover:stroke-indigo-600 transition-colors" />
          )}
        </g>
      )}
    </g>
  );
};

/* ---------------- MAIN COMPONENT ---------------- */

export default function OrganizationTree() {
  const treeContainer = useRef(null);
  const [manager, setManager] = useState(null);
  const [treeData, setTreeData] = useState(null);
  const [groupByDepartment, setGroupByDepartment] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [translate, setTranslate] = useState({ x: 600, y: 120 });
  const [searchValue, setSearchValue] = useState("");
  const [employees, setEmployees] =useState([]);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const employeeUuid = localStorage.getItem("employee_id")|| "5100025";
  const token = localStorage.getItem("token");
  const decodedToken = token ? jwtDecode(token) : null;
  const [viewMode, setViewMode] = useState("full");


 const fetchHierarchy = async (employeeId) => {
  try {

    const response = await fetch(
      `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/api/hr/organization-hierarchy/${employeeId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    return await response.json();

  } catch (error) {

    console.error(
      "Hierarchy fetch failed",
      error
    );

    return null;
  }
};

const updateNodeChildren = (
  node,
  targetEmployeeId,
  children
) => {

  if (
    node.employee_id === targetEmployeeId
  ) {

    return {
      ...node,
      children,
      _collapsed: false,
    };
  }

  if (!node.children) {
    return node;
  }

  return {
    ...node,
    children: node.children.map((child) =>
      updateNodeChildren(
        child,
        targetEmployeeId,
        children
      )
    ),
  };
};

const handleExpand = async (node) => {

  if (
    node.children &&
    node.children.length > 0
  ) {
    return;
  }

  const data = await fetchHierarchy(
    node.employee_id
  );

  if (!data) return;

 const childNodes =
  Array.isArray(data.employees)
    ? data.employees.map(createNode)
    : [];

  setTreeData((prevTree) =>
    updateNodeChildren(
      prevTree,
      node.employee_id,
      childNodes
    )
  );
};

const loadInitialHierarchy = async () => {
console.log("employeeUuid", employeeUuid);
  const data = await fetchHierarchy(
    employeeUuid
  );
 
  if (!data) return;
 setManager(data.manager);
const loggedEmployeeData =
  await fetchHierarchy(
    decodedToken?.employee_id
  );

const loggedEmployee = {
  name: decodedToken?.name,

  employee_id:
    decodedToken?.employee_id,

  designation:
    loggedEmployeeData?.manager
      ?.designation || "",

  department:
    loggedEmployeeData?.manager
      ?.department || "",

  location:
    loggedEmployeeData?.manager
      ?.location || "",
};

setCurrentEmployee(
  loggedEmployee
);


setEmployees([
  data.manager,
  ...(data.employees || [])
]);

  const fullTree = createOrgTree(
  data.manager,
  data.employees
);

setTreeData(fullTree);
};

  const animateZoom = (targetZoom) => {
    const step = (targetZoom - zoom) / 15;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setZoom((z) => z + step);
      if (i >= 15) clearInterval(interval);
    }, 16);
  };

  const focusNode = (name) => {
    const width = treeContainer.current.offsetWidth;
    const height = treeContainer.current.offsetHeight;

  if (treeData) {
  expandPath(treeData, name);
}

    animateZoom(1.1);

    setTranslate({
      x: width / 2,
      y: height / 4,
    });
  };
useEffect(() => {

  loadInitialHierarchy();

}, []);

  useEffect(() => {
    if (treeContainer.current) {
      const width = treeContainer.current.offsetWidth;
      setTranslate({ x: width / 2, y: 120 });
    }
  }, []);
  useEffect(() => {

  if (!manager) return;

  if (!searchValue.trim()) {

    loadInitialHierarchy();

    return;
  }



  const filteredTree =
    filterEmployeesBySearch(
      treeData,
      searchValue
    );

  setTreeData(filteredTree);

}, [searchValue]);
 useEffect(() => {

  if (!manager || !employees.length) {
    return;
  }

  if (groupByDepartment) {

    const groupedDepartments = {};

    employees.forEach((employee) => {

      const department =
        employee.department ||
        "Others";

      if (
        !groupedDepartments[
          department
        ]
      ) {

        groupedDepartments[
          department
        ] = [];
      }

      groupedDepartments[
        department
      ].push(employee);
    });

    const groupedTree = {
      name: manager.name,

      employee_id:
        manager.employee_id,

      attributes: {
        designation:
          manager.designation,

        department:
          manager.department,

        location:
          manager.location,
      },

      children:
        Object.entries(
          groupedDepartments
        ).map(
          ([department, emps]) => ({

            name: department,

            employee_id:
              department,

            attributes: {
              designation:
                "Department",

              department,

              location:
                "Hyderabad",
            },

            children:
              emps.map(
                createNode
              ),
          })
        ),
    };

    setTreeData(groupedTree);

  } else {

    const normalTree =
      createOrgTree(
        manager,
        employees.filter(
          (emp) =>
            emp.employee_id !==
            manager.employee_id
        )
      );

    setTreeData(normalTree);
  }

}, [
  groupByDepartment,
  employees,
  manager
]);
  return (
    <div className="w-full h-screen flex flex-col bg-[#f8fafc] font-sans antialiased text-slate-800">
      <style>
        {`
          .rd3t-link {
            stroke: #cbd5e1 !important; 
            stroke-width: 2px !important;
            transition: all 0.3s ease;
          }
          .rd3t-link:hover {
            stroke: #94a3b8 !important;
            stroke-width: 3px !important;
          }
        `}
      </style>

      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap gap-4 items-center justify-between z-10 relative shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <svg className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
                type="text"
                value={searchValue}
                onChange={(e) =>
                  setSearchValue(e.target.value)
                }
                placeholder="Search employee directory..."
                className="bg-slate-50 text-slate-900 placeholder-slate-400
                pl-11 pr-4 py-2.5 rounded-xl w-64 md:w-80 outline-none border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 focus:bg-white transition-all shadow-sm font-medium text-sm"
              />
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-5 flex-wrap">
         
          <Button
              variant="outline"
              size="medium"
              className="rounded-xl"
            onClick={async () => {

              setViewMode("department");

              const loggedEmployee =
                currentEmployee;

              if (!loggedEmployee) {
                return;
              }

              const data =
                await fetchHierarchy(
                  employeeUuid
                );

              const filteredEmployees = [
                data.manager,
                ...(data.employees || [])
              ].filter(
                (employee) =>
                  employee.department ===
                  loggedEmployee.department
              );

              setTreeData({
                name:
                  loggedEmployee.department,

                employee_id: "department",

                attributes: {
                  designation: "Department",

                  department:
                    loggedEmployee.department,

                  location: "Hyderabad",
                },

                children:
                  filteredEmployees.map(
                    createNode
                  ),
              });

              animateZoom(1);
            }}
          >
            My Department
          </Button>
          

          <Button variant="outline"
            onClick={() => {

              setViewMode("top");

              setTreeData({
                name: manager?.name,
                employee_id:
                  manager?.employee_id,
                attributes: {
                  designation:
                    manager?.designation,
                  department:
                    manager?.department,
                  location:
                    manager?.location,
                },
                children: [],
              });

              animateZoom(1);
            }}
            className="px-4 py-2.5 bg-indigo-50 text-indigo-700 text-sm font-bold rounded-xl hover:bg-indigo-100 hover:text-indigo-800 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-200 border border-indigo-100"
          >
            Top of Org
          </Button>
          
       
          <Button variant="primary"
              onClick={() => {

                setViewMode("me");

                setTreeData({
                  name:
                    decodedToken?.name ||
                    "Employee",

                  employee_id:
                    decodedToken?.employee_id,

                  attributes: {
                    designation:
                      currentEmployee?.designation ||
                      "",

                    department:
                      currentEmployee?.department ||
                      "",

                    location:
                      currentEmployee?.location ||
                      "",
                  },

                  children: [],
                });

                animateZoom(1);
              }}
              className="px-4 py-2.5 bg-slate-900 border border-slate-900 text-white text-sm font-semibold rounded-xl shadow-[0_4px_12px_rgba(15,23,42,0.2)] hover:bg-slate-800 hover:border-slate-800 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
            >
              Me
          </Button>

          <div className="hidden md:block w-px h-8 bg-slate-200 mx-1"></div>

          <label className="flex items-center gap-3 cursor-pointer group select-none ml-2">
            <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">Group by Dept</span>
            <div className="relative">
              <input 
                type="checkbox" 
                checked={groupByDepartment}
                onChange={() => setGroupByDepartment(!groupByDepartment)}
                className="sr-only" 
              />
              <div className={`block w-12 h-7 rounded-full transition-colors duration-300 ${groupByDepartment ? 'bg-indigo-600' : 'bg-slate-300 group-hover:bg-slate-400'}`}></div>
              <div className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform transform duration-300 shadow-sm ${groupByDepartment ? 'translate-x-[20px]' : ''}`}></div>
            </div>
          </label>
        </div>
      </div>

      {/* TREE AREA */}
      <div
        ref={treeContainer}
        className="flex-1 relative flex justify-center items-start overflow-hidden isolate"
      >
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:32px_32px] opacity-40 mix-blend-multiply z-[-1]"></div>

      {treeData?.name && (
        <Tree
          data={treeData}
          orientation="vertical"
          translate={translate}
          zoom={zoom}
          collapsible
          zoomable
          nodeSize={{ x: 340, y: 180 }}
          separation={{ siblings: 1.1, nonSiblings: 1.4 }}
          pathFunc="step"
          transitionDuration={400}
          enableLegacyTransitions={true}
         renderCustomNodeElement={(props) => (
          <CardNode
            {...props}
            onExpand={handleExpand}
          />
        )}
        />
      )}

        {/* RIGHT SIDE ZOOM CONTROLS */}
        <div className="absolute right-8 top-8 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex flex-col overflow-hidden z-10 transition-shadow hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <button
            onClick={() => animateZoom(zoom + 0.2)}
            className="p-3.5 border-b border-slate-100 hover:bg-slate-50 text-slate-500 hover:text-indigo-600 transition-colors group relative"
            title="Zoom In"
          >
            <svg className="w-5 h-5 group-active:scale-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          </button>
          <button
            onClick={() => animateZoom(zoom - 0.2)}
            className="p-3.5 border-b border-slate-100 hover:bg-slate-50 text-slate-500 hover:text-indigo-600 transition-colors group relative"
            title="Zoom Out"
          >
            <svg className="w-5 h-5 group-active:scale-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" /></svg>
          </button>
          <button
            onClick={() => animateZoom(1)}
            className="p-3.5 hover:bg-slate-50 text-slate-500 hover:text-indigo-600 transition-colors group relative"
            title="Reset View"
          >
            <svg className="w-5 h-5 group-active:scale-90 group-hover:-rotate-90 duration-500 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
