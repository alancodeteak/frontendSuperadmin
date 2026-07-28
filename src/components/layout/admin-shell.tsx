"use client";

import type { CSSProperties, ReactNode } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { DashboardRightSidebar } from "@/components/dashboard/right-sidebar";
import { TopBar, TOPBAR_HEIGHT_PX } from "@/components/layout/top-bar";
import { TopBarProvider } from "@/components/layout/top-bar-slot";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

type AdminShellProps = {
  children: ReactNode;
  defaultOpen: boolean;
};

/**
 * Full-height admin chrome:
 * Left sidebar | (TopBar + main) | right sidebar.
 * TopBar only spans the center column so the right sidebar is full height.
 */
export function AdminShell({ children, defaultOpen }: AdminShellProps) {
  return (
    <div
      style={{
        display: "flex",
        height: "100svh",
        overflow: "hidden",
      }}
    >
      <SidebarProvider
        defaultOpen={defaultOpen}
        className="flex min-h-0 flex-1 overflow-hidden"
        style={
          {
            "--topbar-height": `${TOPBAR_HEIGHT_PX}px`,
            display: "flex",
            flexDirection: "row",
            flex: 1,
            minHeight: 0,
            height: "100%",
            overflow: "hidden",
            width: "100%",
          } as CSSProperties
        }
      >
        <AppSidebar />
        <TopBarProvider>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <TopBar />
            <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/30">
              {children}
            </SidebarInset>
          </div>
        </TopBarProvider>
        <DashboardRightSidebar />
      </SidebarProvider>
    </div>
  );
}
