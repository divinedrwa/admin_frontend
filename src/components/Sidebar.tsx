"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { showToast } from "./Toast";
import { useState } from "react";
import { clearPlatformViewSession } from "@/lib/platformViewSession";
import { clearTenantSocietyId } from "@/lib/api";
import { ThemeModeToggle } from "@/theme/components/ThemeModeToggle";

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
    <aside
      className={`${collapsed ? 'w-20' : 'w-72'} text-white flex flex-col transition-all duration-300 shadow-lg h-full`}
      style={{
        background: `linear-gradient(to bottom, var(--gp-sidebar-from), var(--gp-sidebar-via), var(--gp-sidebar-to))`,
        borderRight: `1px solid var(--gp-sidebar-border)`,
      }}
    >
      {/* Header */}
      <div className="p-6" style={{ borderBottom: `1px solid var(--gp-sidebar-border)` }}>
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center space-x-3">
              <Image
                src="/favicon-192.png"
                alt="GatePass+"
                width={36}
                height={36}
                className="rounded-lg"
                priority
              />
              <div>
                <h2 className="text-lg font-bold leading-tight">GatePass+</h2>
                <p className="text-xs" style={{ color: 'var(--gp-sidebar-muted-text)' }}>Admin dashboard</p>
              </div>
            </div>
          )}
          {collapsed && (
            <Image
              src="/favicon-192.png"
              alt="GatePass+"
              width={32}
              height={32}
              className="mx-auto rounded-lg"
              priority
            />
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-6">
        {linkSections.map((section, idx) => (
          <div key={idx}>
            {!collapsed && (
              <h3
                className="text-xs font-semibold uppercase tracking-wider mb-2 px-3"
                style={{ color: 'var(--gp-sidebar-muted-text)' }}
              >
                {section.title}
              </h3>
            )}
            <div className="space-y-1">
              {section.links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={handleNavClick}
                    className={`relative flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group`}
                    style={
                      isActive
                        ? {
                            backgroundColor: 'var(--gp-sidebar-active-bg)',
                            color: 'var(--gp-sidebar-active-text)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          }
                        : {
                            color: 'var(--gp-sidebar-muted-text)',
                          }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'var(--gp-sidebar-hover-bg)';
                        e.currentTarget.style.color = 'var(--gp-sidebar-active-text)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--gp-sidebar-muted-text)';
                      }
                    }}
                    title={collapsed ? link.label : undefined}
                  >
                    {isActive && !collapsed && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                        style={{ backgroundColor: 'var(--gp-sidebar-active-text)' }}
                      />
                    )}
                    <span className={`text-lg transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>{link.icon}</span>
                    {!collapsed && <span>{link.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 space-y-2" style={{ borderTop: `1px solid var(--gp-sidebar-border)` }}>
        <div className={collapsed ? "" : "px-1 pb-2"}>
          {!collapsed && (
            <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--gp-sidebar-muted-text)' }}>
              Appearance
            </p>
          )}
          <ThemeModeToggle iconsOnly={collapsed} />
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full text-white text-sm py-2.5 rounded-lg hidden md:flex items-center justify-center gap-2 transition-all duration-200"
          style={{ backgroundColor: 'var(--gp-sidebar-hover-bg)' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--gp-sidebar-active-bg)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--gp-sidebar-hover-bg)'; }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
          {!collapsed && <span className="text-xs font-medium">Collapse</span>}
        </button>
        <button
          onClick={handleLogout}
          className="w-full text-white text-sm py-2.5 rounded-lg flex items-center justify-center space-x-2 transition-all duration-200 bg-brand-danger/80 hover:bg-brand-danger"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
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
