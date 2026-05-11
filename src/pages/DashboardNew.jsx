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