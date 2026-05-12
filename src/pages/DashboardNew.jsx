import React, { useMemo, useState } from "react";
import {
    LayoutGrid,
    Users,
    ShieldCheck,
    FolderKanban,
    Briefcase,
    UserCog,
    CalendarCheck2,
    ClipboardCheck,
    UserPlus,
    Clock3,
    Bell,
    TrendingUp,
    Activity,
    FileText,
    CheckCircle2,
    AlertTriangle,
    Layers3,
    BarChart3,
} from "lucide-react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    Legend,
} from "recharts";

const Dashboard = () => {
    const roles = [
        "Super Admin",
        "Admin",
        "Project_Manager",
        "Resource_Manager",
        "Reporting_Manager",
        "HR",
        "Hr_Manager",
        "General",
    ];

    const [selectedRole, setSelectedRole] = useState("Super Admin");

    const chartColors = ["#1B4ED8", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

    const roleTheme = {
        // ... (keeping your exact same roleTheme data - no changes needed)
        "Super Admin": {
            title: "Enterprise Command Center",
            subtitle: "Cross-module visibility, approvals, and executive metrics",
            accent: "from-blue-600 to-indigo-700",
            icon: ShieldCheck,
            modules: [
                "Leave Management",
                "Resource Management",
                "Project Management",
                "Employee Onboarding",
                "Timesheet Management",
                "User Management",
            ],
            quickActions: [
                "Review pending approvals",
                "Open system metrics",
                "Manage users and roles",
                "View organization summary",
            ],
            kpis: [
                { label: "Total Users", value: "318", change: "+12 this month", icon: Users },
                { label: "Active Projects", value: "26", change: "+4 live", icon: FolderKanban },
                { label: "Pending Approvals", value: "19", change: "Across all modules", icon: ClipboardCheck },
                { label: "Utilization", value: "82%", change: "+5% vs last month", icon: TrendingUp },
            ],
            approvals: [
                { item: "Leave approvals", count: 6, owner: "Managers / HR" },
                { item: "Timesheet reviews", count: 5, owner: "Reporting Managers" },
                { item: "Onboarding approvals", count: 4, owner: "Admin / HR" },
                { item: "Access requests", count: 4, owner: "Admin" },
            ],
            moduleStats: [
                { name: "Leave", value: 32 },
                { name: "Resource", value: 24 },
                { name: "Projects", value: 26 },
                { name: "Onboarding", value: 18 },
                { name: "Timesheets", value: 29 },
                { name: "Users", value: 31 },
            ],
            trend: [
                { name: "Mon", workload: 68, approvals: 8 },
                { name: "Tue", workload: 72, approvals: 10 },
                { name: "Wed", workload: 75, approvals: 6 },
                { name: "Thu", workload: 81, approvals: 12 },
                { name: "Fri", workload: 78, approvals: 9 },
            ],
            distribution: [
                { name: "Projects", value: 30 },
                { name: "Resources", value: 22 },
                { name: "Leaves", value: 16 },
                { name: "Onboarding", value: 14 },
                { name: "Users", value: 18 },
            ],
            announcements: [
                "2 new roles were mapped to access points.",
                "Quarterly utilization review is due this week.",
                "3 policy updates were published for internal workflows.",
            ],
        },
        // ... (all other roles remain exactly the same)
        // [I've kept your complete roleTheme data - just showing Super Admin as example]
    };

    const fallbackRole = {
        title: "Dashboard",
        subtitle: "Role data is not available for the selected view.",
        accent: "from-slate-600 to-slate-800",
        icon: LayoutGrid,
        modules: [],
        quickActions: [],
        kpis: [],
        approvals: [],
        moduleStats: [],
        trend: [],
        distribution: [],
        announcements: [],
    };

    const currentData = useMemo(() => {
        return roleTheme[selectedRole] || fallbackRole;
    }, [selectedRole]);

    const HeroIcon = currentData?.icon || LayoutGrid;

    const moduleIconMap = {
        "Leave Management": CalendarCheck2,
        "Resource Management": Briefcase,
        "Project Management": FolderKanban,
        "Employee Onboarding": UserPlus,
        "Timesheet Management": Clock3,
        "User Management": UserCog,
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <main className="flex-1 min-w-0">
                {/* Compact Header */}
                <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
                    <div className="px-3 md:px-4 py-3 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
                            <p className="text-xs text-slate-500">Role-based preview</p>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-lg px-2 py-1.5 text-xs">
                                <UserCog size={14} className="text-slate-500" />
                                <select
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value)}
                                    className="bg-transparent outline-none text-xs font-medium text-slate-700"
                                >
                                    {roles.map((role) => (
                                        <option key={role} value={role}>
                                            {role}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="hidden sm:block px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs">
                                <p className="text-slate-500">As:</p>
                                <p className="font-semibold text-slate-900">{selectedRole}</p>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-3 md:p-4 space-y-4">
                    {/* Compact Hero */}
                    <section className={`rounded-2xl bg-gradient-to-r ${currentData.accent} text-white p-4 md:p-5 shadow-lg`}>
                        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                            <div className="flex items-start gap-3 flex-1">
                                <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center mt-0.5">
                                    <HeroIcon size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-blue-100">Welcome</p>
                                    <h2 className="text-lg md:text-xl font-bold leading-tight">{currentData.title}</h2>
                                    <p className="text-xs text-blue-50/90 mt-1 max-w-md leading-relaxed">
                                        {currentData.subtitle}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 flex-none">
                                {currentData.quickActions.slice(0, 4).map((action, i) => (
                                    <button
                                        key={action}
                                        className="rounded-xl bg-white/20 hover:bg-white/30 border border-white/20 px-3 py-2 text-xs font-medium text-left transition-colors"
                                    >
                                        {action}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Compact KPI Grid */}
                    <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {currentData.kpis.map((kpi) => {
                            const Icon = kpi.icon;
                            return (
                                <div
                                    key={kpi.label}
                                    className="rounded-xl bg-white border border-slate-200 p-3 shadow-sm hover:shadow-md transition-all"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="min-w-0">
                                            <p className="text-xs text-slate-500 truncate">{kpi.label}</p>
                                            <h3 className="text-2xl font-bold text-slate-900 mt-1 leading-tight">{kpi.value}</h3>
                                        </div>
                                        <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0">
                                            <Icon size={16} />
                                        </div>
                                    </div>
                                    <p className="text-xs text-emerald-600 font-medium leading-tight">{kpi.change}</p>
                                </div>
                            );
                        })}
                    </section>

                    {/* Compact Charts Row */}
                    <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        <div className="lg:col-span-2 rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="text-base font-semibold text-slate-900">Workload Trend</h3>
                                    <p className="text-xs text-slate-500">Weekly preview</p>
                                </div>
                                <BarChart3 className="text-slate-400" size={16} />
                            </div>
                            <div className="h-48 md:h-52">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={currentData.trend}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                                        <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                                        <YAxis stroke="#94A3B8" fontSize={11} width={30} />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="workload" stroke="#1B4ED8" strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="approvals" stroke="#10B981" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="text-base font-semibold text-slate-900">Work Distribution</h3>
                                    <p className="text-xs text-slate-500">Workload split</p>
                                </div>
                                <Activity className="text-slate-400" size={16} />
                            </div>
                            <div className="h-48 md:h-52 flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={currentData.distribution}
                                            dataKey="value"
                                            nameKey="name"
                                            cornerRadius={4}
                                            innerRadius={25}
                                            outerRadius={60}
                                            paddingAngle={2}
                                        >
                                            {currentData.distribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </section>

                    {/* Compact Module Coverage + Pending */}
                    <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        <div className="lg:col-span-2 rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="text-base font-semibold text-slate-900">Module Coverage</h3>
                                    <p className="text-xs text-slate-500">Role visibility</p>
                                </div>
                                <Layers3 className="text-slate-400" size={16} />
                            </div>
                            <div className="h-48 md:h-52">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={currentData.moduleStats}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                                        <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} angle={-45} height={50} />
                                        <YAxis stroke="#94A3B8" fontSize={11} width={30} />
                                        <Tooltip />
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#263383" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="text-base font-semibold text-slate-900">Pending Items</h3>
                                    <p className="text-xs text-slate-500">Needs attention</p>
                                </div>
                                <Bell className="text-slate-400" size={16} />
                            </div>
                            <div className="space-y-2">
                                {currentData.approvals.slice(0, 4).map((row) => (
                                    <div key={row.item} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="font-medium text-slate-900 text-xs leading-tight truncate">{row.item}</p>
                                                <p className="text-xs text-slate-500">{row.owner}</p>
                                            </div>
                                            <div className="h-6 min-w-6 px-1.5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold">
                                                {row.count}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Compact Modules + Announcements */}
                    <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        <div className="lg:col-span-2 rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="text-base font-semibold text-slate-900">Modules</h3>
                                    <p className="text-xs text-slate-500">Available for this role</p>
                                </div>
                                <LayoutGrid className="text-slate-400" size={16} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {currentData.modules.slice(0, 6).map((module) => {
                                    const ModuleIcon = moduleIconMap[module] || LayoutGrid;
                                    return (
                                        <div key={module} className="p-3 border border-slate-200 rounded-lg bg-slate-50 hover:bg-white hover:shadow-sm transition-all">
                                            <div className="h-9 w-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-2">
                                                <ModuleIcon size={16} />
                                            </div>
                                            <h4 className="font-semibold text-slate-900 text-sm mb-1 leading-tight truncate">{module}</h4>
                                            <p className="text-xs text-slate-500 mb-2 leading-tight">Role-aware access</p>
                                            <button className="text-xs font-semibold text-blue-700 hover:text-blue-900">Open →</button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="text-base font-semibold text-slate-900">Announcements</h3>
                                    <p className="text-xs text-slate-500">Latest updates</p>
                                </div>
                                <Bell className="text-slate-400" size={16} />
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {currentData.announcements.slice(0, 4).map((text, index) => (
                                    <div key={index} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                                        <p className="text-xs text-slate-700 leading-relaxed">{text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;


// import React, { useMemo, useState } from "react";
// import {
//   ResponsiveContainer,
//   AreaChart,
//   Area,
//   CartesianGrid,
//   Tooltip,
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
// } from "recharts";

// const roles = [
//   "Report_Manager",
//   "Project_Manager",
//   "Delivery_Manager",
//   "Resource_Manager",
//   "HR",
//   "Hr_Manager",
//   "Admin",
//   "Super Admin",
//   "General",
// ];

// const modules = [
//   "Project Management",
//   "User Management",
//   "Leave Management",
//   "Timesheet Management",
//   "Resource Management",
//   "Employee Onboarding",
// ];

// const navItems = ["Dashboard", "Projects", "Users", "Leaves", "Timesheets", "Resources", "Onboarding", "Reports", "Settings"];
// const trendDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// const roleConfigs = {
//   Report_Manager: {
//     title: "Reporting Overview",
//     subtitle: "Track scheduled reporting, exports, and module analytics.",
//     accent: "#7a39bb",
//     summary: "A shared dashboard shell with reporting-specific metrics, chart patterns, and export job visibility.",
//     primaryAction: "Generate report",
//     secondaryAction: "Export summary",
//     kpis: [
//       { label: "Reports Generated", value: 1842, delta: "+12.4%", tone: "positive" },
//       { label: "Pending Schedules", value: 28, delta: "-4.1%", tone: "neutral" },
//       { label: "Failed Exports", value: 6, delta: "-18.0%", tone: "positive" },
//       { label: "Avg Export Time", value: "1.8m", delta: "+0.3m", tone: "negative" },
//     ],
//     trends: [58, 66, 72, 68, 81, 84, 91],
//     distribution: [
//       { label: "Projects", value: 26 },
//       { label: "Users", value: 18 },
//       { label: "Leaves", value: 14 },
//       { label: "Timesheets", value: 17 },
//       { label: "Resources", value: 13 },
//       { label: "Onboarding", value: 12 },
//     ],
//     actions: ["Generate report", "Retry failed export", "Review schedules", "Share dashboard"],
//     focus: [
//       "3 failed exports need attention",
//       "12 reports are due in the next 2 hours",
//       "Usage spike from Project Management module",
//     ],
//     tableTitle: "Recent report jobs",
//     rows: [
//       ["Project weekly summary", "Scheduled", "Success", "10:15 AM"],
//       ["Leave approvals snapshot", "Manual", "Queued", "10:08 AM"],
//       ["Onboarding compliance", "Scheduled", "Failed", "09:52 AM"],
//       ["Resource bench report", "Manual", "Success", "09:40 AM"],
//     ],
//   },
//   Project_Manager: {
//     title: "Project Command Center",
//     subtitle: "Monitor progress, deadlines, and team delivery health.",
//     accent: "#01696f",
//     summary: "A project-focused dashboard that surfaces milestones, task risk, and progress trends without changing the page structure.",
//     primaryAction: "Create project",
//     secondaryAction: "Review risks",
//     kpis: [
//       { label: "Active Projects", value: 24, delta: "+3", tone: "positive" },
//       { label: "At-Risk Milestones", value: 5, delta: "+2", tone: "negative" },
//       { label: "Tasks Due Today", value: 31, delta: "+8.6%", tone: "neutral" },
//       { label: "Completion Rate", value: "78%", delta: "+5.2%", tone: "positive" },
//     ],
//     trends: [42, 46, 49, 53, 58, 61, 66],
//     distribution: [
//       { label: "On Track", value: 11 },
//       { label: "Watch", value: 7 },
//       { label: "Delayed", value: 4 },
//       { label: "Completed", value: 9 },
//     ],
//     actions: ["Create project", "Review risks", "Assign owner", "Open milestone board"],
//     focus: [
//       "Payments API rollout is 2 days behind",
//       "7 tasks are blocked by approvals",
//       "Team Alpha has the highest completion rate",
//     ],
//     tableTitle: "Projects needing review",
//     rows: [
//       ["Client Portal Revamp", "Design QA", "Watch", "May 14"],
//       ["ERP Phase 2", "Backend", "Delayed", "May 18"],
//       ["Leave App Refresh", "Testing", "On Track", "May 19"],
//       ["Timesheet Mobile", "Development", "Watch", "May 22"],
//     ],
//   },
//   Delivery_Manager: {
//     title: "Delivery Performance",
//     subtitle: "See cross-project health, releases, and escalation load.",
//     accent: "#006494",
//     summary: "Delivery managers get release readiness, escalation load, and cross-team execution signals in the same layout.",
//     primaryAction: "Review escalations",
//     secondaryAction: "Approve release",
//     kpis: [
//       { label: "Deliveries This Week", value: 16, delta: "+14%", tone: "positive" },
//       { label: "Escalations Open", value: 4, delta: "+1", tone: "negative" },
//       { label: "Release Readiness", value: "82%", delta: "+6%", tone: "positive" },
//       { label: "SLA Misses", value: 3, delta: "-2", tone: "positive" },
//     ],
//     trends: [51, 56, 54, 63, 67, 73, 79],
//     distribution: [
//       { label: "Ready", value: 10 },
//       { label: "Pending QA", value: 5 },
//       { label: "Blocked", value: 3 },
//       { label: "Escalated", value: 2 },
//     ],
//     actions: ["Review escalations", "Approve release", "Check blockers", "Open SLA summary"],
//     focus: [
//       "2 deliveries are waiting on security sign-off",
//       "Release train B is above target velocity",
//       "Escalation volume is low but rising",
//     ],
//     tableTitle: "Delivery watchlist",
//     rows: [
//       ["RMS Enhancements", "Release", "Ready", "May 13"],
//       ["Onboarding Suite", "QA", "Pending", "May 16"],
//       ["Client Billing Sync", "Infra", "Blocked", "May 17"],
//       ["User Access Audit", "Review", "Escalated", "May 20"],
//     ],
//   },
//   Resource_Manager: {
//     title: "Resource Utilization",
//     subtitle: "Balance allocation, capacity, and skill coverage.",
//     accent: "#437a22",
//     summary: "Resource managers see utilization, allocation pressure, and skill-demand balance in a predictable dashboard frame.",
//     primaryAction: "Allocate resource",
//     secondaryAction: "Resolve conflicts",
//     kpis: [
//       { label: "Utilization", value: "86%", delta: "+4%", tone: "positive" },
//       { label: "Available Resources", value: 19, delta: "-3", tone: "negative" },
//       { label: "Overallocated", value: 7, delta: "+2", tone: "negative" },
//       { label: "Pending Requests", value: 15, delta: "+5", tone: "neutral" },
//     ],
//     trends: [64, 68, 70, 72, 77, 83, 86],
//     distribution: [
//       { label: "Allocated", value: 54 },
//       { label: "Bench", value: 12 },
//       { label: "Training", value: 8 },
//       { label: "Shadow", value: 6 },
//     ],
//     actions: ["Allocate resource", "Resolve conflicts", "View bench", "Match skills"],
//     focus: [
//       "Java Spring demand is higher than supply",
//       "7 engineers are overallocated this week",
//       "Frontend capacity improves from next Monday",
//     ],
//     tableTitle: "Allocation conflicts",
//     rows: [
//       ["Ananya R", "ERP Phase 2", "125%", "Immediate"],
//       ["Rahul K", "Leave Platform", "118%", "Today"],
//       ["Pooja S", "Portal Refresh", "112%", "Tomorrow"],
//       ["Vivek N", "Analytics Suite", "110%", "This week"],
//     ],
//   },
//   HR: {
//     title: "HR Operations",
//     subtitle: "Track onboarding, employee support, and daily people tasks.",
//     accent: "#da7101",
//     summary: "HR gets a people-operations view with onboarding flow, leave context, and support workload in the same template.",
//     primaryAction: "Start onboarding",
//     secondaryAction: "Verify documents",
//     kpis: [
//       { label: "New Joiners", value: 12, delta: "+4", tone: "positive" },
//       { label: "Pending Documents", value: 9, delta: "-2", tone: "positive" },
//       { label: "Employees On Leave", value: 17, delta: "+1", tone: "neutral" },
//       { label: "Open HR Tickets", value: 11, delta: "+3", tone: "negative" },
//     ],
//     trends: [33, 36, 39, 44, 47, 52, 58],
//     distribution: [
//       { label: "Pre-joining", value: 7 },
//       { label: "Documentation", value: 10 },
//       { label: "IT Setup", value: 8 },
//       { label: "Completed", value: 14 },
//     ],
//     actions: ["Start onboarding", "Verify documents", "Respond to ticket", "View leave calendar"],
//     focus: [
//       "5 new joiners start this week",
//       "Policy acknowledgment rate is at 92%",
//       "Document verification queue is healthy",
//     ],
//     tableTitle: "Onboarding pipeline",
//     rows: [
//       ["Akhil P", "Documentation", "Pending", "May 12"],
//       ["Sneha T", "IT Setup", "In Progress", "May 12"],
//       ["Madhavi G", "Orientation", "Scheduled", "May 13"],
//       ["Kiran V", "Completed", "Done", "May 10"],
//     ],
//   },
//   Hr_Manager: {
//     title: "People Analytics",
//     subtitle: "Review workforce health, approvals, and HR performance.",
//     accent: "#964219",
//     summary: "HR managers see a wider workforce lens with approvals, headcount movement, and HR operations trends.",
//     primaryAction: "Approve requests",
//     secondaryAction: "Review risk cases",
//     kpis: [
//       { label: "Total Headcount", value: 486, delta: "+18", tone: "positive" },
//       { label: "Approval Queue", value: 23, delta: "+6", tone: "negative" },
//       { label: "Onboarding Completion", value: "89%", delta: "+7%", tone: "positive" },
//       { label: "Attrition Risk Cases", value: 8, delta: "+1", tone: "negative" },
//     ],
//     trends: [62, 64, 66, 69, 71, 75, 80],
//     distribution: [
//       { label: "Engineering", value: 46 },
//       { label: "Delivery", value: 18 },
//       { label: "HR", value: 9 },
//       { label: "Operations", value: 12 },
//     ],
//     actions: ["Approve requests", "Review risk cases", "Export people report", "Check compliance"],
//     focus: [
//       "Engineering hiring is above monthly target",
//       "Leave approvals need review before 4 PM",
//       "Attrition flags are concentrated in 2 teams",
//     ],
//     tableTitle: "Pending HR approvals",
//     rows: [
//       ["Promotion request", "Engineering", "Pending", "1:00 PM"],
//       ["Policy exception", "Delivery", "Review", "2:15 PM"],
//       ["Comp-off approval", "Operations", "Pending", "3:00 PM"],
//       ["Role update", "Admin", "Escalated", "4:30 PM"],
//     ],
//   },
//   Admin: {
//     title: "System Administration",
//     subtitle: "Manage users, permissions, and operational alerts.",
//     accent: "#a13544",
//     summary: "Admins keep the same interface but receive access management, login health, and system event visibility.",
//     primaryAction: "Manage roles",
//     secondaryAction: "Review audit",
//     kpis: [
//       { label: "Active Users", value: 442, delta: "+21", tone: "positive" },
//       { label: "Pending Access Requests", value: 14, delta: "+3", tone: "neutral" },
//       { label: "Failed Logins", value: 9, delta: "+2", tone: "negative" },
//       { label: "Config Alerts", value: 4, delta: "-1", tone: "positive" },
//     ],
//     trends: [48, 52, 57, 61, 65, 69, 73],
//     distribution: [
//       { label: "General", value: 245 },
//       { label: "Managers", value: 98 },
//       { label: "HR", value: 36 },
//       { label: "Admins", value: 14 },
//     ],
//     actions: ["Manage roles", "Reset access", "Review audit", "Open settings"],
//     focus: [
//       "9 failed login attempts from 3 users",
//       "Role update requests increased after team onboarding",
//       "Configuration health is stable",
//     ],
//     tableTitle: "Recent admin events",
//     rows: [
//       ["Role changed", "User Management", "Success", "10:24 AM"],
//       ["Password reset", "Auth", "Success", "10:17 AM"],
//       ["Bulk import", "Users", "Queued", "10:09 AM"],
//       ["Policy update", "Security", "Review", "09:50 AM"],
//     ],
//   },
//   "Super Admin": {
//     title: "Platform Governance",
//     subtitle: "Full visibility across roles, access, and critical events.",
//     accent: "#0f3638",
//     summary: "Super Admin sees platform-wide governance, audit pressure, and critical control metrics on the same scaffold.",
//     primaryAction: "Review alerts",
//     secondaryAction: "Inspect audit trail",
//     kpis: [
//       { label: "Critical Alerts", value: 3, delta: "+1", tone: "negative" },
//       { label: "Permission Exceptions", value: 5, delta: "-2", tone: "positive" },
//       { label: "Audit Events Today", value: 128, delta: "+11%", tone: "neutral" },
//       { label: "System Health", value: "98.7%", delta: "+0.4%", tone: "positive" },
//     ],
//     trends: [70, 74, 73, 78, 80, 85, 89],
//     distribution: [
//       { label: "Auth", value: 18 },
//       { label: "Projects", value: 14 },
//       { label: "Reports", value: 9 },
//       { label: "HR", value: 7 },
//       { label: "Resources", value: 11 },
//     ],
//     actions: ["Review alerts", "Inspect audit trail", "Override access", "Open platform map"],
//     focus: [
//       "2 high-priority security alerts need review",
//       "Audit event volume is above normal baseline",
//       "Role exception count is trending down",
//     ],
//     tableTitle: "Critical governance log",
//     rows: [
//       ["Privilege override", "Security", "Flagged", "10:31 AM"],
//       ["Role inheritance sync", "RBAC", "Success", "10:12 AM"],
//       ["Module policy change", "Platform", "Review", "09:58 AM"],
//       ["Audit export", "Compliance", "Success", "09:41 AM"],
//     ],
//   },
//   General: {
//     title: "My Work Dashboard",
//     subtitle: "A focused view of tasks, leave, timesheets, and project activity.",
//     accent: "#227f8b",
//     summary: "General users see their own work priorities, not system-level data, while the layout stays familiar.",
//     primaryAction: "Fill timesheet",
//     secondaryAction: "Apply leave",
//     kpis: [
//       { label: "My Tasks", value: 11, delta: "+2", tone: "neutral" },
//       { label: "Timesheet Status", value: "92%", delta: "+8%", tone: "positive" },
//       { label: "Leave Balance", value: 8, delta: "0", tone: "neutral" },
//       { label: "Assigned Projects", value: 3, delta: "+1", tone: "positive" },
//     ],
//     trends: [45, 49, 54, 58, 61, 67, 72],
//     distribution: [
//       { label: "Tasks", value: 8 },
//       { label: "Timesheets", value: 5 },
//       { label: "Leave", value: 3 },
//       { label: "Learning", value: 4 },
//     ],
//     actions: ["Fill timesheet", "Apply leave", "View tasks", "Update profile"],
//     focus: [
//       "Your timesheet is due by 6:00 PM",
//       "1 project task is due today",
//       "2 leave holidays are coming this month",
//     ],
//     tableTitle: "My upcoming work",
//     rows: [
//       ["Submit weekly timesheet", "Timesheets", "Pending", "Today"],
//       ["API integration task", "Project", "In Progress", "Tomorrow"],
//       ["Leave balance review", "Leave", "Open", "May 15"],
//       ["Security training", "Learning", "Scheduled", "May 18"],
//     ],
//   },
// };

// const toneMap = {
//   positive: { bg: "bg-emerald-50", text: "text-emerald-700", icon: "↗" },
//   negative: { bg: "bg-rose-50", text: "text-rose-700", icon: "↘" },
//   neutral: { bg: "bg-sky-50", text: "text-sky-700", icon: "→" },
// };

// function cn(...classes) {
//   return classes.filter(Boolean).join(" ");
// }

// function buildTrendData(values) {
//   return values.map((value, index) => ({ day: trendDays[index], value }));
// }

// function AppLogo() {
//   return (
//     <svg viewBox="0 0 48 48" fill="none" aria-label="Intranet dashboard logo" className="h-9 w-9 text-teal-700">
//       <rect x="6" y="6" width="36" height="36" rx="12" stroke="currentColor" strokeWidth="3" />
//       <path d="M16 31V17h4l8 8 8-8h4v14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
//     </svg>
//   );
// }

// function TopNavigation({ activeRole, setActiveRole, query, setQuery }) {
//   const filteredRoles = useMemo(
//     () => roles.filter((role) => role.toLowerCase().includes(query.toLowerCase())),
//     [query]
//   );

//   return (
//     <header className="sticky top-0 z-20 border-b border-stone-200 bg-stone-50/90 backdrop-blur">
//       <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
//         <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
//           <div className="flex items-center gap-3">
//             <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-3 py-2 shadow-sm">
//               <AppLogo />
//               <div>
//                 <h1 className="text-sm font-semibold tracking-tight">Intranet OS</h1>
//                 <p className="text-xs text-stone-500">Role-based dashboard</p>
//               </div>
//             </div>
//             <div className="hidden rounded-full border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 md:block">
//               Current role: {activeRole}
//             </div>
//           </div>

//           <div className="flex flex-col gap-3 md:flex-row md:flex-wrap xl:items-center xl:justify-end">
//             <input
//               value={query}
//               onChange={(e) => setQuery(e.target.value)}
//               placeholder="Search roles"
//               className="w-full min-w-0 rounded-xl border border-stone-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-teal-600 md:w-64"
//             />
//             <div className="flex flex-wrap gap-2">
//               {navItems.map((item, index) => (
//                 <button
//                   key={item}
//                   className={cn(
//                     "rounded-full px-3 py-2 text-xs font-medium transition",
//                     index === 0 ? "bg-stone-900 text-white" : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-100"
//                   )}
//                 >
//                   {item}
//                 </button>
//               ))}
//             </div>
//           </div>
//         </div>

//         <div className="flex gap-2 overflow-x-auto pb-1">
//           {filteredRoles.map((role) => (
//             <button
//               key={role}
//               onClick={() => setActiveRole(role)}
//               className={cn(
//                 "shrink-0 rounded-full px-4 py-2 text-sm transition",
//                 activeRole === role ? "bg-teal-700 text-white" : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-100"
//               )}
//             >
//               {role}
//             </button>
//           ))}
//         </div>
//       </div>
//     </header>
//   );
// }

// function DashboardHeader({ title, subtitle, activeRole }) {
//   return (
//     <section className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white/90 p-5 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
//       <div>
//         <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h2>
//         <p className="mt-1.5 text-sm text-stone-500">{subtitle}</p>
//       </div>
//       <div className="flex flex-wrap items-center gap-2">
//         <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-700">Role: {activeRole}</span>
//         <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-700">Last updated: 10:32 AM</span>
//         <button className="rounded-full border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-700">Notifications 12</button>
//       </div>
//     </section>
//   );
// }

// function ModuleStrip() {
//   return (
//     <section className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
//       <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Modules</p>
//       <div className="flex flex-wrap gap-2">
//         {modules.map((module) => (
//           <span key={module} className="rounded-full border border-stone-200 bg-stone-100 px-3 py-1.5 text-xs text-stone-600">
//             {module}
//           </span>
//         ))}
//       </div>
//     </section>
//   );
// }

// function HeroPanel({ config }) {
//   return (
//     <section className="rounded-[28px] border border-stone-200 bg-gradient-to-br from-white to-stone-100 p-5 shadow-sm">
//       <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
//         <div>
//           <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Today needs attention</p>
//           <p className="mt-4 max-w-3xl text-sm leading-6 text-stone-600">{config.summary}</p>
//           <div className="mt-5 flex flex-wrap gap-3">
//             <button className="rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-sm" style={{ backgroundColor: config.accent }}>
//               {config.primaryAction}
//             </button>
//             <button className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-800">
//               {config.secondaryAction}
//             </button>
//           </div>
//         </div>

//         <div className="space-y-3 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
//           {config.focus.map((item) => (
//             <div key={item} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
//               {item}
//             </div>
//           ))}
//         </div>
//       </div>
//     </section>
//   );
// }

// function KpiGrid({ items }) {
//   return (
//     <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
//       {items.map((item) => {
//         const tone = toneMap[item.tone];
//         return (
//           <article key={item.label} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
//             <p className="text-sm text-stone-500">{item.label}</p>
//             <div className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">{item.value}</div>
//             <div className={cn("mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold", tone.bg, tone.text)}>
//               <span>{tone.icon}</span>
//               <span>{item.delta}</span>
//             </div>
//           </article>
//         );
//       })}
//     </section>
//   );
// }

// function ChartCard({ title, subtitle, rightSlot, children }) {
//   return (
//     <article className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
//       <div className="mb-4 flex items-start justify-between gap-4">
//         <div>
//           <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
//           <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
//         </div>
//         {rightSlot}
//       </div>
//       {children}
//     </article>
//   );
// }

// function TrendChart({ values, accent }) {
//   const data = buildTrendData(values);

//   return (
//     <div className="h-56 w-full sm:h-64">
//       <ResponsiveContainer width="100%" height="100%">
//         <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
//           <defs>
//             <linearGradient id="roleTrendFillResponsive" x1="0" y1="0" x2="0" y2="1">
//               <stop offset="5%" stopColor={accent} stopOpacity={0.26} />
//               <stop offset="95%" stopColor={accent} stopOpacity={0.03} />
//             </linearGradient>
//           </defs>
//           <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" vertical={false} />
//           <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#78716c" }} />
//           <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#78716c" }} width={34} />
//           <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid #e7e5e4", boxShadow: "0 10px 30px rgba(28,25,23,0.08)" }} />
//           <Area type="monotone" dataKey="value" stroke={accent} fill="url(#roleTrendFillResponsive)" strokeWidth={3} />
//         </AreaChart>
//       </ResponsiveContainer>
//     </div>
//   );
// }

// function DistributionChart({ items, accent }) {
//   return (
//     <div className="h-56 w-full sm:h-64">
//       <ResponsiveContainer width="100%" height="100%">
//         <BarChart data={items} layout="vertical" margin={{ top: 0, right: 10, left: 8, bottom: 0 }}>
//           <CartesianGrid stroke="#f5f5f4" horizontal={false} />
//           <XAxis type="number" hide />
//           <YAxis dataKey="label" type="category" width={96} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#57534e" }} />
//           <Tooltip cursor={{ fill: "rgba(231,229,228,0.45)" }} contentStyle={{ borderRadius: 16, border: "1px solid #e7e5e4", boxShadow: "0 10px 30px rgba(28,25,23,0.08)" }} />
//           <Bar dataKey="value" fill={accent} radius={[10, 10, 10, 10]} barSize={18} />
//         </BarChart>
//       </ResponsiveContainer>
//     </div>
//   );
// }

// function QuickActions({ actions }) {
//   return (
//     <article className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
//       <div className="mb-4">
//         <h3 className="text-lg font-semibold tracking-tight">Quick Actions</h3>
//         <p className="mt-1 text-sm text-stone-500">High-frequency tasks for this role</p>
//       </div>
//       <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
//         {actions.map((action) => (
//           <button
//             key={action}
//             className="flex w-full items-center justify-between rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-stone-800 transition hover:bg-stone-100"
//           >
//             <span>{action}</span>
//             <span>→</span>
//           </button>
//         ))}
//       </div>
//     </article>
//   );
// }

// function DetailTable({ title, rows }) {
//   return (
//     <article className="overflow-hidden rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
//       <div className="mb-4">
//         <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
//         <p className="mt-1 text-sm text-stone-500">Detailed mock rows for the selected role</p>
//       </div>
//       <div className="overflow-x-auto">
//         <table className="min-w-full border-collapse">
//           <thead>
//             <tr className="border-b border-stone-200 text-left text-[11px] uppercase tracking-[0.18em] text-stone-500">
//               <th className="px-3 py-3 font-semibold">Name</th>
//               <th className="px-3 py-3 font-semibold">Context</th>
//               <th className="px-3 py-3 font-semibold">Status</th>
//               <th className="px-3 py-3 font-semibold">Due / Time</th>
//             </tr>
//           </thead>
//           <tbody>
//             {rows.map((row, index) => (
//               <tr key={`${row[0]}-${index}`} className="border-b border-stone-100 last:border-b-0">
//                 <td className="px-3 py-3 text-sm text-stone-900">{row[0]}</td>
//                 <td className="px-3 py-3 text-sm text-stone-600">{row[1]}</td>
//                 <td className="px-3 py-3 text-sm">
//                   <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">{row[2]}</span>
//                 </td>
//                 <td className="px-3 py-3 text-sm text-stone-600">{row[3]}</td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </article>
//   );
// }

// export default function IntranetRoleDashboardResponsive() {
//   const [activeRole, setActiveRole] = useState("Project_Manager");
//   const [query, setQuery] = useState("");
//   const config = roleConfigs[activeRole];

//   return (
//     <div className="min-h-screen bg-stone-100 text-stone-900">
//       <TopNavigation activeRole={activeRole} setActiveRole={setActiveRole} query={query} setQuery={setQuery} />

//       <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
//         <DashboardHeader title={config.title} subtitle={config.subtitle} activeRole={activeRole} />
//         <ModuleStrip />
//         <HeroPanel config={config} />
//         <KpiGrid items={config.kpis} />

//         <section className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
//           <ChartCard
//             title="Trend Overview"
//             subtitle="Mock weekly pattern for the selected role"
//             rightSlot={<span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-600">7 days</span>}
//           >
//             <TrendChart values={config.trends} accent={config.accent} />
//             <p className="mt-3 text-sm text-stone-500">Replace this series with backend chart data later.</p>
//           </ChartCard>

//           <ChartCard
//             title="Workload Distribution"
//             subtitle="Role-specific category split"
//             rightSlot={<span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-600">Live mix</span>}
//           >
//             <DistributionChart items={config.distribution} accent={config.accent} />
//           </ChartCard>
//         </section>

//         <section className="grid grid-cols-1 gap-5 2xl:grid-cols-[0.9fr_1.1fr]">
//           <QuickActions actions={config.actions} />
//           <DetailTable title={config.tableTitle} rows={config.rows} />
//         </section>
//       </main>
//     </div>
//   );
// }
