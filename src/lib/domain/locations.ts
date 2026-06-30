import cityLocationData from '../../location-cities.json';
import type { BinderItem, CityLocationRecord, LocationOption, MapPinGroup } from '../types';

export const MAP_BOUNDS = { west: -171, east: -52, north: 73, south: 6 };

const CURATED_LOCATIONS: LocationOption[] = [
  { id: 'anchorage-ak', name: 'Anchorage', region: 'Alaska', country: 'USA', kind: 'city', lat: 61.2176, lon: -149.8997 },
  { id: 'denali-national-park-ak', name: 'Denali National Park', region: 'Alaska', country: 'USA', kind: 'park', lat: 63.1148, lon: -151.1926 },
  { id: 'vancouver-bc', name: 'Vancouver', region: 'British Columbia', country: 'Canada', kind: 'city', lat: 49.2827, lon: -123.1207 },
  { id: 'banff-national-park-ab', name: 'Banff National Park', region: 'Alberta', country: 'Canada', kind: 'park', lat: 51.4968, lon: -115.9281 },
  { id: 'seattle-wa', name: 'Seattle', region: 'Washington', country: 'USA', kind: 'city', lat: 47.6062, lon: -122.3321 },
  { id: 'portland-or', name: 'Portland', region: 'Oregon', country: 'USA', kind: 'city', lat: 45.5152, lon: -122.6784 },
  { id: 'san-francisco-ca', name: 'San Francisco', region: 'California', country: 'USA', kind: 'city', lat: 37.7749, lon: -122.4194 },
  { id: 'yosemite-national-park-ca', name: 'Yosemite National Park', region: 'California', country: 'USA', kind: 'park', lat: 37.8651, lon: -119.5383 },
  { id: 'los-angeles-ca', name: 'Los Angeles', region: 'California', country: 'USA', kind: 'city', lat: 34.0522, lon: -118.2437 },
  { id: 'disneyland-anaheim-ca', name: 'Disneyland Resort', region: 'California', country: 'USA', kind: 'venue', lat: 33.8121, lon: -117.919 },
  { id: 'las-vegas-nv', name: 'Las Vegas', region: 'Nevada', country: 'USA', kind: 'city', lat: 36.1716, lon: -115.1391 },
  { id: 'grand-canyon-national-park-az', name: 'Grand Canyon National Park', region: 'Arizona', country: 'USA', kind: 'park', lat: 36.1069, lon: -112.1129 },
  { id: 'denver-co', name: 'Denver', region: 'Colorado', country: 'USA', kind: 'city', lat: 39.7392, lon: -104.9903 },
  { id: 'rocky-mountain-national-park-co', name: 'Rocky Mountain National Park', region: 'Colorado', country: 'USA', kind: 'park', lat: 40.3428, lon: -105.6836 },
  { id: 'chicago-il', name: 'Chicago', region: 'Illinois', country: 'USA', kind: 'city', lat: 41.8781, lon: -87.6298 },
  { id: 'wrigley-field-il', name: 'Wrigley Field', region: 'Illinois', country: 'USA', kind: 'venue', lat: 41.9484, lon: -87.6553 },
  { id: 'new-york-ny', name: 'New York City', region: 'New York', country: 'USA', kind: 'city', lat: 40.7128, lon: -74.006 },
  { id: 'boston-ma', name: 'Boston', region: 'Massachusetts', country: 'USA', kind: 'city', lat: 42.3601, lon: -71.0589 },
  { id: 'fenway-park-ma', name: 'Fenway Park', region: 'Massachusetts', country: 'USA', kind: 'venue', lat: 42.3467, lon: -71.0972 },
  { id: 'toronto-on', name: 'Toronto', region: 'Ontario', country: 'Canada', kind: 'city', lat: 43.6532, lon: -79.3832 },
  { id: 'montreal-qc', name: 'Montreal', region: 'Quebec', country: 'Canada', kind: 'city', lat: 45.5017, lon: -73.5673 },
  { id: 'orlando-fl', name: 'Orlando', region: 'Florida', country: 'USA', kind: 'city', lat: 28.5383, lon: -81.3792 },
  { id: 'walt-disney-world-fl', name: 'Walt Disney World', region: 'Florida', country: 'USA', kind: 'venue', lat: 28.3772, lon: -81.5707 },
  { id: 'miami-fl', name: 'Miami', region: 'Florida', country: 'USA', kind: 'city', lat: 25.7617, lon: -80.1918 },
  { id: 'nashville-tn', name: 'Nashville', region: 'Tennessee', country: 'USA', kind: 'city', lat: 36.1627, lon: -86.7816 },
  { id: 'grand-ole-opry-tn', name: 'Grand Ole Opry', region: 'Tennessee', country: 'USA', kind: 'venue', lat: 36.2069, lon: -86.692 },
  { id: 'new-orleans-la', name: 'New Orleans', region: 'Louisiana', country: 'USA', kind: 'city', lat: 29.9511, lon: -90.0715 },
  { id: 'mexico-city-cdmx', name: 'Mexico City', region: 'CDMX', country: 'Mexico', kind: 'city', lat: 19.4326, lon: -99.1332 },
  { id: 'cancun-quintana-roo', name: 'Cancun', region: 'Quintana Roo', country: 'Mexico', kind: 'city', lat: 21.1619, lon: -86.8515 },
  { id: 'san-juan-pr', name: 'San Juan', region: 'Puerto Rico', country: 'USA', kind: 'city', lat: 18.4655, lon: -66.1057 }
];

const CITY_LOCATIONS: LocationOption[] = (cityLocationData as CityLocationRecord[]).map((city, index) => ({
  id: `city-${city.countryCode.toLowerCase()}-${index}`,
  name: city.name,
  region: city.region,
  country: city.country,
  kind: 'city',
  lat: city.lat,
  lon: city.lon
}));

export const LOCATION_SEARCH_LIBRARY = [...CURATED_LOCATIONS, ...CITY_LOCATIONS];

export function locationById(id?: string) {
  return LOCATION_SEARCH_LIBRARY.find((location) => location.id === id);
}

export function locationForItem(item: BinderItem) {
  return item.location ?? locationById(item.locationId);
}

export function normalizeLocationSearch(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function locationOptionLabel(location: LocationOption) {
  return `${[location.name, location.region, location.country].filter(Boolean).join(', ')} (${location.kind})`;
}

export function locationInputValue(item: BinderItem) {
  const location = locationForItem(item);
  return location ? locationOptionLabel(location) : '';
}

function locationSearchText(location: LocationOption) {
  return `${location.name} ${location.region} ${location.country} ${location.kind}`.toLowerCase();
}

export function findLocationSuggestions(query: string, limit = 80) {
  const normalized = normalizeLocationSearch(query);
  if (normalized.length < 2) return [];

  const exact: LocationOption[] = [];
  const prefix: LocationOption[] = [];
  const contains: LocationOption[] = [];

  for (const location of LOCATION_SEARCH_LIBRARY) {
    const name = location.name.toLowerCase();
    const label = locationOptionLabel(location).toLowerCase();
    const searchable = locationSearchText(location);

    if (name === normalized || label === normalized) exact.push(location);
    else if (name.startsWith(normalized) || label.startsWith(normalized)) prefix.push(location);
    else if (searchable.includes(normalized)) contains.push(location);
  }

  return [...exact, ...prefix, ...contains].slice(0, limit);
}

export function findLocationByInput(value: string) {
  const normalized = normalizeLocationSearch(value);
  if (!normalized) return undefined;
  return LOCATION_SEARCH_LIBRARY.find((location) => normalizeLocationSearch(locationOptionLabel(location)) === normalized);
}

export function projectLocation(location: LocationOption) {
  const x = ((location.lon - MAP_BOUNDS.west) / (MAP_BOUNDS.east - MAP_BOUNDS.west)) * 100;
  const y = ((MAP_BOUNDS.north - location.lat) / (MAP_BOUNDS.north - MAP_BOUNDS.south)) * 100;
  return {
    x: Math.min(96, Math.max(4, x)),
    y: Math.min(94, Math.max(6, y))
  };
}

export function mapPinStyle(pin: MapPinGroup) {
  return `left:${pin.x}%;top:${pin.y}%;`;
}

export function buildMapPins(items: BinderItem[]): MapPinGroup[] {
  const grouped = new Map<string, BinderItem[]>();
  const locations = new Map<string, LocationOption>();

  for (const item of items) {
    const location = locationForItem(item);
    if (!location) continue;
    grouped.set(location.id, [...(grouped.get(location.id) ?? []), item]);
    locations.set(location.id, location);
  }

  return Array.from(grouped.entries())
    .map(([locationId, locationItems]) => {
      const location = locations.get(locationId);
      if (!location) return null;
      const point = projectLocation(location);
      return { location, items: locationItems, x: point.x, y: point.y };
    })
    .filter((pin): pin is MapPinGroup => Boolean(pin))
    .sort((a, b) => a.location.name.localeCompare(b.location.name));
}
