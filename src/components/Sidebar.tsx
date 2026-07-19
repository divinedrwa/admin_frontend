"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  BellRing,
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
  Activity,
  BookOpen,
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
  Wallet,
  Briefcase,
  Scale,
  Trash2,
  ClipboardCheck,
  FileSignature,
  Boxes,
  CalendarClock,
  UserCheck,
  Settings,
  History,
  UserX,
} from "lucide-react";
import { showToast } from "./Toast";
import { useEffect, useRef, useState } from "react";
import { clearPlatformViewSession } from "@/lib/platformViewSession";
import { api, clearTenantAuthCookie, clearTenantSocietyId } from "@/lib/api";
import { clearThemeColorOverrides } from "@/theme/ThemeProvider";
import { APP_NAME } from "@/lib/branding";

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
      { href: "/role-management", label: "Role management", icon: UserCheck },
      { href: "/invitations", label: "Invitations", icon: MailPlus },
    ],
  },
  {
    title: "Management",
    links: [
      { href: "/resident-management", label: "Residents", icon: UserRoundCheck },
      { href: "/maintenance-management", label: "Maintenance", icon: HandCoins },
      { href: "/villa-financial-history", label: "Villa financial history", icon: ScrollText },
      { href: "/maintenance-billing", label: "Billing cycles", icon: ScrollText },
      { href: "/maintenance-reminders", label: "Dues reminders", icon: BellRing },
      { href: "/payment-methods", label: "Payment methods", icon: CreditCard },
      { href: "/bank-accounts", label: "Bank accounts", icon: Building2 },
      { href: "/upi-payments", label: "UPI verification", icon: CreditCard },
      { href: "/payment-disputes", label: "Payment disputes", icon: TriangleAlert },
      { href: "/admin-shortfall", label: "Income vs Expenses", icon: Wallet },
      { href: "/reconciliation", label: "Reconciliation", icon: Scale },
      { href: "/defaulter-report", label: "Defaulter report", icon: UserX },
      { href: "/payment-timeline", label: "Payment timeline", icon: History },
      { href: "/system-health", label: "System health", icon: Activity },
      { href: "/runbooks", label: "Ops runbooks", icon: BookOpen },
      { href: "/audit-log", label: "Audit log", icon: ClipboardCheck },
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
    title: "Projects",
    links: [
      { href: "/special-projects", label: "Special Projects", icon: Briefcase },
    ],
  },
  {
    title: "Analytics",
    links: [
      { href: "/app-analytics", label: "App usage", icon: Activity },
      { href: "/complaint-analytics", label: "Complaints", icon: TriangleAlert },
      { href: "/gate-analytics", label: "Gate stats", icon: DoorOpen },
      { href: "/water-supply-analytics", label: "Water supply", icon: Droplets },
      { href: "/staff-assignment-overview", label: "Staff", icon: Users },
      { href: "/parking-management", label: "Parking", icon: ParkingSquare },
      { href: "/amenity-bookings-calendar", label: "Amenity calendar", icon: CalendarDays },
      { href: "/garbage-collection", label: "Garbage collection", icon: Trash2 },
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
      { href: "/staff-attendance", label: "Staff attendance", icon: UserCheck },
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
      { href: "/vendor-contracts", label: "Contracts", icon: FileSignature },
      { href: "/assets", label: "Asset inventory", icon: Boxes },
    ],
  },
  {
    title: "Governance",
    links: [
      { href: "/meetings", label: "Meetings & AGM", icon: CalendarClock },
    ],
  },
  {
    title: "Settings",
    links: [
      { href: "/society-settings", label: "Society settings", icon: Settings },
    ],
  },
];

const SIDEBAR_SCROLL_KEY = "gp-admin-sidebar-scroll";

function SidebarPanel({
  collapsed,
  pathname,
  onNavClick,
  onToggleCollapse,
  onLogout,
}: {
  collapsed: boolean;
  pathname: string;
  onNavClick: () => void;
  onToggleCollapse: () => void;
  onLogout: () => void;
}) {
  const navRef = useRef<HTMLElement>(null);

  function handleLinkClick() {
    if (navRef.current) {
      sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(navRef.current.scrollTop));
    }
    onNavClick();
  }

  // Keep nav scroll position across route changes (each page remounts AppShell).
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || collapsed) return;

    const saved = sessionStorage.getItem(SIDEBAR_SCROLL_KEY);
    if (saved != null) {
      const top = Number(saved);
      if (!Number.isNaN(top)) {
        nav.scrollTop = top;
      }
    }

    requestAnimationFrame(() => {
      const active = nav.querySelector<HTMLElement>('[data-nav-active="true"]');
      active?.scrollIntoView({ block: "nearest", behavior: "instant" });
    });
  }, [pathname, collapsed]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(nav.scrollTop));
        ticking = false;
      });
    };

    nav.addEventListener("scroll", onScroll, { passive: true });
    return () => nav.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <aside
      className={`${collapsed ? "w-20" : "w-72"} flex h-full min-h-0 flex-col text-white transition-all duration-300 shadow-2xl`}
      style={{
        background: `linear-gradient(to bottom, var(--gp-sidebar-from), var(--gp-sidebar-via), var(--gp-sidebar-to))`,
        borderRight: `1px solid var(--gp-sidebar-border)`,
      }}
    >
      {/* Header */}
      <div className="shrink-0 px-5 pb-5 pt-6" style={{ borderBottom: `1px solid var(--gp-sidebar-border)` }}>
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center space-x-3">
              <Image
                src="/app-icon.png"
                alt={APP_NAME}
                width={38}
                height={38}
                className="rounded-xl ring-1 ring-white/10"
                priority
              />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                  Admin Workspace
                </p>
                <h2 className="text-lg font-bold leading-tight text-white">{APP_NAME}</h2>
                <p className="text-xs text-white/60">Operations dashboard</p>
              </div>
            </div>
          )}
          {collapsed && (
            <Image
              src="/app-icon.png"
              alt={APP_NAME}
              width={32}
              height={32}
              className="mx-auto rounded-xl ring-1 ring-white/10"
              priority
            />
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav
        ref={navRef}
        data-sidebar-nav
        className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-y-contain scrollbar-thin p-4"
      >
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
                    onClick={handleLinkClick}
                    data-nav-active={isActive ? "true" : undefined}
                    className={`group relative flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                      collapsed ? "justify-center" : "gap-3"
                    } ${
                      isActive
                        ? "shadow-[0_8px_20px_rgba(0,0,0,0.16)]"
                        : "hover:bg-[var(--gp-sidebar-hover-bg)] hover:text-[var(--gp-sidebar-active-text)]"
                    }`}
                    style={
                      isActive
                        ? {
                            backgroundColor: "var(--gp-sidebar-active-bg)",
                            color: "var(--gp-sidebar-active-text)",
                          }
                        : {
                            color: "var(--gp-sidebar-muted-text)",
                          }
                    }
                    title={collapsed ? link.label : undefined}
                    aria-label={collapsed ? link.label : undefined}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {isActive && !collapsed && (
                      <span
                        className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
                        style={{ backgroundColor: "var(--gp-sidebar-active-text)" }}
                      />
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
      <div className="shrink-0 space-y-2 p-4" style={{ borderTop: `1px solid var(--gp-sidebar-border)` }}>
        <button
          onClick={onToggleCollapse}
          className="hidden w-full items-center justify-center gap-2 rounded-xl bg-white/[0.06] py-2.5 text-sm text-white/80 transition-all duration-200 hover:bg-white/[0.12] hover:text-white md:flex"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span className="text-xs font-medium">Collapse</span>}
        </button>
        <button
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-danger/85 py-2.5 text-sm text-white transition-all duration-200 hover:bg-brand-danger"
          aria-label={collapsed ? "Logout" : undefined}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  function handleLogout() {
    // Best-effort: revoke the refresh token server-side before clearing local state.
    const refreshToken = localStorage.getItem("refresh_token");
    if (refreshToken) {
      api.post("/auth/logout", { refreshToken }).catch(() => {});
    }
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    clearTenantSocietyId();
    clearPlatformViewSession();
    clearTenantAuthCookie();
    clearThemeColorOverrides();
    showToast("Logged out successfully", "success");
    router.push("/login");
  }

  function handleNavClick() {
    onClose?.();
  }

  const panelProps = {
    collapsed,
    pathname,
    onNavClick: handleNavClick,
    onToggleCollapse: () => setCollapsed(!collapsed),
    onLogout: handleLogout,
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Desktop: fixed-height sidebar — nav scrolls independently from main content */}
      <div className="hidden h-screen shrink-0 overflow-hidden md:flex">
        <SidebarPanel {...panelProps} />
      </div>

      {/* Mobile: drawer overlay */}
      <div
        className={`fixed inset-y-0 left-0 z-40 h-screen overflow-hidden transition-transform duration-300 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarPanel {...panelProps} />
      </div>
    </>
  );
}
