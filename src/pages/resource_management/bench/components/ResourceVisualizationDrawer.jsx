import React from 'react';
import { X, User, BarChart2, PieChart as PieChartIcon, Monitor } from 'lucide-react';
import LoadingSpinner from "../../../../components/LoadingSpinner";
import OverallVisualization from './OverallVisualization';
import ProjectContributionVisualization from './ProjectContributionVisualization';

const ResourceVisualizationDrawer = ({
    selectedResource,
    onClose,
    projectsDrawerTab,
    setProjectsDrawerTab,
    isProjectsLoading,
    resourceProjectsData
}) => {
    if (!selectedResource) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-sm transition-all">
            <div className="w-[500px] h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 relative">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <User size={18} className="text-indigo-600" />
                            {selectedResource.userName}
                        </h2>
                        <p className="text-[11px] font-medium text-slate-500 mt-1 capitalize tracking-widest">Resource Visualization</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>
                
                <div className="px-6 border-b border-slate-200">
                    <div className="flex items-center gap-6 pt-3">
                        <button 
                            onClick={() => setProjectsDrawerTab('overall')}
                            className={`pb-3 border-b-2 transition-colors ${projectsDrawerTab === 'overall' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'} text-sm font-bold flex items-center gap-2`}
                        >
                            <PieChartIcon size={16} /> Overall Breakdown
                        </button>
                        <button 
                            onClick={() => setProjectsDrawerTab('projects')}
                            className={`pb-3 border-b-2 transition-colors ${projectsDrawerTab === 'projects' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'} text-sm font-bold flex items-center gap-2`}
                        >
                            <BarChart2 size={16} /> Project Contribution
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-[#FDFDFE]">
                    {isProjectsLoading ? (
                        <div className="h-full flex items-center justify-center">
                            <LoadingSpinner text="Fetching Project Details..." />
                        </div>
                    ) : resourceProjectsData.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <Monitor size={32} className="mb-4 opacity-50" />
                            <p className="text-sm font-bold">No project details found.</p>
                        </div>
                    ) : (
                        <>
                            {projectsDrawerTab === 'overall' && (
                                <OverallVisualization projects={resourceProjectsData} />
                            )}
                            {projectsDrawerTab === 'projects' && (
                                <ProjectContributionVisualization projects={resourceProjectsData} />
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResourceVisualizationDrawer;
