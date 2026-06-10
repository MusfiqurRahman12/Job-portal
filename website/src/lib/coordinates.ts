export const LOCATION_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "san francisco": { lat: 37.7749, lng: -122.4194 },
  "new york": { lat: 40.7128, lng: -74.0060 },
  "london": { lat: 51.5074, lng: -0.1278 },
  "berlin": { lat: 52.5200, lng: 13.4050 },
  "bengaluru": { lat: 12.9716, lng: 77.5946 },
  "bangalore": { lat: 12.9716, lng: 77.5946 },
  "tokyo": { lat: 35.6762, lng: 139.6503 },
  "sydney": { lat: -33.8688, lng: 151.2093 },
  "singapore": { lat: 1.3521, lng: 103.8198 },
  "toronto": { lat: 43.6532, lng: -79.3832 },
  "vancouver": { lat: 49.2827, lng: -123.1207 },
  "amsterdam": { lat: 52.3676, lng: 4.9041 },
  "paris": { lat: 48.8566, lng: 2.3522 },
  "dublin": { lat: 53.3498, lng: -6.2603 },
  "seattle": { lat: 47.6062, lng: -122.3321 },
  "austin": { lat: 30.2672, lng: -97.7431 },
  "los angeles": { lat: 34.0522, lng: -118.2437 },
  "chicago": { lat: 41.8781, lng: -87.6298 },
  "boston": { lat: 42.3601, lng: -71.0589 },
  "denver": { lat: 39.7392, lng: -104.9903 },
  "stockholm": { lat: 59.3293, lng: 18.0686 },
  "munich": { lat: 48.1351, lng: 11.5820 },
  "zurich": { lat: 47.3769, lng: 8.5417 },
  "geneva": { lat: 46.2044, lng: 6.1432 },
};

// Major tech hubs to distribute unknown or "worldwide" locations across for visual variety
const TECH_HUBS = [
  { lat: 37.7749, lng: -122.4194 }, // SF
  { lat: 51.5074, lng: -0.1278 },   // London
  { lat: 48.8566, lng: 2.3522 },     // Paris
  { lat: 35.6762, lng: 139.6503 },   // Tokyo
  { lat: -33.8688, lng: 151.2093 },  // Sydney
  { lat: 1.3521, lng: 103.8198 },    // Singapore
  { lat: 43.6532, lng: -79.3832 },   // Toronto
  { lat: 12.9716, lng: 77.5946 },    // Bengaluru
  { lat: 52.5200, lng: 13.4050 },    // Berlin
  { lat: 40.7128, lng: -74.0060 },   // NY
];

/**
 * Returns a stable lat/lng coordinate for any location string.
 * Seeding the random generator with the text ensures the coordinates are deterministic.
 */
export function getCoordinatesForLocation(locationText: string): { lat: number; lng: number } {
  const cleanText = (locationText || "").trim();
  if (!cleanText) {
    return TECH_HUBS[0];
  }

  const normalized = cleanText.toLowerCase();

  // 1. Try exact or partial lookup
  for (const [key, coords] of Object.entries(LOCATION_COORDINATES)) {
    if (normalized.includes(key)) {
      return coords;
    }
  }

  // 2. Fallback: Seeded hash based on string content to get a stable, pseudo-random hub + jitter
  let hash = 0;
  for (let i = 0; i < cleanText.length; i++) {
    hash = cleanText.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hubIndex = Math.abs(hash) % TECH_HUBS.length;
  const baseCoords = TECH_HUBS[hubIndex];

  // Add small jitter (-1.5 to +1.5 degrees) to prevent markers from stacking directly on top of each other
  const jitterLat = ((Math.abs(hash) % 30) - 15) * 0.1;
  const jitterLng = (((Math.abs(hash >> 3)) % 30) - 15) * 0.1;

  return {
    lat: baseCoords.lat + jitterLat,
    lng: baseCoords.lng + jitterLng,
  };
}
