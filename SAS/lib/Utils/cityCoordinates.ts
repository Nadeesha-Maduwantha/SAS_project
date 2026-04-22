export const cityCoordinates: Record<string, [number, number]> = {
  // Asia
  'Shanghai': [31.2304, 121.4737],
  'Tokyo': [35.6762, 139.6503],
  'Singapore': [1.3521, 103.8198],
  'Shenzhen': [22.5431, 114.0579],
  'Dubai': [25.2048, 55.2708],
  'Mumbai': [19.0760, 72.8777],

  // Europe
  'Hamburg': [53.5511, 9.9937],
  'Rotterdam': [51.9244, 4.4777],
  'London': [51.5074, -0.1278],
  'Berlin': [52.5200, 13.4050],
  'Paris': [48.8566, 2.3522],

  // North America
  'New York': [40.7128, -74.0060],
  'Los Angeles': [34.0522, -118.2437],
  'Chicago': [41.8781, -87.6298],
  'Vancouver': [49.2827, -123.1207],
  'Toronto': [43.6532, -79.3832],

  // Australia
  'Sydney': [-33.8688, 151.2093],

  // Default fallback
  'Unknown': [0, 0],
}

export function getCoordinates(city: string): [number, number] {
  return cityCoordinates[city] ?? [0, 0]
}

export function interpolatePosition(
  origin: [number, number],
  destination: [number, number],
  progress: number
): [number, number] {
  const t = progress / 100
  return [
    origin[0] + (destination[0] - origin[0]) * t,
    origin[1] + (destination[1] - origin[1]) * t,
  ]
}