"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { MapPinIcon, MapPinOffIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/states";
import { loadGoogleMaps } from "@/lib/google-maps";
import { allShopsQuery } from "@/lib/queries/shops";
import type { ShopListItem } from "@/types/api";

const DEFAULT_CENTER = { lat: 25.2048, lng: 55.2708 };

type MappableShop = ShopListItem & {
  lat: number;
  lng: number;
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function shopCoords(shop: ShopListItem): { lat: number; lng: number } | null {
  const address = shop.address as
    | (ShopListItem["address"] & Record<string, unknown>)
    | null
    | undefined;
  const lat = toNumber(address?.latitude ?? address?.lat);
  const lng = toNumber(address?.longitude ?? address?.lng ?? address?.lon);
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

function withCoords(shops: ShopListItem[]): MappableShop[] {
  return shops.flatMap((shop) => {
    const coords = shopCoords(shop);
    if (!coords) return [];
    return [{ ...shop, ...coords }];
  });
}

function addressLine(shop: ShopListItem) {
  const a = shop.address;
  if (!a) return null;
  return [a.address_line_1, a.locality, a.city].filter(Boolean).join(", ") || null;
}

function shopDisplayName(shop: ShopListItem) {
  return shop.shop_name || shop.profile?.shop_name || shop.shop_id;
}

function shopPhotoUrl(shop: ShopListItem): string | null {
  const candidates = [
    shop.photo_url,
    shop.profile?.photo_url,
    shop.photo,
    shop.profile?.photo,
  ];
  for (const raw of candidates) {
    if (typeof raw !== "string") continue;
    const value = raw.trim();
    if (!value || value === "null" || value === "undefined") continue;
    return value;
  }
  return null;
}

function infoWindowHtml(shop: ShopListItem) {
  const name = shopDisplayName(shop);
  const line = addressLine(shop);
  const photo = shopPhotoUrl(shop);
  const photoBlock = photo
    ? `<img src="${escapeHtml(photo)}" alt="" width="56" height="56" style="width:56px;height:56px;border-radius:9999px;object-fit:cover;flex-shrink:0;border:2px solid #e2e8f0;background:#f1f5f9" onerror="this.style.display='none'" />`
    : `<div style="width:56px;height:56px;border-radius:9999px;flex-shrink:0;background:#e2e8f0;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:18px;font-weight:600">${escapeHtml(name.slice(0, 1).toUpperCase())}</div>`;

  return `<div style="padding:6px 4px;max-width:260px;font-family:system-ui,sans-serif">
    <div style="display:flex;gap:10px;align-items:flex-start">
      ${photoBlock}
      <div style="min-width:0;flex:1">
        <div style="font-weight:600;font-size:13px;margin-bottom:2px;line-height:1.3">${escapeHtml(name)}</div>
        <div style="font-size:11px;color:#64748b;margin-bottom:4px;word-break:break-all">${escapeHtml(shop.shop_id)}</div>
        ${line ? `<div style="font-size:12px;color:#334155;margin-bottom:8px;line-height:1.35">${escapeHtml(line)}</div>` : ""}
        <a href="/shops/${encodeURIComponent(shop.shop_id)}" style="font-size:12px;color:#7547CC;text-decoration:none">Open shop →</a>
      </div>
    </div>
  </div>`;
}

export function ShopsMapModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersById = useRef<Map<string, google.maps.Marker>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const shopsQuery = useQuery({
    ...allShopsQuery(),
    enabled: open,
  });

  const shops = shopsQuery.data?.items ?? [];
  const mapped = useMemo(() => withCoords(shops), [shops]);
  const mappedIds = useMemo(
    () => new Set(mapped.map((s) => s.shop_id)),
    [mapped],
  );
  const selected = shops.find((s) => s.shop_id === selectedId) ?? null;
  const selectedCoords = selected ? shopCoords(selected) : null;

  useEffect(() => {
    if (!open) return;
    setMapReady(false);
    setMapError(null);
    setSelectedId(null);
  }, [open]);

  useEffect(() => {
    if (!open || shopsQuery.isPending) return;

    let cancelled = false;

    async function init() {
      try {
        const g = await loadGoogleMaps();
        if (cancelled || !mapRef.current) return;

        const map = new g.maps.Map(mapRef.current, {
          center: DEFAULT_CENTER,
          zoom: 11,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        const infoWindow = new g.maps.InfoWindow();
        const bounds = new g.maps.LatLngBounds();
        const markers = new Map<string, google.maps.Marker>();

        for (const shop of mapped) {
          const position = { lat: shop.lat, lng: shop.lng };
          const marker = new g.maps.Marker({
            map,
            position,
            title: shopDisplayName(shop),
          });

          marker.addListener("click", () => {
            setSelectedId(shop.shop_id);
            infoWindow.setContent(infoWindowHtml(shop));
            infoWindow.open({ map, anchor: marker });
          });

          bounds.extend(position);
          markers.set(shop.shop_id, marker);
        }

        if (markers.size === 1) {
          map.setCenter(bounds.getCenter());
          map.setZoom(14);
        } else if (markers.size > 1) {
          map.fitBounds(bounds, 64);
        }

        mapInstance.current = map;
        markersById.current = markers;
        infoWindowRef.current = infoWindow;
        setMapReady(true);
      } catch (err) {
        if (!cancelled) {
          setMapError(
            err instanceof Error ? err.message : "Failed to load Google Maps",
          );
        }
      }
    }

    void init();

    return () => {
      cancelled = true;
      markersById.current.forEach((m) => m.setMap(null));
      markersById.current.clear();
      infoWindowRef.current?.close();
      infoWindowRef.current = null;
      mapInstance.current = null;
    };
  }, [open, shopsQuery.isPending, mapped]);

  function focusShop(shop: ShopListItem) {
    setSelectedId(shop.shop_id);
    const coords = shopCoords(shop);
    const map = mapInstance.current;
    const marker = markersById.current.get(shop.shop_id);

    if (!coords || !map) return;

    map.panTo({ lat: coords.lat, lng: coords.lng });
    map.setZoom(Math.max(map.getZoom() ?? 12, 14));
    if (marker) {
      google.maps.event.trigger(marker, "click");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-3 overflow-hidden sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Shops on map</DialogTitle>
          <DialogDescription>
            {shopsQuery.isPending
              ? "Loading all shops…"
              : `${shops.length} shops · ${mapped.length} with map pins`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[260px_1fr]">
          <aside className="max-h-48 overflow-auto rounded-xl border bg-muted/30 lg:max-h-[min(70vh,560px)]">
            {shopsQuery.isPending ? (
              <p className="p-3 text-sm text-muted-foreground">Loading…</p>
            ) : shops.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">No shops found.</p>
            ) : (
              <ul className="divide-y">
                {shops.map((shop) => {
                  const hasPin = mappedIds.has(shop.shop_id);
                  return (
                    <li key={shop.shop_id}>
                      <button
                        type="button"
                        className={`flex w-full flex-col gap-1 px-3 py-2.5 text-left hover:bg-muted/60 ${
                          selectedId === shop.shop_id ? "bg-muted" : ""
                        }`}
                        onClick={() => focusShop(shop)}
                      >
                        <span className="flex items-center gap-1.5">
                          {hasPin ? (
                            <MapPinIcon className="size-3.5 shrink-0 text-primary" />
                          ) : (
                            <MapPinOffIcon className="size-3.5 shrink-0 text-muted-foreground" />
                          )}
                          <span className="truncate text-sm font-medium">
                            {shopDisplayName(shop)}
                          </span>
                        </span>
                        <span className="flex items-center gap-2 pl-5">
                          <StatusBadge status={shop.status} />
                          <span className="truncate font-mono text-[10px] text-muted-foreground">
                            {shop.shop_id}
                          </span>
                        </span>
                        {!hasPin ? (
                          <span className="pl-5 text-[10px] text-muted-foreground">
                            No coordinates
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          <div className="relative h-[min(60vh,480px)] overflow-hidden rounded-xl border bg-muted lg:h-[min(70vh,560px)]">
            <div ref={mapRef} className="absolute inset-0" />
            {!mapReady && !mapError ? (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                Loading map…
              </div>
            ) : null}
            {mapError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
                <MapPinIcon className="size-8 text-muted-foreground" />
                <p className="text-sm text-destructive">{mapError}</p>
              </div>
            ) : null}
            {mapReady && mapped.length === 0 ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
                <p className="rounded-full bg-background/90 px-3 py-1 text-xs text-muted-foreground shadow-sm">
                  No shops have latitude/longitude yet
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {selected ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-3 py-2 text-sm">
            <div className="flex min-w-0 items-center gap-3">
              {shopPhotoUrl(selected) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={shopPhotoUrl(selected)!}
                  alt=""
                  className="size-10 shrink-0 rounded-full border object-cover"
                />
              ) : (
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                  {shopDisplayName(selected).slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-medium">{shopDisplayName(selected)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {addressLine(selected) ??
                    (selectedCoords
                      ? `${selectedCoords.lat.toFixed(4)}, ${selectedCoords.lng.toFixed(4)}`
                      : "No map location set")}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                onOpenChange(false);
                router.push(`/shops/${selected.shop_id}`);
              }}
            >
              Open shop
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
