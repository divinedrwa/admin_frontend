"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  CalendarDays,
  CarFront,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  DoorOpen,
  Droplets,
  FileText,
  Gauge,
  HandCoins,
  ImageUp,
  LayoutDashboard,
  LogOut,
  MailPlus,
  Megaphone,
  Package,
  ParkingSquare,
  ScrollText,
  Shield,
  Siren,
  SquareKanban,
  Store,
  TriangleAlert,
  UserRoundCheck,
  Users,
  Vote,
} from "lucide-react";
import { showToast } from "./Toast";
import { useState } from "react";
import { clearPlatformViewSession } from "@/lib/platformViewSession";
import { clearTenantSocietyId } from "@/lib/api";
import { ThemeModeToggle } from "@/theme/components/ThemeModeToggle";

import type { LucideIcon } from "lucide-react";

type SidebarLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type SidebarSection = {
  title: string;
  links: SidebarLink[];
};

const linkSections: SidebarSection[] = [
  {
    title: "Core",
    links: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/villas", label: "Villas", icon: Building2 },
      { href: "/users", label: "Users", icon: Users },
      { href: "/invitations", label: "Invitations", icon: MailPlus },
    ],
  },
  {
    title: "Management",
    links: [
      { href: "/resident-management", label: "Residents", icon: UserRoundCheck },
      { href: "/maintenance-management", label: "Maintenance", icon: HandCoins },
      { href: "/maintenance-billing", label: "Billing cycles", icon: ScrollText },
      { href: "/bank-accounts", label: "Bank accounts", icon: CreditCard },
    ],
  },
  {
    title: "Monthly Expenses",
    links: [
      { href: "/expense-categories", label: "Categories", icon: SquareKanban },
      { href: "/expenses", label: "Expenses", icon: HandCoins },
      { href: "/expenses/add", label: "Add expense", icon: ClipboardList },
      { href: "/expenses-summary", label: "Monthly summary", icon: Gauge },
      { href: "/expenses-summary/yearly", label: "Yearly summary", icon: CalendarDays },
    ],
  },
  {
    title: "Analytics",
    links: [
      { href: "/complaint-analytics", label: "Complaints", icon: TriangleAlert },
      { href: "/gate-analytics", label: "Gate stats", icon: DoorOpen },
      { href: "/water-supply-analytics", label: "Water supply", icon: Droplets },
      { href: "/staff-assignment-overview", label: "Staff", icon: Users },
      { href: "/parking-management", label: "Parking", icon: ParkingSquare },
      { href: "/amenity-bookings-calendar", label: "Amenity calendar", icon: CalendarDays },
    ],
  },
  {
    title: "Security",
    links: [
      { href: "/gates", label: "Gates", icon: Shield },
      { href: "/guard-shifts", label: "Shifts", icon: CalendarDays },
      { href: "/guard-ops", label: "Operations", icon: Gauge },
      { href: "/guard-patrols", label: "Patrols", icon: ClipboardList },
      { href: "/sos-alerts", label: "SOS alerts", icon: Siren },
      { href: "/incidents", label: "Incidents", icon: TriangleAlert },
    ],
  },
  {
    title: "Visitors & Services",
    links: [
      { href: "/visitors", label: "Visitors", icon: Users },
      { href: "/visitor-gate-rules", label: "Gate visitor rules", icon: Shield },
      { href: "/pre-approved-visitors", label: "Pre-approved", icon: UserRoundCheck },
      { href: "/parcels", label: "Parcels", icon: Package },
      { href: "/vehicles", label: "Vehicles", icon: CarFront },
      { href: "/staff", label: "Domestic staff", icon: Users },
    ],
  },
  {
    title: "Communication",
    links: [
      { href: "/notifications", label: "Push notifications", icon: Bell },
      { href: "/notices", label: "Notices", icon: Megaphone },
      { href: "/complaints", label: "Complaints", icon: TriangleAlert },
      { href: "/polls", label: "Polls", icon: Vote },
      { href: "/documents", label: "Documents", icon: FileText },
      { href: "/banners", label: "Banners & events", icon: ImageUp },
    ],
  },
  {
    title: "Amenities",
    links: [
      { href: "/amenities", label: "Manage facilities", icon: Building2 },
      { href: "/amenity-bookings", label: "Bookings", icon: CalendarDays },
      { href: "/vendors", label: "Vendors", icon: Store },
    ],
  },
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
      className={`${collapsed ? "w-20" : "w-72"} flex h-full flex-col text-white transition-all duration-300 shadow-2xl`}
      style={{
        background: `linear-gradient(to bottom, var(--gp-sidebar-from), var(--gp-sidebar-via), var(--gp-sidebar-to))`,
        borderRight: `1px solid var(--gp-sidebar-border)`,
      }}
    >
      {/* Header */}
      <div className="px-5 pb-5 pt-6" style={{ borderBottom: `1px solid var(--gp-sidebar-border)` }}>
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center space-x-3">
              <Image
                src="/favicon-192.png"
                alt="GatePass+"
                width={38}
                height={38}
                className="rounded-xl ring-1 ring-white/10"
                priority
              />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                  Admin Workspace
                </p>
                <h2 className="text-lg font-bold leading-tight text-white">GatePass+</h2>
                <p className="text-xs text-white/60">Operations dashboard</p>
              </div>
            </div>
          )}
          {collapsed && (
            <Image
              src="/favicon-192.png"
              alt="GatePass+"
              width={32}
              height={32}
              className="mx-auto rounded-xl ring-1 ring-white/10"
              priority
            />
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto scrollbar-thin p-4">
        {linkSections.map((section, idx) => (
          <div key={idx}>
            {!collapsed && (
              <h3 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                {section.title}
              </h3>
            )}
            <div className="space-y-1">
              {section.links.map((link) => {
                const isActive = pathname === link.href;
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={handleNavClick}
                    className={`group relative flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                      collapsed ? "justify-center" : "gap-3"
                    } ${
                      isActive
                        ? "bg-white/10 text-white shadow-[0_8px_20px_rgba(0,0,0,0.16)] ring-1 ring-white/10"
                        : "text-white/65 hover:bg-white/[0.06] hover:text-white"
                    }`}
                    title={collapsed ? link.label : undefined}
                  >
                    {isActive && !collapsed && (
                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-white" />
                    )}
                    <Icon
                      className={`h-[18px] w-[18px] shrink-0 transition-transform duration-200 ${
                        isActive ? "scale-105" : "group-hover:scale-105"
                      }`}
                    />
                    {!collapsed && <span>{link.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="space-y-2 p-4" style={{ borderTop: `1px solid var(--gp-sidebar-border)` }}>
        <div className={collapsed ? "" : "px-1 pb-2"}>
          {!collapsed && (
            <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-white/40">
              Appearance
            </p>
          )}
          <ThemeModeToggle iconsOnly={collapsed} />
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden w-full items-center justify-center gap-2 rounded-xl bg-white/[0.06] py-2.5 text-sm text-white/80 transition-all duration-200 hover:bg-white/[0.12] hover:text-white md:flex"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span className="text-xs font-medium">Collapse</span>}
        </button>
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-danger/85 py-2.5 text-sm text-white transition-all duration-200 hover:bg-brand-danger"
        >
          <LogOut className="h-4 w-4" />
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
