"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
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
    <AppShell title="Water Supply Analytics">
      <div className="space-y-6">
        <p className="text-fg-secondary -mt-2">Monitor water supply patterns and operations</p>

        <div className="tabs">
          {[
            { id: "overview", label: "Overview" },
            { id: "daily", label: "Daily Usage" },
            { id: "hourly", label: "Hourly Pattern" },
            { id: "recent", label: "Recent Events" },
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

        {error && (
          <div className="bg-denied-bg border border-brand-danger/30 text-denied-fg px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {loading && (
          <div className="card">
            <div className="loading-state">
              <div className="loading-spinner w-10 h-10"></div>
              <p className="loading-state-text">Loading data...</p>
            </div>
          </div>
        )}

        {!loading && activeTab === "overview" && overview && (
          <div>
            <div className="flex justify-end mb-4">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="input w-auto"
              >
                <option value="7">Last 7 Days</option>
                <option value="14">Last 14 Days</option>
                <option value="30">Last 30 Days</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="stat-card">
                <p className="text-sm text-fg-secondary mb-1">Total Events</p>
                <p className="text-3xl font-bold text-brand-primary">{overview.summary.totalEvents}</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-fg-secondary mb-1">ON Events</p>
                <p className="text-3xl font-bold text-approved-solid">{overview.summary.onEvents}</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-fg-secondary mb-1">OFF Events</p>
                <p className="text-3xl font-bold text-brand-danger">{overview.summary.offEvents}</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-fg-secondary mb-1">Avg Duration</p>
                <p className="text-3xl font-bold text-brand-primary">{overview.summary.avgDurationMinutes}m</p>
              </div>
            </div>

            <div className="bg-surface rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Current Status by Gate</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {overview.currentStatus.map((status: any) => (
                  <div key={status.gateId} className="border rounded p-4">
                    <h3 className="font-bold text-fg-primary">{status.gateName}</h3>
                    <span
                      className={`inline-block px-3 py-1 rounded text-sm mt-2 ${
                        status.currentStatus === "ON"
                          ? "bg-approved-bg text-approved-fg"
                          : status.currentStatus === "OFF"
                          ? "bg-denied-bg text-denied-fg"
                          : "bg-surface-elevated text-fg-primary"
                      }`}
                    >
                      {status.currentStatus}
                    </span>
                    {status.lastUpdated && (
                      <p className="text-xs text-fg-secondary mt-2">
                        Last: {formatTime(status.lastUpdated)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="stat-card">
              <h2 className="text-lg font-semibold mb-4">Events by Gate</h2>
              <div className="space-y-4">
                {overview.gateStats.map((stat: any) => (
                  <div key={stat.gateId}>
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">{stat.gateName}</span>
                      <span className="text-fg-secondary">{stat.totalEvents} events</span>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <div className="bg-approved-bg rounded p-2 text-center text-sm">
                          ON: {stat.onCount}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="bg-denied-bg rounded p-2 text-center text-sm">
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
                className="input w-auto"
              >
                <option value="7">Last 7 Days</option>
                <option value="14">Last 14 Days</option>
                <option value="30">Last 30 Days</option>
              </select>
            </div>

            <div className="stat-card">
              <h2 className="text-lg font-semibold mb-4">Daily Water Supply Activity</h2>
              <div className="space-y-4">
                {dailyUsage.usageData.map((day: any) => (
                  <div key={day.date}>
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">{day.displayDate}</span>
                      <span className="text-fg-secondary">{day.totalEvents} events</span>
                    </div>
                    <div className="w-full bg-surface-elevated rounded h-8 flex overflow-hidden">
                      <div
                        className="bg-approved-solid flex items-center justify-center text-white text-sm font-semibold"
                        style={{ width: `${(day.onCount / day.totalEvents) * 100 || 0}%` }}
                      >
                        {day.onCount > 0 && `ON: ${day.onCount}`}
                      </div>
                      <div
                        className="bg-brand-danger flex items-center justify-center text-white text-sm font-semibold"
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
                <div key={peak.hour} className="bg-surface rounded-lg shadow p-6 border-t-4 border-yellow-500">
                  <p className="text-sm text-fg-secondary mb-2">#{idx + 1} Peak Hour</p>
                  <p className="text-2xl font-bold text-fg-primary">{peak.label}</p>
                  <p className="text-lg text-pending-solid font-semibold">{peak.totalEvents} events</p>
                </div>
              ))}
            </div>

            <div className="stat-card">
              <h2 className="text-lg font-semibold mb-4">24-Hour Pattern</h2>
              <div className="space-y-2">
                {hourlyPattern.pattern.map((hour: any) => {
                  const maxEvents = Math.max(...hourlyPattern.pattern.map((h: any) => h.totalEvents));
                  const widthPercent = maxEvents > 0 ? (hour.totalEvents / maxEvents) * 100 : 0;
                  return (
                    <div key={hour.hour} className="flex items-center">
                      <div className="w-24 text-sm font-medium">{hour.label}</div>
                      <div className="flex-1 ml-4">
                        <div className="w-full bg-surface-elevated rounded h-8">
                          <div
                            className="bg-brand-primary h-8 rounded flex items-center px-3"
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
          <div className="table-wrapper">
            <table className="table">
              <thead className="table-head">
                <tr>
                  <th className="table-th">Timestamp</th>
                  <th className="table-th">Gate</th>
                  <th className="table-th">Action</th>
                  <th className="table-th">Reason</th>
                  <th className="table-th">Time Ago</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.map((event) => (
                  <tr key={event.id} className="table-row">
                    <td className="table-td">{formatTime(event.timestamp)}</td>
                    <td className="table-td font-medium">{event.gate?.name || "N/A"}</td>
                    <td className="table-td">
                      <span
                        className={`badge ${
                          event.action === "ON" ? "badge-success" : "badge-danger"
                        }`}
                      >
                        {event.action}
                      </span>
                    </td>
                    <td className="table-td text-fg-secondary">{event.reason || "-"}</td>
                    <td className="table-td text-fg-secondary">{event.minutesAgo}m ago</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
