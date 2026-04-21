import React from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, Bar } from 'recharts';

const ProjectContributionVisualization = ({ projects }) => {
    const data = projects.map(p => ({
        name: p.projectName.length > 15 ? p.projectName.substring(0, 15) + '...' : p.projectName,
        fullName: p.projectName,
        Billable: p.billableHours,
        'Non-Billable': p.nonBillableHours
    }));

    return (
        <div className="mt-12 mb-16 flex flex-col gap-12 px-4">
            <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest text-center">Project Hour Distribution</h3>
            <div className="w-full h-64 px-2">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tickMargin={10}
                            tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600, dy: 8, dx: -7 }}
                            angle={-45}
                            textAnchor="end"
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                        />
                        <RechartsTooltip
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            labelStyle={{ fontWeight: 'bold', color: '#0f172a' }}
                        />
                        <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '20px' }} iconType="circle" />
                        <Bar dataKey="Billable" stackId="a" fill="#4f46e5" radius={[0, 0, 4, 4]} maxBarSize={40} />
                        <Bar dataKey="Non-Billable" stackId="a" fill="#818cf8" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-xl mx-2 shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Project</th>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Billable</th>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Non-Billable</th>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Util %</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {projects.map((p, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="px-4 py-3 text-[11px] font-bold text-slate-700">{p.projectName}</td>
                                <td className="px-4 py-3 text-[11px] font-medium text-slate-600 text-right">{p.billableHours}h</td>
                                <td className="px-4 py-3 text-[11px] font-medium text-slate-600 text-right">{p.nonBillableHours}h</td>
                                <td className="px-4 py-3 text-[11px] font-black text-indigo-600 text-right">{p.utilizationPercentage}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
};

export default ProjectContributionVisualization;
