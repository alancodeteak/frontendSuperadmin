"use client";

import { useState } from "react";
import { MapPinnedIcon } from "lucide-react";

import { NotificationsButton } from "@/components/layout/notifications-button";
import { useTopBarSlotElement } from "@/components/layout/top-bar-slot";
import { ShopsMapModal } from "@/components/shops/shops-map-modal";
import { Button } from "@/components/ui/button";

/** Fixed chrome header height — matches right sidebar search strip. */
export const TOPBAR_HEIGHT_PX = 64;

export function TopBar() {
  const [mapOpen, setMapOpen] = useState(false);
  const { setSlotEl } = useTopBarSlotElement();

  return (
    <header
      data-slot="top-bar"
      className="relative z-40 flex w-full shrink-0 items-center gap-3 border-b bg-background px-5 box-border"
      style={{ height: TOPBAR_HEIGHT_PX, minHeight: TOPBAR_HEIGHT_PX }}
    >
      <div
        ref={setSlotEl}
        className="relative z-10 flex min-w-0 flex-1 items-center gap-2"
      />

      <div className="relative z-10 flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMapOpen(true)}
          title="View all shops on map"
        >
          <MapPinnedIcon className="size-3.5" />
          <span className="hidden sm:inline">Shops map</span>
        </Button>
        <NotificationsButton />
      </div>

      <ShopsMapModal open={mapOpen} onOpenChange={setMapOpen} />
    </header>
  );
}
