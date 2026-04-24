// "use client";

// import React, { useEffect, useState, useMemo, useRef } from "react";
// import axios from "axios";
// import {
//   PieChart,
//   Pie,
//   Cell,
//   Tooltip as RechartsTooltip,
//   Sector,
//   ResponsiveContainer,
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Legend,
// } from "recharts";
// import {
//   FiCheckSquare,
//   FiBookmark,
//   FiZap,
//   FiLink,
//   FiUser,
// } from "react-icons/fi";
// import { FaBug } from "react-icons/fa";
// import { Card, Avatar, Typography, Spin, Tooltip } from "antd";
// import { motion, AnimatePresence, useInView } from "framer-motion";

// const { Title, Text, Link } = Typography;

// // --- ANIMATION VARIANTS ---
// const containerVariants = {
//   hidden: { opacity: 0 },
//   visible: {
//     opacity: 1,
//     transition: { staggerChildren: 0.06, delayChildren: 0.12 },
//   },
// };

// const itemVariants = {
//   hidden: { opacity: 0, y: 12 },
//   visible: {
//     opacity: 1,
//     y: 0,
//     transition: { duration: 0.36, ease: "easeOut" },
//   },
// };

// const DASHBOARD_COLORS = [
//   "#4f46e5", "#7c3aed", "#0d9488", "#db2777",
//   "#ea580c", "#2563eb", "#be185d", "#65a30d",
//   "#0891b2", "#c026d3", "#d97706", "#4338ca",
// ];

// // --- HELPER COMPONENTS ---

// const DistributionBar = ({ percentage, count, total, isInteractive = true }) => {
//   const percentLabel = `${Math.round(percentage)}%`;
//   const tooltipTitle = `${count} / ${total} items`;

//   const bar = (
//     <div className={`w-full bg-gray-200 rounded h-4 flex items-center ${isInteractive ? 'cursor-pointer' : ''}`}>
//         <motion.div
//           className="bg-gray-600 h-4 rounded flex items-center px-2 text-xs text-white font-semibold origin-left"
//           initial={{ width: 0 }}
//           whileInView={{ width: `${percentage}%` }}
//           whileHover={isInteractive ? { scaleY: 1.2 } : {}}
//           viewport={{ once: true, amount: 0.8 }}
//           transition={{ duration: 0.7, ease: "easeOut" }}
//         >
//           <span>{percentLabel}</span>
//         </motion.div>
//       </div>
//   );

//   return isInteractive ? <Tooltip title={tooltipTitle}>{bar}</Tooltip> : bar;
// };

// // --- WIDGET COMPONENTS ---

// const ScopeAndProgress = ({ epics, stories, bugs, tasks, statuses }) => {
//   const allWorkItems = [...stories, ...tasks, ...bugs];
//   const totalItems = allWorkItems.length;

//   const doneStatusId = React.useMemo(() => {
//     if (!statuses || statuses.length === 0) return null;
//     const doneStatus = statuses.reduce(
//       (max, status) => (status.sortOrder > max.sortOrder ? status : max),
//       statuses[0]
//     );
//     return doneStatus?.id;
//   }, [statuses]);

//   const completedItems = allWorkItems.filter((item) => {
//     if (doneStatusId) return item.status?.id === doneStatusId;
//     return item.status?.name?.toLowerCase() === "done";
//   }).length;

//   const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

//   const progressData = [
//     { name: "Completed", value: progressPercentage },
//     { name: "Remaining", value: 100 - progressPercentage },
//   ];

//   const statItems = [
//     { name: "Epics", count: epics.length, icon: <FiZap className="text-purple-500 text-xl" /> },
//     { name: "User Stories", count: stories.length, icon: <FiBookmark className="text-green-500 text-xl" /> },
//     { name: "Tasks", count: tasks.length, icon: <FiCheckSquare className="text-blue-500 text-xl" /> },
//     { name: "Bugs", count: bugs.length, icon: <FaBug className="text-red-500 text-xl" /> },
//   ];

//   return (
//     <motion.div variants={itemVariants} initial="hidden" animate="visible">
//       <Card
//         title={<Title level={4} className="!mb-0 font-bold">Scope & Progress</Title>}
//         className="shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200"
//         styles={{ header:{ marginBottom: 0,borderBottom: "none", paddingBottom: 0 }, body:{ padding: "0 24px 24px 24px" } }}
//       >
//         <div className="grid grid-cols-1 md:grid-cols-2 gap- items-center">
//           <div className="grid grid-cols-4 gap-3">
//             {statItems.map((item) => (
//               <div key={item.name} className="bg-gray-50 rounded p-3 flex flex-col items-center justify-center transition-all duration-200 hover:bg-gray-100 hover:-translate-y-0.5">
//                 <div className="text-2xl mb-1">{item.icon}</div>
//                 <Text type="secondary" className="text-xs uppercase tracking-wide font-semibold text-center">{item.name}</Text>
//                 <Title level={4} className="!mb-0 !text-indigo-600 font-bold text-center">{item.count}</Title>
//               </div>
//             ))}
//           </div>
//           <div className="flex flex-col items-center justify-center">
//             <Text strong className="mb-2 text-xs uppercase tracking-wide font-bold">Overall Progress</Text>
//             <div className="w-36 h-36 relative">
//               <ResponsiveContainer width="100%" height="100%">
//                 <PieChart>
//                   <Pie data={progressData} cx="50%" cy="50%" innerRadius={50} outerRadius={65} startAngle={90} endAngle={450} dataKey="value">
//                     <Cell key="completed" fill="#4f46e5" />
//                     <Cell key="remaining" fill="#e5e7eb" />
//                   </Pie>
//                 </PieChart>
//               </ResponsiveContainer>
//               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
//                 <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.12, duration: 0.28 }} className="text-center">
//                   <Title level={4} className="!mb-0 !text-indigo-600 font-bold">{progressPercentage}%</Title>
//                   <Text type="secondary" className="text-xs font-semibold">{completedItems} / {totalItems}</Text>
//                 </motion.div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </Card>
//     </motion.div>
//   );
// };

// const StatusOverview = ({ workItems, statuses }) => {
//   const [chartData, setChartData] = useState([]);
//   const [activeIndex, setActiveIndex] = useState(null);
//   const [hoveredIndex, setHoveredIndex] = useState(null);
//   const totalItems = workItems.length;

//   useEffect(() => {
//     const statusMap = new Map(statuses.map(s => [s.id, { ...s, count: 0 }]));
//     workItems.forEach(item => {
//       if (item.status && statusMap.has(item.status.id)) {
//         statusMap.get(item.status.id).count++;
//       }
//     });
//     const data = Array.from(statusMap.values())
//       .sort((a, b) => a.sortOrder - b.sortOrder)
//       .map((status, index) => ({
//         name: status.name,
//         value: status.count,
//         percentage: totalItems > 0 ? (status.count / totalItems) * 100 : 0,
//         color: DASHBOARD_COLORS[index % DASHBOARD_COLORS.length],
//       }));
//     setChartData(data);
//   }, [workItems, statuses]);

//   const ActiveSliceShape = (props) => {
//     const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, ...rest } = props;
//     return (
//       <g>
//         <text x={cx} y={cy - 15} dy={8} textAnchor="middle" fill="#374151" className="font-bold text-base">{payload.name}</text>
//         <Sector {...rest} cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} fill={fill} />
//       </g>
//     );
//   };

//   if (!totalItems && chartData.every(d => d.value === 0)) return null;

//   return (
//     <motion.div variants={itemVariants} initial="hidden" animate="visible">
//       <Card title={<Title level={4} className="!mb-0 font-bold">Status overview</Title>} className="shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200" styles={{ header:{ marginBottom: 0,borderBottom: "none", paddingBottom: 0 }, body:{ padding: "0 32px 32px 32px" } }}>
//         <Text type="secondary" className="block mb-6 text-sm">Get a snapshot of the status of your work items.</Text>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
//           <div className="relative h-64 min-h-0">
//             <ResponsiveContainer width="100%" height="100%">
//               <PieChart>
//                 <Pie
//                   data={chartData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={4} dataKey="value"
//                   onClick={(data, index) => { setActiveIndex(activeIndex === index ? null : index); setHoveredIndex(null); }}
//                   onMouseEnter={(_, index) => setHoveredIndex(index)}
//                   onMouseLeave={() => setHoveredIndex(null)}
//                   activeIndex={activeIndex !== null ? activeIndex : hoveredIndex}
//                   activeShape={activeIndex !== null || hoveredIndex !== null ? <ActiveSliceShape /> : undefined}
//                 >
//                   {chartData.map((entry, index) => (
//                     <Cell key={`cell-${entry.name}`} fill={entry.value > 0 ? entry.color : "#f3f4f6"} style={{ cursor: 'pointer' }} opacity={(activeIndex !== null && activeIndex !== index) || (hoveredIndex !== null && hoveredIndex !== index) ? 0.4 : 1} />
//                   ))}
//                 </Pie>
//               </PieChart>
//             </ResponsiveContainer>
//             {(activeIndex === null && hoveredIndex === null) && (
//               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
//                 <Title level={4} className="!mb-0 font-bold">{totalItems}</Title>
//                 <Text type="secondary" className="text-xs font-semibold">Total items</Text>
//               </div>
//             )}
//           </div>
//           <div className="space-y-3 self-center w-full" onMouseLeave={() => setHoveredIndex(null)}>
//             {chartData.map((item, index) => (
//               <div key={item.name} onMouseEnter={() => setHoveredIndex(index)} onClick={() => setActiveIndex(activeIndex === index ? null : index)} className={`p-2 -m-1 rounded-md transition-all duration-200 cursor-pointer ${activeIndex === index ? 'bg-indigo-50 scale-[1.02]' : hoveredIndex === index ? 'bg-gray-100 scale-[1.02]' : 'hover:bg-gray-50'}`}>
//                 <div className="flex items-center justify-between">
//                   <div className="flex items-center"><span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: item.value > 0 ? item.color : "#f3f4f6" }} /><Text className="text-m font-medium ml-2">{item.name}</Text></div>
//                   <Text type="secondary" className="text-m font-semibold">{item.value} ({Math.round(item.percentage)}%)</Text>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </Card>
//     </motion.div>
//   );
// };

// const TypesOfWork = ({ tasks, stories, epics, bugs }) => {
//   const workTypes = [
//     { name: "Tasks", items: tasks, icon: <FiCheckSquare className="text-blue-500" /> },
//     { name: "Stories", items: stories, icon: <FiBookmark className="text-green-500" /> },
//     { name: "Epics", items: epics, icon: <FiZap className="text-purple-500" /> },
//     { name: "Bugs", items: bugs, icon: <FaBug className="text-red-500" /> },
//   ];
//   const totalItems = workTypes.reduce((sum, type) => sum + type.items.length, 0);
//   if (!totalItems) return null;

//   return (
//     <motion.div variants={itemVariants}>
//       <Card title={<Title level={4} className="!mb-0 font-bold">Types of work</Title>} className="shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200" styles={{ header: { marginBottom: 0, borderBottom: "none", paddingBottom: 0 }, body: { padding: "0 32px 32px 32px" } }}>
//         <Text type="secondary" className="block mb-6 text-sm">Get a breakdown of work items by their types.</Text>
//         <div className="space-y-3">
//           {workTypes.map((type) => (
//             <div key={type.name} className="flex items-center p-1 -m-1 rounded-md transition-colors hover:bg-gray-50">
//               <div className="w-2/5 flex items-center"><span className="mr-3 text-lg">{type.icon}</span><Text className="text-sm font-medium">{type.name} ({type.items.length})</Text></div>
//               <div className="w-3/5"><DistributionBar percentage={totalItems > 0 ? (type.items.length / totalItems) * 100 : 0} count={type.items.length} total={totalItems} /></div>
//             </div>
//           ))}
//         </div>
//       </Card>
//     </motion.div>
//   );
// };

// const TeamWorkload = ({ workItems, users }) => {
//   const [workloadData, setWorkloadData] = useState([]);
//   const totalItems = workItems.length;

//   useEffect(() => {
//     const userMap = new Map(users.map(u => [u.id, { ...u, count: 0 }]));
//     const unassigned = { id: null, name: "Unassigned", count: 0, color: "#9ca3af", initials: <FiUser /> };

//     workItems.forEach(item => {
//       const assignedTo = item.assigneeId || item.assignee?.id;
//       if (assignedTo && userMap.has(assignedTo)) {
//         userMap.get(assignedTo).count++;
//       } else {
//         unassigned.count++;
//       }
//     });

//     const assignedUsers = Array.from(userMap.values()).filter(u => u.count > 0);
//     const allAssignees = unassigned.count > 0 ? [unassigned, ...assignedUsers] : assignedUsers;

//     const data = allAssignees.map((user, index) => ({
//       ...user,
//       percentage: totalItems > 0 ? (user.count / totalItems) * 100 : 0,
//       initials: user.id ? (user.name?.split(" ").map(n => n[0]).join("").toUpperCase() || "?") : <FiUser />,
//       color: user.id ? DASHBOARD_COLORS[index % DASHBOARD_COLORS.length] : "#9ca3af"
//     }));
//     setWorkloadData(data);
//   }, [workItems, users]);

//   if (!totalItems) return null;

//   return (
//     <motion.div variants={itemVariants}>
//       <Card title={<Title level={4} className="!mb-0 font-bold">Team workload</Title>} className="shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200" styles={{ header: { marginBottom: 0, borderBottom: "none", paddingBottom: 0 }, body: { padding: "0 32px 32px 32px" } }}>
//         <Text type="secondary" className="block !mt-0 !mb-6 text-sm">Monitor the capacity of your team.</Text>
//         <div className="space-y-3">
//           {workloadData.map(user => (
//             <div key={user.name} className="flex items-center p-1 -m-1 rounded-md transition-colors hover:bg-gray-50">
//               <div className="w-2/5 flex items-center">
//                 <Avatar size="small" style={{ backgroundColor: user.color, marginRight: 12, fontWeight: "bold" }}>{user.initials}</Avatar>
//                 <Text className="text-sm font-medium">{user.name || user.email || "Unassigned"}</Text>
//               </div>
//               <div className="w-3/5"><DistributionBar percentage={user.percentage} count={user.count} total={totalItems} isInteractive={false} /></div>
//             </div>
//           ))}
//         </div>
//       </Card>
//     </motion.div>
//   );
// };

// const PriorityDistribution = ({ tasks, stories, bugs }) => {
//   const data = React.useMemo(() => {
//     const allPriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL", "UNSPECIFIED"];
//     const dataMap = new Map(allPriorities.map(p => [p, { priority: p, Tasks: 0, Stories: 0, Bugs: 0 }]));
//     const allItems = [
//       ...(tasks || []).map(item => ({ ...item, type: 'Tasks' })),
//       ...(stories || []).map(item => ({ ...item, type: 'Stories' })),
//       ...(bugs || []).map(item => ({ ...item, type: 'Bugs' })),
//     ];
//     allItems.forEach(item => {
//       const p = item.priority?.toUpperCase() || "UNSPECIFIED";
//       if (dataMap.has(p) && item.type) dataMap.get(p)[item.type]++;
//     });
//     return Array.from(dataMap.values()).filter(entry => entry.Tasks > 0 || entry.Stories > 0 || entry.Bugs > 0);
//   }, [tasks, stories, bugs]);

//   const ref = useRef(null);
//   const isInView = useInView(ref, { once: true, amount: 0.5 });
//   if (!data.length) return null;

//   return (
//     <motion.div ref={ref} variants={itemVariants} className="h-full">
//       <Card title={<Title level={4} className="!mb-0 font-bold">Priority Distribution</Title>} className="shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200 h-full flex flex-col" styles={{ header:{ marginBottom: 0,borderBottom: "none", paddingBottom: 0 }, body:{ padding: "0 32px 32px 32px", flex: '1 1 auto', display: 'flex', flexDirection: 'column' } }}>
//         <Text type="secondary" className="block mb-6 text-sm uppercase tracking-wide font-semibold">Breakdown by priority</Text>
//         <div className="w-full flex-grow min-h-0" >
//           <ResponsiveContainer width="100%" height="100%">
//             <BarChart data={data} margin={{ top: 8, right: 10, left: 8, bottom: 6 }} barGap={6} barCategoryGap="20%">
//               <CartesianGrid strokeDasharray="3 3" stroke="rgba(79, 70, 229, 0.06)" />
//               <XAxis dataKey="priority" tick={{ fill: '#4b5563', fontSize: 12, fontWeight: 600 }} />
//               <YAxis allowDecimals={false} tick={{ fill: '#4b5563', fontSize: 12, fontWeight: 600 }} />
//               <RechartsTooltip cursor={{ fill: 'rgba(79, 70, 229, 0.03)' }} />
//               <Legend wrapperStyle={{ paddingTop: 6, fontWeight: 600, fontSize: 13 }} />
//               <Bar dataKey="Tasks" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={28} animationDuration={isInView ? 800 : 0} />
//               <Bar dataKey="Stories" fill="#7c3aed" radius={[6, 6, 0, 0]} barSize={28} animationDuration={isInView ? 800 : 0} animationDelay={100} />
//               <Bar dataKey="Bugs" fill="#06b6d4" radius={[6, 6, 0, 0]} barSize={28} animationDuration={isInView ? 800 : 0} animationDelay={200} />
//             </BarChart>
//           </ResponsiveContainer>
//         </div>
//       </Card>
//     </motion.div>
//   );
// };

// // Helper component for the AntD Tooltip content
// const EpicTooltipContent = ({ epic }) => (
//   <div className="text-xs">
//     <Text strong className="text-white text-sm block mb-1">
//       {epic.name}
//     </Text>
//     <div className="flex items-center">
//       <span className="w-2.5 h-2.5 bg-green-300 rounded-sm mr-2" />
//       <Text className="text-gray-200">Done: {epic.done}</Text>
//     </div>
//     <div className="flex items-center">
//       <span className="w-2.5 h-2.5 bg-blue-300 rounded-sm mr-2" />
//       <Text className="text-gray-200">In progress: {epic.inProgress}</Text>
//     </div>
//     <div className="flex items-center">
//       <span className="w-2.5 h-2.5 bg-gray-500 rounded-sm mr-2" />
//       <Text className="text-gray-200">To do: {epic.todo}</Text>
//     </div>
//   </div>
// );

// const EpicProgress = ({ epics, stories, tasks, bugs, statuses }) => {
//   const [epicProgressData, setEpicProgressData] = useState([]);
//   const [sortedStatuses, setSortedStatuses] = useState([]);

//   useEffect(() => {
//     if (!statuses || statuses.length === 0) {
//       setEpicProgressData([]);
//       return;
//     }
//     const localSortedStatuses = [...statuses].sort((a, b) => a.sortOrder - b.sortOrder).map((status, index) => ({ ...status, color: DASHBOARD_COLORS[index % DASHBOARD_COLORS.length] }));
//     setSortedStatuses(localSortedStatuses);

//     const allWorkItems = [...stories, ...tasks, ...bugs];
//     const processedData = epics.map(epic => {
//       const children = allWorkItems.filter(item => item.epicId === epic.id || item.epic?.id === epic.id);
//       const statusCounts = new Map(localSortedStatuses.map(s => [s.id, 0]));
//       children.forEach(child => {
//         if (child.status?.id) statusCounts.set(child.status.id, (statusCounts.get(child.status.id) || 0) + 1);
//       });
//       const total = children.length;
//       const statusDistribution = localSortedStatuses.map(status => ({
//         id: status.id, name: status.name, color: status.color, count: statusCounts.get(status.id) || 0,
//         percentage: total > 0 ? ((statusCounts.get(status.id) || 0) / total) * 100 : 0,
//       }));
//       return { ...epic, total, statusDistribution };
//     });
//     setEpicProgressData(processedData.filter(e => e.total > 0));
//   }, [epics, stories, tasks, bugs, statuses]);

//   if (!epicProgressData.length) return null;

//   return (
//     <motion.div variants={itemVariants}>
//       <Card title={<Title level={4} className="!mb-0 font-bold">Epic progress</Title>} className="shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200" styles={{ header: { marginBottom: 0, borderBottom: "none", paddingBottom: 0 }, body: { padding: "0 32px 32px 32px" } }}>
//         <Text type="secondary" className="block mb-6 text-sm">See how your epics are progressing at a glance.</Text>
//         <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mb-4">
//           {sortedStatuses.map(status => (
//             <div key={status.id} className="flex items-center"><span className="w-3 h-3 rounded-sm mr-2" style={{ backgroundColor: status.color }} /><Text className="text-xs font-semibold">{status.name}</Text></div>
//           ))}
//         </div>
//         <div className="space-y-3">
//           {epicProgressData.map(epic => (
//             <div key={epic.id}>
//                <Tooltip
//                 title={<EpicTooltipContent epic={epic} />}
//                 placement="top"
//                 arrow={false}
//                 styles={{
//                   popup: {
//                     backgroundColor: 'rgba(23, 23, 23, 0.9)',
//                     borderRadius: '6px',
//                     padding: '8px 10px'
//                   }
//                 }}
//               >
//                 <div className="flex items-center gap-2 mb-1 cursor-default"><FiZap className="text-purple-500" /><Text strong className="text-sm">{epic.key || `EPIC-${epic.id}`}</Text><Text className="text-sm">{epic.name}</Text></div>
//               </Tooltip>
//               <div className="w-full h-6 flex rounded overflow-hidden text-gray-800">
//                 {epic.statusDistribution.map((status, index) => (
//                   <motion.div key={status.id} className="flex items-center justify-center" style={{ backgroundColor: status.color }} initial={{ width: 0 }} whileInView={{ width: `${status.percentage}%` }} transition={{ duration: 0.6, ease: "easeOut", delay: index * 0.05 }} viewport={{ once: true, amount: 0.5 }}>
//                     {status.percentage > 10 && <span className="text-xs font-semibold text-white px-1">{Math.round(status.percentage)}%</span>}
//                   </motion.div>
//                 ))}
//               </div>
//             </div>
//           ))}
//         </div>
//       </Card>
//     </motion.div>
//   );
// };

// // --- SKELETON LOADERS ---

// // Defines the base skeleton block used by all other skeletons
// const SkeletonBlock = ({ className }) => (
//   <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
// );

// const HeaderSkeleton = () => (
//   <div className="mb-6 px-1">
//     <div className="flex items-center justify-between">
//       <div>
//         <SkeletonBlock className="h-8 w-48 mb-2" />
//         <SkeletonBlock className="h-4 w-64" />
//       </div>
//       <div>
//         <SkeletonBlock className="h-7 w-32 rounded-full" />
//       </div>
//     </div>
//   </div>
// );

// const ScopeSkeleton = () => (
//   <div className="h-full mb-4 p-5 border border-gray-200 rounded-lg bg-white">
//     <SkeletonBlock className="h-6 w-40 mb-6" />
//     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
//       <div className="grid grid-cols-4 gap-3">
//         <SkeletonBlock className="h-24" />
//         <SkeletonBlock className="h-24" />
//         <SkeletonBlock className="h-24" />
//         <SkeletonBlock className="h-24" />
//       </div>
//       <div className="flex justify-center items-center">
//         <SkeletonBlock className="h-36 w-36 rounded-full" />
//       </div>
//     </div>
//   </div>
// );

// const StatusSkeleton = () => (
//   <div className="h-full mb-4 p-10 border border-gray-200 rounded-lg bg-white">
//     <SkeletonBlock className="h-6 w-48 mb-3" />
//     <SkeletonBlock className="h-4 w-72 mb-6" />
//     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
//       <SkeletonBlock className="h-64 w-64 rounded-full mx-auto" />
//       <div className="space-y-4">
//         {[...Array(4)].map((_, i) => (
//           <div key={i}>
//             <div className="flex justify-between items-center mb-2">
//               <SkeletonBlock className="h-4 w-24" />
//               <SkeletonBlock className="h-4 w-12" />
//             </div>
//             <SkeletonBlock className="h-2 w-full" />
//           </div>
//         ))}
//       </div>
//     </div>
//   </div>
// );

// const ChartCardSkeleton = () => (
//   <div className="p-10 border border-gray-200 rounded-lg bg-white h-full">
//     <SkeletonBlock className="h-6 w-56 mb-8" />
//     <SkeletonBlock className="h-60 w-full" />
//   </div>
// );

// const ListCardSkeleton = () => (
//   <div className="p-10 border border-gray-200 rounded-lg bg-white">
//     <SkeletonBlock className="h-6 w-48 mb-8" />
//     <SkeletonBlock className="h-24 w-full" />
//   </div>
// );

// // --- MAIN SUMMARY COMPONENT ---

// const Summary = ({ projectId, projectName }) => {
//   // Initialize with NULL to distinguish "loading" from "empty"
//   const [projectData, setProjectData] = useState({
//     epics: null,
//     stories: null,
//     tasks: null,
//     bugs: null,
//     statuses: null,
//     users: null,
//     stage: null,
//   });

//   const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

//   useEffect(() => {
//     if (!projectId || !token) return;

//     const base = window.__APP_CONFIG__.PMS_BASE_URL;
//     const headers = { Authorization: `Bearer ${token}` };

//     // Helper to fetch and update state independently
//     const fetchData = (url, key) => {
//       axios.get(url, { headers })
//         .then(res => {
//           setProjectData(prev => ({
//             ...prev,
//             [key]: res.data || (key === 'stage' ? "INITIATION" : [])
//           }));
//         })
//         .catch(err => {
//           console.error(`Failed to fetch ${key}:`, err);
//           // Set to empty array on error so skeleton disappears and UI renders empty state
//           // This prevents infinite skeleton loading if backend returns 500
//           setProjectData(prev => ({ ...prev, [key]: [] }));
//         });
//     };

//     // 1. Fetch Project Details (Stage)
//     axios.get(`${base}/api/projects/${projectId}`, { headers })
//       .then(res => setProjectData(prev => ({ ...prev, stage: res.data?.currentStage || "INITIATION" })))
//       .catch(e => {
//         console.error("Failed to fetch project details:", e);
//         setProjectData(prev => ({ ...prev, stage: "UNKNOWN" }));
//       });

//     // 2. Fire other requests in parallel
//     fetchData(`${base}/api/projects/${projectId}/epics`, 'epics');
//     fetchData(`${base}/api/projects/${projectId}/stories`, 'stories');
//     fetchData(`${base}/api/projects/${projectId}/tasks`, 'tasks');
//     fetchData(`${base}/api/testing/bugs/projects/${projectId}/summaries`, 'bugs');
//     fetchData(`${base}/api/projects/${projectId}/statuses`, 'statuses');
//     fetchData(`${base}/api/projects/${projectId}/members-with-owner`, 'users');

//   }, [projectId, token]);

//   // Derived loading states
//   const isWorkItemsReady = projectData.stories && projectData.tasks && projectData.bugs && projectData.epics;
//   const isStatusesReady = projectData.statuses;
//   const isUsersReady = projectData.users;

//   // Combine all items only when available
//   const allWorkItems = useMemo(() => {
//     if (!isWorkItemsReady) return [];
//     return [...projectData.tasks, ...projectData.stories, ...projectData.bugs];
//   }, [projectData.tasks, projectData.stories, projectData.bugs, isWorkItemsReady]);

//   return (
//     <motion.div
//       className="bg-white mt-2 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"
//       initial={{ opacity: 0 }}
//       animate={{ opacity: 1 }}
//       transition={{ duration: 0.36 }}
//     >
//       {/* 1. Header Row */}
//       {!projectData.stage ? (
//         <HeaderSkeleton />
//       ) : (
//         <div className="mb-6 px-1">
//           <div className="flex items-center justify-between">
//             <div>
//               <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">
//                 {projectName || "Project"}
//               </h1>
//               <p className="text-sm text-slate-500 mt-0.5">
//                 Overview & progress at a glance
//               </p>
//             </div>
//             <div>
//               <span className="px-3 py-1 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
//                 Stage: {projectData.stage}
//               </span>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* 2. Scope & Progress */}
//       <div className="mb-4">
//         {(!isWorkItemsReady || !isStatusesReady) ? (
//           <ScopeSkeleton />
//         ) : (
//           <ScopeAndProgress
//             epics={projectData.epics}
//             stories={projectData.stories}
//             statuses={projectData.statuses}
//             bugs={projectData.bugs}
//             tasks={projectData.tasks}
//           />
//         )}
//       </div>

//       {/* 3. Status Overview */}
//       <div className="mb-4">
//         {(!isWorkItemsReady || !isStatusesReady) ? (
//           <StatusSkeleton />
//         ) : (
//           <StatusOverview workItems={allWorkItems} statuses={projectData.statuses} />
//         )}
//       </div>

//       {/* 4. Bottom Grid */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
//         <div className="h-full flex flex-col">
//            {/* Priority Distribution - Needs Work Items */}
//            {!isWorkItemsReady ? (
//               <ChartCardSkeleton />
//            ) : (
//               <PriorityDistribution
//                 tasks={projectData.tasks}
//                 stories={projectData.stories}
//                 bugs={projectData.bugs}
//               />
//            )}
//         </div>

//         <div className="flex flex-col gap-4">
//           {/* Types Of Work - Needs Work Items */}
//           {!isWorkItemsReady ? (
//             <ListCardSkeleton />
//           ) : (
//             <TypesOfWork
//               tasks={projectData.tasks}
//               stories={projectData.stories}
//               epics={projectData.epics}
//               bugs={projectData.bugs}
//             />
//           )}

//           {/* Team Workload - Needs Work Items AND Users */}
//           {(!isWorkItemsReady || !isUsersReady) ? (
//             <ListCardSkeleton />
//           ) : (
//             <TeamWorkload workItems={allWorkItems} users={projectData.users} />
//           )}
//         </div>
//       </div>

//       {/* 5. Epic Progress */}
//       <div className="my-4">
//         {(!isWorkItemsReady || !isStatusesReady) ? (
//           <ListCardSkeleton />
//         ) : (
//            <EpicProgress
//              epics={projectData.epics}
//              stories={projectData.stories}
//              tasks={projectData.tasks}
//              bugs={projectData.bugs}
//              statuses={projectData.statuses}
//            />
//         )}
//       </div>
//     </motion.div>
//   );
// };

// export default Summary;
