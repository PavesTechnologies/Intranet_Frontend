import React from 'react';
import { NavLink } from 'react-router-dom';
import { ShieldAlert, Users, Briefcase, PieChart } from 'lucide-react';

const UtilizationNavbar = () => {
   const navItems = [
      { path: '/resource-management/bench/utilization-governance', label: 'Governance Breaches', icon: <ShieldAlert size={18} /> },
      { path: '/resource-management/bench/utilization-resource', label: 'Resource Registry', icon: <Users size={18} /> },
      { path: '/resource-management/bench/utilization-portfolio', label: 'Portfolio Yield', icon: <Briefcase size={18} /> },
      { path: '/resource-management/bench/utilization-projects', label: 'Role & Client Yield', icon: <PieChart size={18} /> },
   ];

   return (
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
         <div className="max-w-[1600px] mx-auto px-8">
            <div className="flex items-center justify-between h-16">
               <div className="flex items-center gap-8">
                  <h1 className="text-[14px] font-black text-slate-900 uppercase tracking-[0.2em] border-r border-slate-200 pr-8 mr-2">
                     Utilization <span className="text-indigo-600">Intelligence</span>
                  </h1>
                  <nav className="flex items-center gap-1">
                     {navItems.map((item) => (
                        <NavLink
                           key={item.path}
                           to={item.path}
                           className={({ isActive }) => `
                              flex items-center gap-2.5 px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300
                              ${isActive 
                                 ? 'bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100 scale-105' 
                                 : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}
                           `}
                        >
                           {item.icon}
                           {item.label}
                        </NavLink>
                     ))}
                  </nav>
               </div>
               <div className="flex items-center gap-4">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Engine Connected</span>
               </div>
            </div>
         </div>
      </div>
   );
};

export default UtilizationNavbar;
