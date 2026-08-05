import React from "react";
import {
  Clock,
  CalendarDays,
  Scale,
  FolderKanban,
  Plane,
  CalendarCheck,
} from "lucide-react";

/**
 * KPI summary cards
 */
const KPICards = ({ kpis }) => {
  return (
    <div className="kpi-grid">
      <div className="kpi-card kpi-card-indigo">
        <div className="flex items-start gap-3">
          <span className="kpi-icon kpi-icon-indigo">
            <Clock size={20} />
          </span>
          <div className="min-w-0">
            <p className="kpi-label">Total Hours Logged</p>
            <p className="kpi-value kpi-value-indigo">
              {kpis.monthlyTotalAdjusted.toFixed(1)} hours
            </p>
          </div>
        </div>
      </div>

      <div className="kpi-card kpi-card-purple">
        <div className="flex items-start gap-3">
          <span className="kpi-icon kpi-icon-purple">
            <CalendarDays size={20} />
          </span>
          <div className="min-w-0">
            <p className="kpi-label">Total Working Days</p>
            <p className="kpi-value kpi-value-purple">
              {kpis.totalWorkingDays || 0} Days
            </p>
          </div>
        </div>
      </div>

      <div className="kpi-card kpi-card-green">
        <div className="flex items-start gap-3">
          <span className="kpi-icon kpi-icon-green">
            <Scale size={20} />
          </span>
          <div className="min-w-0">
            <p className="kpi-label">Billable vs Non-Billable</p>
            <p className="kpi-value kpi-value-green">
              {kpis.monthlyBillableHours} / {kpis.monthlyNonBillableHours} hours
            </p>
          </div>
        </div>
      </div>

      <div className="kpi-card kpi-card-sky">
        <div className="flex items-start gap-3">
          <span className="kpi-icon kpi-icon-sky">
            <FolderKanban size={20} />
          </span>
          <div className="min-w-0">
            <p className="kpi-label">Current Active Projects</p>
            <p className="kpi-value kpi-value-sky">
              {kpis.activeProjectsCount} Projects
            </p>
          </div>
        </div>
      </div>

      <div className="kpi-card kpi-card-amber">
        <div className="flex items-start gap-3">
          <span className="kpi-icon kpi-icon-amber">
            <Plane size={20} />
          </span>
          <div className="min-w-0">
            <p className="kpi-label">Total Leaves</p>
            <p className="kpi-value kpi-value-amber">
              {kpis.leaves?.days || 0} Days
            </p>
          </div>
        </div>
      </div>

      <div className="kpi-card kpi-card-rose">
        <div className="flex items-start gap-3">
          <span className="kpi-icon kpi-icon-rose">
            <CalendarCheck size={20} />
          </span>
          <div className="min-w-0">
            <p className="kpi-label">Total Monthly Holidays</p>
            <p className="kpi-value kpi-value-rose">
              {kpis.holidays?.days || 0} Days
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KPICards;
