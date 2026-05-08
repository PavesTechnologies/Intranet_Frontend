// ProjectStatusReport.jsx
import React, { useMemo, useRef, useState } from 'react';
import FilterListbox from '../../../components/filter/FilterListbox';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';

const COLORS = ['#4f46e5', '#06b6d4', '#f97316', '#10b981', '#ef4444'];

export default function ProjectStatusReport({ projectData }) {
  if (!projectData || !projectData.project) {
    return <div>Loading report data...</div>;
  }

  const [filterAssignee, setFilterAssignee] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterFrom, setFilterFrom] = useState(projectData.project.startDate);
  const [filterTo, setFilterTo] = useState(projectData.project.endDate);
  const reportRef = useRef();

  const assignees = useMemo(() => {
    const uniqueAssignees = new Map();
    projectData.issues.forEach(issue => {
      let a = issue.assignee;
      if (!a) return;
      if (typeof a === 'object' && a.id && a.name) {
        uniqueAssignees.set(a.id, { id: a.id, name: a.name });
      } else if (typeof a === 'string') {
        uniqueAssignees.set(a, { id: a, name: a });
      }
    });
    return [{ id: 'all', name: 'All' }, ...Array.from(uniqueAssignees.values())];
  }, [projectData]);

  const statuses = useMemo(() => {
    const uniqueStatuses = new Set(
      projectData.issues.map(i => i.status?.trim().toUpperCase()).filter(Boolean)
    );
    return ['All', ...Array.from(uniqueStatuses)];
  }, [projectData]);

  const filteredIssues = useMemo(() => {
    return projectData.issues.filter(i => {
      if (filterAssignee && filterAssignee.toLowerCase() !== 'all') {
        const a = i.assignee;
        if (!a || (typeof a === 'object' && !a.id) || (typeof a === 'string' && a.trim() === '')) {
          return false;
        }
        const assigneeId = typeof a === 'object' ? a.id : a;
        if (String(assigneeId) !== String(filterAssignee)) return false;
      }
      if (filterStatus && filterStatus.toLowerCase() !== 'all') {
        if (!i.status || i.status.trim().toLowerCase() !== filterStatus.trim().toLowerCase()) {
          return false;
        }
      }
      if (i.created) {
        const createdDate = new Date(i.created);
        if (!isNaN(createdDate)) {
          if (createdDate < new Date(filterFrom)) return false;
          if (createdDate > new Date(filterTo)) return false;
        }
      }
      return true;
    });
  }, [filterAssignee, filterStatus, filterFrom, filterTo, projectData]);

  const statusDistribution = useMemo(() => {
    const counts = {};
    filteredIssues.forEach(i => (counts[i.status] = (counts[i.status] || 0) + 1));
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredIssues]);

  const storyPointsData = useMemo(() => {
    const map = {};
    filteredIssues.forEach(i => {
      const a = i.assignee || 'Unassigned';
      if (!map[a]) map[a] = { assignee: a, storyPoints: 0 };
      map[a].storyPoints += i.storyPoints || 0;
    });
    return Object.values(map);
  }, [filteredIssues]);

  function downloadCSV() {
    const headers = ['ID', 'Title', 'Assignee', 'Type', 'Status', 'StoryPoints', 'Estimate', 'Created'];
    const rows = filteredIssues.map(i => [
      i.id,
      i.title,
      i.assignee?.name || i.assignee,
      i.type,
      i.status,
      i.storyPoints,
      i.estimate,
      i.created,
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${projectData.project.name.replace(/\s+/g, '_')}_report.csv`);
  }

  async function downloadPDF() {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${projectData.project.name.replace(/\s+/g, '_')}_status_report.pdf`);
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans text-sm">
      <div className="max-w-6xl mx-auto">
        {/* ✅ Sticky Top Navbar */}
        <header className="flex items-center justify-between mb-4 sticky top-0 bg-white z-50 shadow-sm p-4 rounded">
          <h1 className="text-2xl font-semibold">
            Project Status Report — {projectData.project.name}
          </h1>
          <div className="flex gap-2">
            <button
              onClick={downloadCSV}
              className="px-3 py-2 rounded shadow-sm border hover:bg-gray-100"
            >
              Download CSV
            </button>
            <button
              onClick={downloadPDF}
              className="px-3 py-2 rounded bg-indigo-600 text-white shadow-sm hover:opacity-90"
            >
              Download PDF
            </button>
          </div>
        </header>

        {/* ✅ Sticky Filters Section */}
        <section className="mb-4 p-4 h-auto bg-white rounded-lg shadow-sm  top-[70px] z-40">
          <div className="flex gap-4 h-auto flex-wrap items-center">
            <div className="w-72">
              <label className="block text-xs text-gray-600">Assignee</label>
              <div className="mt-1">
                <FilterListbox
                  options={assignees.map(a => ({ value: a.id, label: a.name }))}
                  value={filterAssignee}
                  onChange={setFilterAssignee}
                />
              </div>
            </div>
            <div className="w-56">
              <label className="block text-xs text-gray-600">Status</label>
              <div className="mt-1">
                <FilterListbox
                  options={statuses.map(s => ({ value: s, label: s }))}
                  value={filterStatus}
                  onChange={setFilterStatus}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600">From</label>
              <input
                type="date"
                value={filterFrom}
                onChange={e => setFilterFrom(e.target.value)}
                className="mt-1 border rounded p-2"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600">To</label>
              <input
                type="date"
                value={filterTo}
                onChange={e => setFilterTo(e.target.value)}
                className="mt-1 border rounded p-2"
              />
            </div>
            <div className="ml-auto text-right">
              <div className="text-xs text-gray-500">Report Period</div>
              <div className="font-medium">
                {filterFrom} &rarr; {filterTo}
              </div>
            </div>
          </div>
        </section>

        {/* ✅ Main Report Content */}
        <div ref={reportRef} className="space-y-4">
          {/* Overview Section */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded shadow-sm">
              <div className="text-xs text-gray-500">Project Status</div>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">{projectData.project.status}</div>
                  <div className="text-xs text-gray-500">
                    {projectData.project.startDate} &rarr; {projectData.project.endDate}
                  </div>
                </div>
                <div className="w-28 text-right">
                  <div className="text-sm font-medium">{projectData.project.progress}%</div>
                </div>
              </div>
              <div className="mt-3 w-full bg-gray-100 rounded h-3 overflow-hidden">
                <div
                  style={{ width: `${projectData.project.progress}%` }}
                  className="h-3 bg-indigo-600"
                ></div>
              </div>
            </div>

            <div className="p-4 bg-white rounded shadow-sm">
              <div className="text-xs text-gray-500">Estimates (Story Points)</div>
              <div className="mt-2 text-lg font-semibold">
                Estimated: {projectData.sprints.reduce((s, sp) => s + sp.storyPoints.estimated, 0)}
              </div>
              <div className="text-sm text-gray-600">
                Completed: {projectData.sprints.reduce((s, sp) => s + sp.storyPoints.completed, 0)}
              </div>
              <div className="text-sm text-gray-600">
                Remaining:{' '}
                {projectData.sprints.reduce(
                  (s, sp) => s + (sp.storyPoints.estimated - sp.storyPoints.completed),
                  0
                )}
              </div>
            </div>

            <div className="p-4 bg-white rounded shadow-sm">
              <div className="text-xs text-gray-500">Top Risks</div>
              <ul className="mt-2 space-y-2">
                {projectData.project.risks.length > 0 ? (
                  projectData.project.risks.map(r => (
                    <li key={r.id} className="flex justify-between items-center">
                      <div className="text-sm">{r.title}</div>
                      <div
                        className={`text-xs px-2 py-1 rounded ${
                          r.severity === 'High'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {r.severity}
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-gray-500">No risks reported</li>
                )}
              </ul>
            </div>
          </section>

          {/* Charts */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded shadow-sm md:col-span-2">
              <div className="text-sm font-medium mb-2">Story Points by Assignee</div>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={storyPointsData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                    <XAxis dataKey="assignee" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="storyPoints" fill="#4f46e5" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-4 bg-white rounded shadow-sm">
              <div className="text-sm font-medium mb-2">Status Distribution</div>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      label
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Table */}
          <section className="bg-white rounded shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium">Detailed Issues</div>
              <div className="text-xs text-gray-500">{filteredIssues.length} items</div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y">
                <thead className="text-xs text-gray-600 uppercase">
                  <tr>
                    {/* <th className="px-3 py-2 text-left">ID</th> */}
                    <th className="px-3 py-2 text-left">Title</th>
                    <th className="px-3 py-2 text-left">Assignee</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-right">SP</th>
                    <th className="px-3 py-2 text-right">Estimate</th>
                    <th className="px-3 py-2 text-left">Created</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredIssues.map(i => (
                    <tr key={`${i.id}-${i.type}`} className="border-t">
                      {/* <td className="px-3 py-2">{i.id ?? '-'}</td> */}
                      <td className="px-3 py-2">{i.title ?? '-'}</td>
                      <td className="px-3 py-2">{i.assignee?.name || i.assignee || '-'}</td>
                      <td className="px-3 py-2">{i.type ?? '-'}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={i.status} />
                      </td>
                      <td className="px-3 py-2 text-right">{i.storyPoints ?? '-'}</td>
                      <td className="px-3 py-2 text-right">{i.estimate ?? '-'}</td>
                      <td className="px-3 py-2">{i.created ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <footer className="mt-6 text-xs text-gray-500">
          Generated: {new Date().toISOString().slice(0, 19).replace('T', ' ')}
        </footer>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    DONE: 'bg-green-100 text-green-700',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
    TODO: 'bg-gray-100 text-gray-700',
  };
  return (
    <span className={`px-2 py-1 rounded text-xs ${map[status] || 'bg-gray-100 text-gray-700'}`}>
      {status?.replace('_', ' ')}
    </span>
  );
}
