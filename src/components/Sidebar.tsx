"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { showToast } from "./Toast";
import { useState } from "react";
import { clearPlatformViewSession } from "@/lib/platformViewSession";
import { clearTenantSocietyId } from "@/lib/api";

const linkSections = [
  {
    title: "🏠 Core",
    links: [
      { href: "/dashboard", label: "Dashboard", icon: "📊" },
      { href: "/villas", label: "Villas", icon: "🏘️" },
      { href: "/users", label: "Users", icon: "👥" },
      { href: "/invitations", label: "Invitations", icon: "✉️" },
    ]
  },
    {
      title: "💼 Management",
      links: [
        { href: "/resident-management", label: "Residents", icon: "👥" },
        { href: "/maintenance-management", label: "Maintenance", icon: "💰" },
        { href: "/maintenance-billing", label: "Billing cycles", icon: "🧾" },
        { href: "/bank-accounts", label: "Bank Accounts", icon: "💳" },
      ]
    },
  {
    title: "💸 Monthly Expenses",
    links: [
      { href: "/expense-categories", label: "Categories", icon: "🗂️" },
      { href: "/expenses", label: "Expenses", icon: "💵" },
      { href: "/expenses/add", label: "Add Expense", icon: "➕" },
      { href: "/expenses-summary", label: "Monthly Summary", icon: "📊" },
      { href: "/expenses-summary/yearly", label: "Yearly Summary", icon: "📈" },
    ]
  },
  {
    title: "📊 Analytics",
    links: [
      { href: "/complaint-analytics", label: "Complaints", icon: "📈" },
      { href: "/gate-analytics", label: "Gate Stats", icon: "🚪" },
      { href: "/water-supply-analytics", label: "Water Supply", icon: "💧" },
      { href: "/staff-assignment-overview", label: "Staff", icon: "👷" },
      { href: "/parking-management", label: "Parking", icon: "🅿️" },
      { href: "/amenity-bookings-calendar", label: "Amenity calendar", icon: "📅" },
    ]
  },
  {
    title: "🛡️ Security",
    links: [
      { href: "/gates", label: "Gates", icon: "🚧" },
      { href: "/guard-shifts", label: "Shifts", icon: "⏰" },
      { href: "/guard-ops", label: "Operations", icon: "🎯" },
      { href: "/guard-patrols", label: "Patrols", icon: "🚶" },
      { href: "/sos-alerts", label: "SOS Alerts", icon: "🆘" },
      { href: "/incidents", label: "Incidents", icon: "🚨" },
    ]
  },
  {
    title: "👋 Visitors & Services",
    links: [
      { href: "/visitors", label: "Visitors", icon: "👤" },
      { href: "/visitor-gate-rules", label: "Gate visitor rules", icon: "🛂" },
      { href: "/pre-approved-visitors", label: "Pre-Approved", icon: "✅" },
      { href: "/parcels", label: "Parcels", icon: "📦" },
      { href: "/vehicles", label: "Vehicles", icon: "🚗" },
      { href: "/staff", label: "Domestic Staff", icon: "🧹" },
    ]
  },
  {
    title: "📢 Communication",
    links: [
      { href: "/notifications", label: "Push Notifications", icon: "🔔" },
      { href: "/notices", label: "Notices", icon: "📌" },
      { href: "/complaints", label: "Complaints", icon: "⚠️" },
      { href: "/polls", label: "Polls", icon: "🗳️" },
      { href: "/documents", label: "Documents", icon: "📁" },
      { href: "/banners", label: "Banners & Events", icon: "🎨" },
    ]
  },
  {
    title: "🏪 Amenities",
    links: [
      { href: "/amenities", label: "Manage facilities", icon: "🏊" },
      { href: "/amenity-bookings", label: "Bookings", icon: "📝" },
      { href: "/vendors", label: "Vendors", icon: "🏪" },
    ]
  }
];

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  function handleLogout() {
    localStorage.removeItem("token");
    clearTenantSocietyId();
    clearPlatformViewSession();
    showToast("Logged out successfully", "success");
    router.push("/login");
  }

  function handleNavClick() {
    onClose?.();
  }

  const sidebarContent = (
    <aside className={`${collapsed ? 'w-20' : 'w-72'} bg-gradient-to-b from-gray-900 to-gray-800 text-white border-r border-gray-700 flex flex-col transition-all duration-300 shadow-2xl h-full`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-2xl">🏘️</span>
                <h2 className="text-lg font-bold">Society Admin</h2>
              </div>
              <p className="text-xs text-gray-400">Villa Management System</p>
            </div>
          )}
          {collapsed && <span className="text-2xl mx-auto">🏘️</span>}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-6">
        {linkSections.map((section, idx) => (
          <div key={idx}>
            {!collapsed && (
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
                {section.title}
              </h3>
            )}
            <div className="space-y-1">
              {section.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={handleNavClick}
                  className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    pathname === link.href
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50"
                      : "text-gray-300 hover:bg-gray-700/50 hover:text-white"
                  }`}
                  title={collapsed ? link.label : undefined}
                >
                  <span className="text-lg">{link.icon}</span>
                  {!collapsed && <span>{link.label}</span>}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700 space-y-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full btn bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 hidden md:block"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? "→" : "←"}
        </button>
        <button
          onClick={handleLogout}
          className="w-full btn bg-red-600 hover:bg-red-700 text-white text-sm py-2 flex items-center justify-center space-x-2"
        >
          <span>🚪</span>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Desktop: static sidebar */}
      <div className="hidden md:flex">
        {sidebarContent}
      </div>

      {/* Mobile: drawer overlay */}
      <div
        className={`fixed inset-y-0 left-0 z-40 md:hidden transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
}
