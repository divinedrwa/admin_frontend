"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function WaterSupplyAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "daily" | "hourly" | "recent">("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<any>(null);
  const [dailyUsage, setDailyUsage] = useState<any>(null);
  const [hourlyPattern, setHourlyPattern] = useState<any>(null);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [period, setPeriod] = useState("7");

  useEffect(() => {
    if (activeTab === "overview") fetchOverview();
    else if (activeTab === "daily") fetchDailyUsage();
    else if (activeTab === "hourly") fetchHourlyPattern();
    else if (activeTab === "recent") fetchRecentEvents();
  }, [activeTab, period]);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/water-supply-analytics/overview?days=${period}`);
      setOverview(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch overview");
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyUsage = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/water-supply-analytics/daily-usage?days=${period}`);
      setDailyUsage(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch daily usage");
    } finally {
      setLoading(false);
    }
  };

  const fetchHourlyPattern = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/water-supply-analytics/hourly-pattern?days=30`);
      setHourlyPattern(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch hourly pattern");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentEvents = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/water-supply-analytics/recent-events?limit=30`);
      setRecentEvents(response.data.recentEvents);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch recent events");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">💧 Water Supply Analytics</h1>
          <p className="text-gray-600">Monitor water supply patterns and operations</p>
        </div>

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b">
            {[
              { id: "overview", label: "📊 Overview" },
              { id: "daily", label: "📅 Daily Usage" },
              { id: "hourly", label: "⏰ Hourly Pattern" },
              { id: "recent", label: "📝 Recent Events" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-3 font-medium ${
                  activeTab === tab.id
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading data...</p>
          </div>
        )}

        {!loading && activeTab === "overview" && overview && (
          <div>
            <div className="flex justify-end mb-4">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-4 py-2 border rounded"
              >
                <option value="7">Last 7 Days</option>
                <option value="14">Last 14 Days</option>
                <option value="30">Last 30 Days</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Total Events</p>
                <p className="text-3xl font-bold text-blue-600">{overview.summary.totalEvents}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">ON Events</p>
                <p className="text-3xl font-bold text-green-600">{overview.summary.onEvents}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">OFF Events</p>
                <p className="text-3xl font-bold text-red-600">{overview.summary.offEvents}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Avg Duration</p>
                <p className="text-3xl font-bold text-purple-600">{overview.summary.avgDurationMinutes}m</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Current Status by Gate</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {overview.currentStatus.map((status: any) => (
                  <div key={status.gateId} className="border rounded p-4">
                    <h3 className="font-bold text-gray-900">{status.gateName}</h3>
                    <span
                      className={`inline-block px-3 py-1 rounded text-sm mt-2 ${
                        status.currentStatus === "ON"
                          ? "bg-green-100 text-green-800"
                          : status.currentStatus === "OFF"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {status.currentStatus}
                    </span>
                    {status.lastUpdated && (
                      <p className="text-xs text-gray-500 mt-2">
                        Last: {formatTime(status.lastUpdated)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Events by Gate</h2>
              <div className="space-y-4">
                {overview.gateStats.map((stat: any) => (
                  <div key={stat.gateId}>
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">{stat.gateName}</span>
                      <span className="text-gray-600">{stat.totalEvents} events</span>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <div className="bg-green-100 rounded p-2 text-center text-sm">
                          ON: {stat.onCount}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="bg-red-100 rounded p-2 text-center text-sm">
                          OFF: {stat.offCount}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!loading && activeTab === "daily" && dailyUsage && (
          <div>
            <div className="flex justify-end mb-4">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-4 py-2 border rounded"
              >
                <option value="7">Last 7 Days</option>
                <option value="14">Last 14 Days</option>
                <option value="30">Last 30 Days</option>
              </select>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Daily Water Supply Activity</h2>
              <div className="space-y-4">
                {dailyUsage.usageData.map((day: any) => (
                  <div key={day.date}>
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">{day.displayDate}</span>
                      <span className="text-gray-600">{day.totalEvents} events</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded h-8 flex overflow-hidden">
                      <div
                        className="bg-green-500 flex items-center justify-center text-white text-sm font-semibold"
                        style={{ width: `${(day.onCount / day.totalEvents) * 100 || 0}%` }}
                      >
                        {day.onCount > 0 && `ON: ${day.onCount}`}
                      </div>
                      <div
                        className="bg-red-500 flex items-center justify-center text-white text-sm font-semibold"
                        style={{ width: `${(day.offCount / day.totalEvents) * 100 || 0}%` }}
                      >
                        {day.offCount > 0 && `OFF: ${day.offCount}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!loading && activeTab === "hourly" && hourlyPattern && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {hourlyPattern.peakHours.map((peak: any, idx: number) => (
                <div key={peak.hour} className="bg-white rounded-lg shadow p-6 border-t-4 border-yellow-500">
                  <p className="text-sm text-gray-600 mb-2">#{idx + 1} Peak Hour</p>
                  <p className="text-2xl font-bold text-gray-900">{peak.label}</p>
                  <p className="text-lg text-yellow-600 font-semibold">{peak.totalEvents} events</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">24-Hour Pattern</h2>
              <div className="space-y-2">
                {hourlyPattern.pattern.map((hour: any) => {
                  const maxEvents = Math.max(...hourlyPattern.pattern.map((h: any) => h.totalEvents));
                  const widthPercent = maxEvents > 0 ? (hour.totalEvents / maxEvents) * 100 : 0;
                  return (
                    <div key={hour.hour} className="flex items-center">
                      <div className="w-24 text-sm font-medium">{hour.label}</div>
                      <div className="flex-1 ml-4">
                        <div className="w-full bg-gray-200 rounded h-8">
                          <div
                            className="bg-blue-600 h-8 rounded flex items-center px-3"
                            style={{ width: `${widthPercent}%` }}
                          >
                            {hour.totalEvents > 0 && (
                              <span className="text-white text-sm font-semibold">{hour.totalEvents}</span>
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

        {!loading && activeTab === "recent" && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time Ago</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{formatTime(event.timestamp)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{event.gate?.name || "N/A"}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          event.action === "ON"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {event.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{event.reason || "-"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{event.minutesAgo}m ago</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
