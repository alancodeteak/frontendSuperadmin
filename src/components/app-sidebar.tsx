"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileBarChartIcon,
  GitMergeIcon,
  LogOutIcon,
  UsersRoundIcon,
} from "lucide-react";

import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { ChartSpline } from "@/components/animate-ui/icons/chart-spline";
import { Cog } from "@/components/animate-ui/icons/cog";
import { Layers } from "@/components/animate-ui/icons/layers";
import { LayoutDashboard } from "@/components/animate-ui/icons/layout-dashboard";
import { Unplug } from "@/components/animate-ui/icons/unplug";
import { BillIcon } from "@/components/icons/bill-icon";
import { useAuth } from "@/components/providers/auth-provider";
import { QueryStatus } from "@/components/providers/query-status";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { navItems } from "@/config/site";

const ICON_SIZE = 20;

function NavIcon({ href }: { href: (typeof navItems)[number]["href"] }) {
  switch (href) {
    case "/dashboard":
      return <LayoutDashboard size={ICON_SIZE} />;
    case "/shops":
      return <Layers size={ICON_SIZE} />;
    case "/customer-merges":
      return <GitMergeIcon className="size-5" />;
    case "/groups":
      return <UsersRoundIcon className="size-5" />;
    case "/pos":
      return <Unplug size={ICON_SIZE} />;
    case "/reports":
      return <FileBarChartIcon className="size-5" />;
    case "/analytics":
      return <ChartSpline size={ICON_SIZE} />;
    case "/invoice":
      return <BillIcon size={ICON_SIZE} />;
    case "/settings":
      return <Cog size={ICON_SIZE} />;
    default:
      return null;
  }
}

export function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b p-3 group-data-[collapsible=icon]:px-2">
        <Link
          href="/dashboard"
          aria-label="Yaadro dashboard"
          className="flex h-10 min-w-0 items-center gap-3 overflow-hidden text-inherit no-underline group-data-[collapsible=icon]:justify-center"
        >
          <Image
            src="/images/yaadro-icon.svg"
            width={364}
            height={444}
            alt=""
            priority
            className="h-9 w-auto shrink-0"
          />
          <Image
            src="/images/yaadro-text.svg"
            width={1091}
            height={255}
            alt="Yaadro"
            priority
            className="h-6 w-auto min-w-0 shrink group-data-[collapsible=icon]:hidden"
          />
        </Link>
      </SidebarHeader>

      <SidebarContent className="py-3">
        <SidebarGroup className="px-3 py-0 group-data-[collapsible=icon]:px-2">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

                return (
                  <SidebarMenuItem key={item.href}>
                    <AnimateIcon animateOnHover className="flex w-full">
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={isActive}
                        tooltip={item.title}
                        className="h-10 justify-start gap-2 px-3 [&_svg]:size-5! group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:justify-center! group-data-[collapsible=icon]:gap-0! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:[&>span]:sr-only"
                      >
                        <NavIcon href={item.href} />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </AnimateIcon>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-2 border-t p-3 group-data-[collapsible=icon]:px-2">
        <QueryStatus className="px-1 group-data-[collapsible=icon]:hidden" />
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="w-full justify-start gap-2 group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
          onClick={() => void logout()}
          title="Logout"
        >
          <LogOutIcon className="size-3.5 shrink-0" />
          <span className="group-data-[collapsible=icon]:hidden">Logout</span>
        </Button>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
