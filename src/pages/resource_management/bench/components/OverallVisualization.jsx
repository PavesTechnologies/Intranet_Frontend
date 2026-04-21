import React from 'react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

const OverallVisualization = ({ projects }) => {
    let billable = 0, nonBillable = 0, internal = 0;
    projects.forEach(p => {
        if (p.projectId === -1 || p.projectName.toLowerCase().includes('internal')) {
            internal += p.totalHours;
        } else {
            billable += p.billableHours;
            nonBillable += p.nonBillableHours;
        }
    });

    const data = [
        { name: 'Billable', value: parseFloat(billable.toFixed(2)), color: '#4f46e5' },
        { name: 'Non-Billable', value: parseFloat(nonBillable.toFixed(2)), color: '#818cf8' },
        { name: 'Internal', value: parseFloat(internal.toFixed(2)), color: '#cbd5e1' }
    ].filter(d => d.value > 0);

    return (
        <div className="flex flex-col items-center mt-12 mb-16 px-4">
            <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-6">Aggregate Hour Distribution</h3>

            {data.length > 0 ? (
                <>
                    <div className="w-full h-52">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip
                                    formatter={(value) => [`${value} hrs`, 'Hours']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-3 gap-6 w-full mt-16 px-4">
                        {data.map(d => (
                            <div key={d.name} className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm flex flex-col items-center">
                                <div className="w-3 h-3 rounded-full mb-2" style={{ backgroundColor: d.color }}></div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{d.name}</span>
                                <span className="text-lg font-black text-slate-900 mt-1">{d.value}</span>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <p className="text-sm font-medium text-slate-400">No hours recorded.</p>
            )}
        </div>
    )
};

export default OverallVisualization;
