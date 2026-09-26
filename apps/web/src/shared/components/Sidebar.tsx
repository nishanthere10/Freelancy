"use client";

import {
  Briefcase,
  ChartPie,
  ChatsTeardrop,
  Lightning,
  Receipt,
  Sparkle,
  SquaresFour,
  Users,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useState } from "react";

export function Sidebar() {
  const pathname = usePathname();
  const params = useParams();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const workspaceId = params?.workspaceId as string | undefined;

  if (!workspaceId) {
    return null;
  }

  const primaryNav = [
    {
      label: "Dashboard",
      href: `/workspaces/${workspaceId}/dashboard`,
      active: pathname?.includes("/dashboard"),
      icon: ChartPie,
      badge: null,
    },
    {
      label: "Projects",
      href: `/workspaces/${workspaceId}/projects`,
      active: pathname?.includes("/projects"),
      icon: Briefcase,
      badge: null,
    },
    {
      label: "Invoices",
      href: `/workspaces/${workspaceId}/invoices`,
      active: pathname?.includes("/invoices"),
      icon: Receipt,
      badge: null,
    },
    {
      label: "Clients",
      href: `/workspaces/${workspaceId}/clients`,
      active: pathname?.includes("/clients"),
      icon: Users,
      badge: null,
    },
  ];

  const automationNav = [
    {
      label: "AI Scope Studio",
      href: `/workspaces/${workspaceId}/ai/scope`,
      active: pathname?.includes("/ai"),
      icon: Sparkle,
      badge: "AI",
      color: "text-purple-600",
    },
    {
      label: "Automations",
      href: `/workspaces/${workspaceId}/automations`,
      active: pathname?.includes("/automations"),
      icon: Lightning,
      badge: "Rules",
      color: "text-amber-600",
    },
    {
      label: "Communications",
      href: `/workspaces/${workspaceId}/communications`,
      active: pathname?.includes("/communications"),
      icon: ChatsTeardrop,
      badge: null,
      color: "text-blue-600",
    },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col border-r border-[var(--color-hairline-soft)] bg-[var(--color-surface-card)] transition-all duration-300 relative z-30 ${
        isCollapsed ? "w-18" : "w-64"
      }`}
    >
      {/* Collapse Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-white border border-[var(--color-hairline-soft)] shadow-xs flex items-center justify-center text-[var(--color-slate-text)] hover:text-[var(--color-ink)] hover:bg-zinc-50 transition z-40"
      >
        {isCollapsed ? (
          <CaretRight weight="bold" className="w-3.5 h-3.5" />
        ) : (
          <CaretLeft weight="bold" className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Workspace Switcher Header */}
      <div className="p-4 border-b border-[var(--color-hairline-soft)]">
        <Link
          href="/workspaces"
          className={`flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--color-surface-soft)] transition text-[var(--color-ink)] ${
            isCollapsed ? "justify-center" : ""
          }`}
          title="Switch Workspace"
        >
          <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-yellow)] text-black font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
            W
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[var(--color-ink)] truncate">
                Active Workspace
              </p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                <SquaresFour weight="bold" className="w-3 h-3 inline shrink-0" />
                <span>Switch Workspace</span>
              </p>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        {/* Core Domain Navigation */}
        <div className="space-y-1">
          {!isCollapsed && (
            <p className="px-3 text-[11px] font-bold tracking-wider text-muted-foreground uppercase mb-2">
              Workspace
            </p>
          )}
          {primaryNav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  item.active
                    ? "bg-[var(--color-brand-yellow)] text-black font-bold shadow-xs"
                    : "text-[var(--color-slate-text)] hover:text-[var(--color-ink-deep)] hover:bg-[var(--color-surface-soft)]"
                } ${isCollapsed ? "justify-center" : ""}`}
              >
                <Icon weight={item.active ? "fill" : "regular"} className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Intelligence & Automation Navigation */}
        <div className="space-y-1 pt-2 border-t border-[var(--color-hairline-soft)]">
          {!isCollapsed && (
            <p className="px-3 text-[11px] font-bold tracking-wider text-muted-foreground uppercase mb-2">
              Engine & Hub
            </p>
          )}
          {automationNav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  item.active
                    ? "bg-[var(--color-brand-yellow)] text-black font-bold shadow-xs"
                    : "text-[var(--color-slate-text)] hover:text-[var(--color-ink-deep)] hover:bg-[var(--color-surface-soft)]"
                } ${isCollapsed ? "justify-center" : ""}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    weight={item.active ? "fill" : "regular"}
                    className={`w-5 h-5 shrink-0 ${!item.active && item.color ? item.color : ""}`}
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>
                {!isCollapsed && item.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 shrink-0">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom Footer Info */}
      <div className="p-3 border-t border-[var(--color-hairline-soft)]">
        <div
          className={`flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground ${
            isCollapsed ? "justify-center" : ""
          }`}
        >
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          {!isCollapsed && <span>Freelance OS v1.0</span>}
        </div>
      </div>
    </aside>
  );
}
