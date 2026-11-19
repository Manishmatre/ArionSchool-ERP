import React, { useState, useEffect } from 'react';
import {
  FiRefreshCw, FiAlertTriangle, FiCheckCircle,
  FiTrendingUp, FiDollarSign, FiUsers, FiClock
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';
import { toast } from 'react-toastify';
import { getDashboardAiInsights } from '../../api/aiApi';
import { useBranding } from '../../context/BrandingContext';

export default function DashboardAiInsights() {
  const { branding, schoolName } = useBranding();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInsights = async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      const res = await getDashboardAiInsights({
        schoolName: schoolName || branding?.schoolName || 'SES Educare'
      });
      if (res.data?.success) {
        setInsights(res.data.data);
        if (showToast) toast.success('AI Insights updated successfully');
      }
    } catch (err) {
      console.error('Failed to load AI Insights:', err);
      if (showToast) toast.error('Could not refresh AI insights');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs animate-pulse">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-slate-200" />
          <div className="h-4 bg-slate-200 rounded w-1/3" />
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-slate-100 rounded w-full" />
          <div className="h-3 bg-slate-100 rounded w-4/5" />
        </div>
      </div>
    );
  }

  if (!insights) return null;

  return (
    <div className="bg-gradient-to-br from-white to-slate-50/60 rounded-xl border border-slate-200/90 shadow-xs p-5 mb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/70">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
            <HiSparkles className="w-5 h-5 text-amber-200" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 tracking-tight">
                AI Operational Intelligence
              </h3>
              <span className="px-2 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 font-bold rounded-full">
                LIVE
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center space-x-1.5 mt-0.5">
              <FiClock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Updated: {insights.timestamp ? new Date(insights.timestamp).toLocaleTimeString() : 'Just now'}
              </span>
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchInsights(true)}
          disabled={refreshing}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg shadow-2xs transition self-start sm:self-auto"
        >
          <FiRefreshCw className={`w-3.5 h-3.5 text-primary-600 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Analyzing...' : 'Refresh AI'}</span>
        </button>
      </div>

      {/* Main Executive Summary */}
      <div className="mt-4 p-3.5 bg-primary-50/50 border border-primary-100/80 rounded-xl text-xs sm:text-sm text-primary-950 font-medium leading-relaxed">
        {insights.summary}
      </div>

      {/* Metrics & Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* Attendance Insight */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 mb-1.5">
            <FiUsers className="w-4 h-4 text-primary-600" />
            <span>Attendance Intelligence</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {insights.attendanceInsight}
          </p>
          {insights.metrics?.todayAttendance && (
            <div className="mt-3 flex items-center space-x-3 text-[11px] font-semibold text-slate-500">
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                {insights.metrics.todayAttendance.percentage}% Present
              </span>
              <span>
                {insights.metrics.todayAttendance.absent} Absentees today
              </span>
            </div>
          )}
        </div>

        {/* Financial Insight */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 mb-1.5">
            <FiDollarSign className="w-4 h-4 text-emerald-600" />
            <span>Fee & Finance Intelligence</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {insights.financialInsight}
          </p>
          {insights.metrics?.finances && (
            <div className="mt-3 flex items-center space-x-3 text-[11px] font-semibold text-slate-500">
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-200">
                INR {insights.metrics.finances.pendingFees.toLocaleString('en-IN')} Outstanding
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Operational Alerts & Suggested Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-3 border-t border-slate-100">
        {/* Alerts */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
            <FiAlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Operational Alerts</span>
          </h4>
          <ul className="space-y-1.5">
            {insights.operationalAlerts?.map((alert, idx) => (
              <li key={idx} className="text-xs text-slate-600 flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <span>{alert}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Suggested Actions */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
            <FiCheckCircle className="w-3.5 h-3.5 text-primary-500" />
            <span>Recommended Actions</span>
          </h4>
          <ul className="space-y-1.5">
            {insights.suggestedActions?.map((action, idx) => (
              <li key={idx} className="text-xs text-slate-600 flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 shrink-0" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
