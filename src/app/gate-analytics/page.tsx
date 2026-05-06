"use client";

import { useEffect, useState } from "react";
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
      ? "bg-green-100 text-green-800"
      : "bg-red-100 text-red-800";
  };

  const getGuardStatusBadge = (isActive: boolean) => {
    return isActive
      ? "bg-blue-100 text-blue-800"
      : "bg-gray-100 text-gray-800";
  };

  const visitorTypeColors: { [key: string]: string } = {
    GUEST: "bg-blue-500",
    DELIVERY: "bg-green-500",
    SERVICE: "bg-yellow-500",
    VENDOR: "bg-purple-500",
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🚪 Gate & Visitor Analytics
          </h1>
          <p className="text-gray-600">
            Real-time monitoring of gates, guards, and visitor patterns
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-6 py-3 font-medium ${
                activeTab === "overview"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              🏛️ Gate Overview
            </button>
            <button
              onClick={() => setActiveTab("statistics")}
              className={`px-6 py-3 font-medium ${
                activeTab === "statistics"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              📊 Visitor Statistics
            </button>
            <button
              onClick={() => setActiveTab("peak-hours")}
              className={`px-6 py-3 font-medium ${
                activeTab === "peak-hours"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              ⏰ Peak Hours
            </button>
            <button
              onClick={() => setActiveTab("trend")}
              className={`px-6 py-3 font-medium ${
                activeTab === "trend"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              📈 Daily Trend
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading data...</p>
          </div>
        )}

        {/* Gate Overview Tab */}
        {!loading && activeTab === "overview" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Real-Time Gate Status</h2>
              <button
                onClick={fetchGateOverview}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                🔄 Refresh
              </button>
            </div>

            {gateOverview.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">No gates found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gateOverview.map((gate) => (
                  <div
                    key={gate.id}
                    className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-blue-600"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {gate.name}
                        </h3>
                        <p className="text-sm text-gray-600">{gate.location}</p>
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
                      <p className="text-xs font-semibold text-gray-500 mb-2">
                        ASSIGNED GUARD
                      </p>
                      {gate.assignedGuard ? (
                        <div>
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-gray-900">
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
                          <p className="text-xs text-gray-500 font-mono">
                            @{gate.assignedGuard.username}
                          </p>
                          {gate.assignedGuard.phone && (
                            <p className="text-xs text-gray-600">
                              📞 {gate.assignedGuard.phone}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-400 italic">No guard assigned</p>
                      )}
                    </div>

                    {/* Visitor Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded">
                        <p className="text-2xl font-bold text-blue-600">
                          {gate.todayVisitors}
                        </p>
                        <p className="text-xs text-gray-600">Today's Visitors</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded">
                        <p className="text-2xl font-bold text-green-600">
                          {gate.activeVisitors}
                        </p>
                        <p className="text-xs text-gray-600">Active Now</p>
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
                className="px-4 py-2 border rounded"
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
              </select>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Total Visitors</p>
                <p className="text-3xl font-bold text-blue-600">
                  {statistics.totalVisitors}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Active Now</p>
                <p className="text-3xl font-bold text-green-600">
                  {statistics.activeVisits}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Completed</p>
                <p className="text-3xl font-bold text-gray-700">
                  {statistics.completedVisits}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Avg Duration</p>
                <p className="text-3xl font-bold text-purple-600">
                  {statistics.avgDurationMinutes}m
                </p>
              </div>
            </div>

            {/* By Type */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
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
                        <span className="font-medium text-gray-700">{type}</span>
                        <span className="text-gray-600">
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full ${
                            visitorTypeColors[type] || "bg-gray-500"
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
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Visitors by Gate</h3>
              <div className="space-y-4">
                {statistics.gateStats.map((gate) => (
                  <div key={gate.gateId}>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium text-gray-700">
                        {gate.gateName}
                      </span>
                      <span className="text-gray-600">
                        {gate.count} ({gate.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-blue-600 h-4 rounded-full"
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
                className="px-4 py-2 border rounded"
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
                  className="bg-white rounded-lg shadow p-6 text-center border-t-4 border-yellow-500"
                >
                  <p className="text-sm text-gray-600 mb-2">
                    #{index + 1} Peak Hour
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mb-1">
                    {peak.label}
                  </p>
                  <p className="text-xl text-yellow-600 font-semibold">
                    {peak.count} visitors
                  </p>
                </div>
              ))}
            </div>

            {/* Hourly Chart */}
            <div className="bg-white rounded-lg shadow p-6">
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
                      <div className="w-24 text-sm text-gray-700 font-medium">
                        {hour.label}
                      </div>
                      <div className="flex-1 ml-4">
                        <div className="w-full bg-gray-200 rounded h-8 relative">
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
                className="px-4 py-2 border rounded"
              >
                <option value="7">Last 7 Days</option>
                <option value="14">Last 14 Days</option>
                <option value="30">Last 30 Days</option>
              </select>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
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
                        <span className="font-medium text-gray-700 w-24">
                          {day.displayDate}
                        </span>
                        <span className="text-gray-600 text-sm">
                          {day.total} visitors
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded h-8">
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
                              className="text-xs text-gray-500"
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
    </div>
  );
}
