export interface Hospital {
  id: string;
  name: string;
  address: string;
  phone?: string | undefined;
  website?: string | undefined;
  emergency?: boolean | undefined;
  lat: number;
  lon: number;
  distanceKm: number;
  imageUrl: string;
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function buildAddress(tags: Record<string, string>): string {
  const street = tags["addr:street"];
  const number = tags["addr:housenumber"];
  const suburb = tags["addr:suburb"] || tags["addr:neighbourhood"];
  const city = tags["addr:city"];
  const state = tags["addr:state"];
  const parts = [
    street ? (number ? `${street}, ${number}` : street) : undefined,
    suburb,
    city,
    state,
  ].filter(Boolean);
  return parts.length ? parts.join(" - ") : "Endereço não informado";
}

function imageFor(tags: Record<string, string>, lat: number, lon: number) {
  const direct = tags['image'] || tags["image:0"];
  if (direct && /^https?:\/\//.test(direct)) return direct;
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lon}&zoom=17&size=400x220&markers=${lat},${lon},lightblue1`;
}

export async function fetchNearbyHospitals(
  lat: number,
  lon: number,
  radiusMeters = 5000,
): Promise<Hospital[]> {
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"~"^(hospital|clinic)$"](around:${radiusMeters},${lat},${lon});
      way["amenity"~"^(hospital|clinic)$"](around:${radiusMeters},${lat},${lon});
      relation["amenity"~"^(hospital|clinic)$"](around:${radiusMeters},${lat},${lon});
    );
    out center tags;`;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ data: query }).toString(),
  });

  if (!res.ok) {
    throw new Error(`Falha ao consultar hospitais (${res.status}).`);
  }

  const json = (await res.json()) as { elements?: OverpassElement[] };
  const elements = json.elements ?? [];

  return elements
    .map((el): Hospital | null => {
      const tags = el.tags ?? {};
      const elLat = el.lat ?? el.center?.lat;
      const elLon = el.lon ?? el.center?.lon;
      if (elLat == null || elLon == null) return null;
      const name = tags['name'] || tags["name:pt"];
      if (!name) return null;
      return {
        id: `${el.type}/${el.id}`,
        name,
        address: buildAddress(tags),
        phone: tags['phone'] || tags["contact:phone"],
        website: tags['website'] || tags["contact:website"],
        emergency: tags['emergency'] === "yes",
        lat: elLat,
        lon: elLon,
        distanceKm: haversine(lat, lon, elLat, elLon),
        imageUrl: imageFor(tags, elLat, elLon),
      };
    })
    .filter((h): h is Hospital => h !== null)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
