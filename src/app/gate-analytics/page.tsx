"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";

interface GateOverview {
  id: string;
  name: string;
  location: string;
  isActive: boolean;
  assignedGuard: {
    name: string;
    username: string;
    phone: string | null;
    isActive: boolean;
  } | null;
  todayVisitors: number;
  activeVisitors: number;
}

interface VisitorStatistics {
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
  totalVisitors: number;
  typeBreakdown: { [key: string]: number };
  gateStats: {
    gateId: string;
    gateName: string;
    count: number;
    percentage: number;
  }[];
  avgDurationMinutes: number;
  completedVisits: number;
  activeVisits: number;
}

interface PeakHours {
  peakHours: {
    hour: number;
    label: string;
    count: number;
  }[];
  hourlyData: {
    hour: number;
    label: string;
    count: number;
  }[];
  totalVisitors: number;
}

interface DailyTrend {
  trendData: {
    date: string;
    displayDate: string;
    total: number;
    types: { [type: string]: number };
  }[];
}

export default function GateAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "statistics" | "peak-hours" | "trend">(
    "overview"
  );
  const [gateOverview, setGateOverview] = useState<GateOverview[]>([]);
  const [statistics, setStatistics] = useState<VisitorStatistics | null>(null);
  const [peakHours, setPeakHours] = useState<PeakHours | null>(null);
  const [dailyTrend, setDailyTrend] = useState<DailyTrend | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statisticsPeriod, setStatisticsPeriod] = useState("30");
  const [peakHoursPeriod, setPeakHoursPeriod] = useState("30");
  const [trendPeriod, setTrendPeriod] = useState("7");

  useEffect(() => {
    fetchGateOverview();
  }, []);

  useEffect(() => {
    if (activeTab === "statistics") {
      fetchStatistics();
    } else if (activeTab === "peak-hours") {
      fetchPeakHours();
    } else if (activeTab === "trend") {
      fetchDailyTrend();
    }
  }, [activeTab, statisticsPeriod, peakHoursPeriod, trendPeriod]);

  const fetchGateOverview = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/gate-analytics/overview`);
      setGateOverview(response.data.gates);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch gate overview");
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(
        `/gate-analytics/visitor-statistics?days=${statisticsPeriod}`
      );
      setStatistics(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch statistics");
    } finally {
      setLoading(false);
    }
  };

  const fetchPeakHours = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(
        `/gate-analytics/peak-hours?days=${peakHoursPeriod}`
      );
      setPeakHours(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch peak hours");
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyTrend = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(
        `/gate-analytics/daily-trend?days=${trendPeriod}`
      );
      setDailyTrend(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch daily trend");
    } finally {
      setLoading(false);
    }
  };

  const getGateStatusBadge = (isActive: boolean) => {
    return isActive
      ? "bg-approved-bg text-approved-fg"
      : "bg-denied-bg text-denied-fg";
  };

  const getGuardStatusBadge = (isActive: boolean) => {
    return isActive
      ? "bg-info-bg text-info-fg"
      : "bg-surface-elevated text-fg-primary";
  };

  const visitorTypeColors: { [key: string]: string } = {
    GUEST: "bg-brand-primary",
    DELIVERY: "bg-approved-solid",
    SERVICE: "bg-pending-solid",
    VENDOR: "bg-brand-primary",
  };

  return (
    <AppShell title="Gate & Visitor Analytics">
      <div className="space-y-6">
        <p className="text-fg-secondary -mt-2">Real-time monitoring of gates, guards, and visitor patterns</p>

        {/* Tabs */}
        <div className="tabs">
          {[
            { id: "overview", label: "Gate Overview" },
            { id: "statistics", label: "Visitor Statistics" },
            { id: "peak-hours", label: "Peak Hours" },
            { id: "trend", label: "Daily Trend" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`tab ${activeTab === tab.id ? "tab-active" : "tab-inactive"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-denied-bg border border-brand-danger/30 text-denied-fg px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="card">
            <div className="loading-state">
              <div className="loading-spinner w-10 h-10"></div>
              <p className="loading-state-text">Loading data...</p>
            </div>
          </div>
        )}

        {/* Gate Overview Tab */}
        {!loading && activeTab === "overview" && (
          <div>
            <div className="page-action-bar">
              <h2 className="text-xl font-semibold">Real-Time Gate Status</h2>
              <button onClick={fetchGateOverview} className="btn btn-ghost">
                Refresh
              </button>
            </div>

            {gateOverview.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <span className="empty-state-icon">🚪</span>
                  <p className="empty-state-title">No gates found</p>
                  <p className="empty-state-text">Configure gates in the Gates section first.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gateOverview.map((gate) => (
                  <div
                    key={gate.id}
                    className="card p-6 border-t-4 border-brand-primary"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-fg-primary">
                          {gate.name}
                        </h3>
                        <p className="text-sm text-fg-secondary">{gate.location}</p>
                      </div>
                      <span
                        className={`px-3 py-1 text-xs rounded-full ${getGateStatusBadge(
                          gate.isActive
                        )}`}
                      >
                        {gate.isActive ? "✅ Active" : "⛔ Inactive"}
                      </span>
                    </div>

                    {/* Guard Info */}
                    <div className="mb-4 pb-4 border-b">
                      <p className="text-xs font-semibold text-fg-secondary mb-2">
                        ASSIGNED GUARD
                      </p>
                      {gate.assignedGuard ? (
                        <div>
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-fg-primary">
                              {gate.assignedGuard.name}
                            </p>
                            <span
                              className={`px-2 py-1 text-xs rounded ${getGuardStatusBadge(
                                gate.assignedGuard.isActive
                              )}`}
                            >
                              {gate.assignedGuard.isActive ? "On Duty" : "Off Duty"}
                            </span>
                          </div>
                          <p className="text-xs text-fg-secondary font-mono">
                            @{gate.assignedGuard.username}
                          </p>
                          {gate.assignedGuard.phone && (
                            <p className="text-xs text-fg-secondary">
                              📞 {gate.assignedGuard.phone}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-fg-tertiary italic">No guard assigned</p>
                      )}
                    </div>

                    {/* Visitor Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-brand-primary-light rounded">
                        <p className="text-2xl font-bold text-brand-primary">
                          {gate.todayVisitors}
                        </p>
                        <p className="text-xs text-fg-secondary">Today's Visitors</p>
                      </div>
                      <div className="text-center p-3 bg-approved-bg rounded">
                        <p className="text-2xl font-bold text-approved-solid">
                          {gate.activeVisitors}
                        </p>
                        <p className="text-xs text-fg-secondary">Active Now</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Visitor Statistics Tab */}
        {!loading && activeTab === "statistics" && statistics && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Visitor Statistics</h2>
              <select
                value={statisticsPeriod}
                onChange={(e) => setStatisticsPeriod(e.target.value)}
                className="input w-auto"
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
              </select>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="stat-card">
                <p className="text-sm text-fg-secondary mb-1">Total Visitors</p>
                <p className="text-3xl font-bold text-brand-primary">
                  {statistics.totalVisitors}
                </p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-fg-secondary mb-1">Active Now</p>
                <p className="text-3xl font-bold text-approved-solid">
                  {statistics.activeVisits}
                </p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-fg-secondary mb-1">Completed</p>
                <p className="text-3xl font-bold text-fg-primary">
                  {statistics.completedVisits}
                </p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-fg-secondary mb-1">Avg Duration</p>
                <p className="text-3xl font-bold text-brand-primary">
                  {statistics.avgDurationMinutes}m
                </p>
              </div>
            </div>

            {/* By Type */}
            <div className="bg-surface rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Visitors by Type</h3>
              <div className="space-y-3">
                {Object.entries(statistics.typeBreakdown).map(([type, count]) => {
                  const percentage =
                    statistics.totalVisitors > 0
                      ? Math.round((count / statistics.totalVisitors) * 100)
                      : 0;
                  return (
                    <div key={type}>
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-fg-primary">{type}</span>
                        <span className="text-fg-secondary">
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-surface-elevated rounded-full h-3">
                        <div
                          className={`h-3 rounded-full ${
                            visitorTypeColors[type] || "bg-fg-secondary"
                          }`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* By Gate */}
            <div className="stat-card">
              <h3 className="text-lg font-semibold mb-4">Visitors by Gate</h3>
              <div className="space-y-4">
                {statistics.gateStats.map((gate) => (
                  <div key={gate.gateId}>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium text-fg-primary">
                        {gate.gateName}
                      </span>
                      <span className="text-fg-secondary">
                        {gate.count} ({gate.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-surface-elevated rounded-full h-4">
                      <div
                        className="bg-brand-primary h-4 rounded-full"
                        style={{ width: `${gate.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Peak Hours Tab */}
        {!loading && activeTab === "peak-hours" && peakHours && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Peak Hour Analysis</h2>
              <select
                value={peakHoursPeriod}
                onChange={(e) => setPeakHoursPeriod(e.target.value)}
                className="input w-auto"
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
              </select>
            </div>

            {/* Top 3 Peak Hours */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {peakHours.peakHours.map((peak, index) => (
                <div
                  key={peak.hour}
                  className="bg-surface rounded-lg shadow p-6 text-center border-t-4 border-yellow-500"
                >
                  <p className="text-sm text-fg-secondary mb-2">
                    #{index + 1} Peak Hour
                  </p>
                  <p className="text-3xl font-bold text-fg-primary mb-1">
                    {peak.label}
                  </p>
                  <p className="text-xl text-pending-solid font-semibold">
                    {peak.count} visitors
                  </p>
                </div>
              ))}
            </div>

            {/* Hourly Chart */}
            <div className="stat-card">
              <h3 className="text-lg font-semibold mb-4">Hourly Distribution</h3>
              <div className="space-y-2">
                {peakHours.hourlyData.map((hour) => {
                  const maxCount = Math.max(
                    ...peakHours.hourlyData.map((h) => h.count)
                  );
                  const widthPercentage =
                    maxCount > 0 ? (hour.count / maxCount) * 100 : 0;
                  return (
                    <div key={hour.hour} className="flex items-center">
                      <div className="w-24 text-sm text-fg-primary font-medium">
                        {hour.label}
                      </div>
                      <div className="flex-1 ml-4">
                        <div className="w-full bg-surface-elevated rounded h-8 relative">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-8 rounded flex items-center px-3"
                            style={{ width: `${widthPercentage}%` }}
                          >
                            {hour.count > 0 && (
                              <span className="text-white text-sm font-semibold">
                                {hour.count}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Daily Trend Tab */}
        {!loading && activeTab === "trend" && dailyTrend && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Daily Visitor Trend</h2>
              <select
                value={trendPeriod}
                onChange={(e) => setTrendPeriod(e.target.value)}
                className="input w-auto"
              >
                <option value="7">Last 7 Days</option>
                <option value="14">Last 14 Days</option>
                <option value="30">Last 30 Days</option>
              </select>
            </div>

            <div className="stat-card">
              <div className="space-y-4">
                {dailyTrend.trendData.map((day) => {
                  const maxTotal = Math.max(
                    ...dailyTrend.trendData.map((d) => d.total)
                  );
                  const widthPercentage =
                    maxTotal > 0 ? (day.total / maxTotal) * 100 : 0;

                  return (
                    <div key={day.date}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-fg-primary w-24">
                          {day.displayDate}
                        </span>
                        <span className="text-fg-secondary text-sm">
                          {day.total} visitors
                        </span>
                      </div>
                      <div className="w-full bg-surface-elevated rounded h-8">
                        <div
                          className="bg-gradient-to-r from-green-500 to-green-600 h-8 rounded flex items-center px-3"
                          style={{ width: `${widthPercentage}%` }}
                        >
                          {day.total > 0 && (
                            <span className="text-white text-sm font-semibold">
                              {day.total}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Type breakdown */}
                      {Object.keys(day.types).length > 0 && (
                        <div className="flex gap-3 mt-1 ml-24">
                          {Object.entries(day.types).map(([type, count]) => (
                            <span
                              key={type}
                              className="text-xs text-fg-secondary"
                            >
                              {type}: {count}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
