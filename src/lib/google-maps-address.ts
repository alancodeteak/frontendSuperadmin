export const DEFAULT_MAP_CENTER = { lat: 25.2048, lng: 55.2708 };

export type ParsedAddressFields = {
  address_line_1?: string;
  locality?: string;
  city?: string;
};

export function parseGeocoderComponents(
  result: google.maps.GeocoderResult,
): ParsedAddressFields {
  const get = (type: string, short = false) => {
    const match = result.address_components.find((c) => c.types.includes(type));
    return short ? match?.short_name : match?.long_name;
  };

  const streetNumber = get("street_number");
  const route = get("route");
  const line1 = [streetNumber, route].filter(Boolean).join(" ");

  return {
    address_line_1: line1 || result.formatted_address.split(",")[0] || "",
    locality:
      get("sublocality_level_1") ||
      get("neighborhood") ||
      get("sublocality") ||
      "",
    city: get("locality") || get("administrative_area_level_1") || "",
  };
}

export async function reverseGeocodeAddress(
  geocoder: google.maps.Geocoder,
  lat: number,
  lng: number,
): Promise<ParsedAddressFields | null> {
  try {
    const response = await geocoder.geocode({ location: { lat, lng } });
    const result = response.results[0];
    if (!result) return null;
    return parseGeocoderComponents(result);
  } catch {
    return null;
  }
}
