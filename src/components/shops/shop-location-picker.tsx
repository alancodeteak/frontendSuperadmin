"use client";

import { useEffect, useRef, useState } from "react";
import { MapPinIcon, SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_MAP_CENTER,
  parseGeocoderComponents,
  reverseGeocodeAddress,
} from "@/lib/google-maps-address";
import { loadGoogleMaps } from "@/lib/google-maps";
import {
  getUaePhoneDisplayPart,
  normalizeUaePhoneInput,
  UAE_COUNTRY_CODE,
  type UaePhoneType,
} from "@/lib/shop-create-validation";
import { cn } from "@/lib/utils";

export type ShopLocationPickerValue = {
  address_line_1: string;
  address_line_2: string;
  locality: string;
  city: string;
  contact_number_type: UaePhoneType;
  contact_number: string;
  latitude: string;
  longitude: string;
};

type ShopLocationPickerProps = {
  value: ShopLocationPickerValue;
  onChange: (value: ShopLocationPickerValue) => void;
  showContactNumber?: boolean;
  className?: string;
  onFieldBlur?: (field: keyof ShopLocationPickerValue) => void;
  fieldErrors?: Partial<Record<keyof ShopLocationPickerValue, string | null>>;
};

function toLatLng(value: ShopLocationPickerValue) {
  const lat = Number(value.latitude);
  const lng = Number(value.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }
  return DEFAULT_MAP_CENTER;
}

function FormField({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label
        htmlFor={htmlFor}
        className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
      >
        {label}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function ShopLocationPicker({
  value,
  onChange,
  showContactNumber = true,
  className,
  onFieldBlur,
  fieldErrors,
}: ShopLocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markerInstance = useRef<google.maps.Marker | null>(null);
  const geocoderInstance = useRef<google.maps.Geocoder | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteInstance = useRef<google.maps.places.Autocomplete | null>(
    null,
  );

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const g = await loadGoogleMaps();
        if (cancelled || !mapRef.current) return;

        const center = toLatLng(value);
        const map = new g.maps.Map(mapRef.current, {
          center,
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        const marker = new g.maps.Marker({
          map,
          position: center,
          draggable: true,
          title: "Shop location",
        });

        const geocoder = new g.maps.Geocoder();

        async function applyLatLng(lat: number, lng: number) {
          const current = valueRef.current;
          onChange({
            ...current,
            latitude: String(lat),
            longitude: String(lng),
          });

          const parsed = await reverseGeocodeAddress(geocoder, lat, lng);
          if (!parsed) return;

          onChange({
            ...valueRef.current,
            latitude: String(lat),
            longitude: String(lng),
            address_line_1:
              parsed.address_line_1 || valueRef.current.address_line_1,
            locality: parsed.locality || valueRef.current.locality,
            city: parsed.city || valueRef.current.city,
          });
        }

        map.addListener("click", (event: google.maps.MapMouseEvent) => {
          if (!event.latLng) return;
          marker.setPosition(event.latLng);
          void applyLatLng(event.latLng.lat(), event.latLng.lng());
        });

        marker.addListener("dragend", () => {
          const pos = marker.getPosition();
          if (!pos) return;
          void applyLatLng(pos.lat(), pos.lng());
        });

        if (searchInputRef.current) {
          const autocomplete = new g.maps.places.Autocomplete(
            searchInputRef.current,
            {
              fields: ["geometry", "formatted_address", "address_components"],
            },
          );
          autocomplete.bindTo("bounds", map);
          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            const location = place.geometry?.location;
            if (!location) return;
            const lat = location.lat();
            const lng = location.lng();
            map.panTo(location);
            map.setZoom(16);
            marker.setPosition(location);

            const parsed = place.address_components
              ? parseGeocoderComponents({
                  address_components: place.address_components,
                  formatted_address: place.formatted_address ?? "",
                } as google.maps.GeocoderResult)
              : {};

            onChange({
              ...valueRef.current,
              latitude: String(lat),
              longitude: String(lng),
              address_line_1:
                parsed.address_line_1 || valueRef.current.address_line_1,
              locality: parsed.locality || valueRef.current.locality,
              city: parsed.city || valueRef.current.city,
            });
          });
          autocompleteInstance.current = autocomplete;
        }

        mapInstance.current = map;
        markerInstance.current = marker;
        geocoderInstance.current = geocoder;
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
      autocompleteInstance.current = null;
      markerInstance.current = null;
      mapInstance.current = null;
      geocoderInstance.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const marker = markerInstance.current;
    const map = mapInstance.current;
    if (!marker || !map) return;

    const lat = Number(value.latitude);
    const lng = Number(value.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const pos = { lat, lng };
    marker.setPosition(pos);
    map.panTo(pos);
  }, [value.latitude, value.longitude]);

  function updateField<K extends keyof ShopLocationPickerValue>(
    key: K,
    nextValue: ShopLocationPickerValue[K],
  ) {
    onChange({ ...value, [key]: nextValue });
  }

  return (
    <div className={cn("space-y-6", className)}>
      <FormField
        label="Search place"
        htmlFor="location-search"
        hint="Start typing to find the shop, then fine-tune the pin on the map."
        className="lg:col-span-2"
      >
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="location-search"
            ref={searchInputRef}
            className="pl-8"
            placeholder="Search address or place name…"
            disabled={Boolean(mapError)}
          />
        </div>
      </FormField>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="relative h-64 overflow-hidden rounded-xl border bg-muted xl:h-full xl:min-h-[24rem]">
          <div ref={mapRef} className="absolute inset-0" />
          {!mapReady && !mapError ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              Loading map…
            </div>
          ) : null}
          {mapError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-card/90 p-4 text-center">
              <MapPinIcon className="size-7 text-muted-foreground" />
              <p className="text-sm text-destructive">{mapError}</p>
              <p className="text-xs text-muted-foreground">
                You can still enter the address fields manually.
              </p>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Address line 1"
          htmlFor="address_line_1"
          error={fieldErrors?.address_line_1}
          className="sm:col-span-2"
        >
          <Input
            id="address_line_1"
            value={value.address_line_1}
            aria-invalid={Boolean(fieldErrors?.address_line_1)}
            onBlur={() => onFieldBlur?.("address_line_1")}
            onChange={(e) => updateField("address_line_1", e.target.value)}
            placeholder="Building, street, area"
          />
        </FormField>

        <FormField
          label="Address line 2"
          htmlFor="address_line_2"
          className="sm:col-span-2"
        >
          <Input
            id="address_line_2"
            value={value.address_line_2}
            onBlur={() => onFieldBlur?.("address_line_2")}
            onChange={(e) => updateField("address_line_2", e.target.value)}
            placeholder="Floor, suite, landmark (optional)"
          />
        </FormField>

        <FormField
          label="Locality"
          htmlFor="locality"
          error={fieldErrors?.locality}
        >
          <Input
            id="locality"
            value={value.locality}
            onBlur={() => onFieldBlur?.("locality")}
            onChange={(e) => updateField("locality", e.target.value)}
            placeholder="Dubai Marina"
          />
        </FormField>

        <FormField label="City" htmlFor="city" error={fieldErrors?.city}>
          <Input
            id="city"
            value={value.city}
            onBlur={() => onFieldBlur?.("city")}
            onChange={(e) => updateField("city", e.target.value)}
            placeholder="Dubai"
          />
        </FormField>

        <FormField
          label="Latitude"
          htmlFor="latitude"
          error={fieldErrors?.latitude}
        >
          <Input
            id="latitude"
            value={value.latitude}
            aria-invalid={Boolean(fieldErrors?.latitude)}
            className="font-mono text-xs"
            onBlur={() => onFieldBlur?.("latitude")}
            onChange={(e) => updateField("latitude", e.target.value)}
            placeholder="25.0801"
          />
        </FormField>

        <FormField
          label="Longitude"
          htmlFor="longitude"
          error={fieldErrors?.longitude}
        >
          <Input
            id="longitude"
            value={value.longitude}
            aria-invalid={Boolean(fieldErrors?.longitude)}
            className="font-mono text-xs"
            onBlur={() => onFieldBlur?.("longitude")}
            onChange={(e) => updateField("longitude", e.target.value)}
            placeholder="55.1402"
          />
        </FormField>

        {showContactNumber ? (
          <FormField
            label="Contact number"
            htmlFor="contact_number"
            hint={
              value.contact_number_type === "landline"
                ? "Shop landline number for delivery or support."
                : "Shop mobile number for delivery or support."
            }
            error={fieldErrors?.contact_number}
            className="sm:col-span-2"
          >
            <div className="flex gap-2">
              <Select
                value={value.contact_number_type}
                onValueChange={(next) =>
                  updateField("contact_number_type", next as UaePhoneType)
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="landline">Landline</SelectItem>
                  <SelectItem value="mobile">Mobile (+971)</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex min-w-0 flex-1 overflow-hidden rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring">
                <div className="flex items-center border-r border-input bg-muted px-3 text-sm text-muted-foreground">
                  {UAE_COUNTRY_CODE}
                </div>
                <Input
                  id="contact_number"
                  value={getUaePhoneDisplayPart(value.contact_number)}
                  aria-invalid={Boolean(fieldErrors?.contact_number)}
                  className="min-w-0 flex-1 border-0 shadow-none focus-visible:ring-0"
                  onBlur={() => {
                    onFieldBlur?.("contact_number");
                    if (value.contact_number.trim()) {
                      updateField("contact_number", normalizeUaePhoneInput(value.contact_number));
                    }
                  }}
                  onChange={(e) =>
                    updateField("contact_number", normalizeUaePhoneInput(e.target.value))
                  }
                  placeholder={
                    value.contact_number_type === "landline" ? "042345678" : "0501234567"
                  }
                />
              </div>
            </div>
          </FormField>
        ) : null}
        </div>
      </div>
    </div>
  );
}
