'use client'

import { useEffect, useState } from 'react'
import type L from 'leaflet'
import type { MapContainerProps, TileLayerProps, MarkerProps, PopupProps, PolylineProps } from 'react-leaflet'
import { getCoordinates, interpolatePosition } from '@/lib/Utils/cityCoordinates'

interface Props {
  originCity: string
  destinationCity: string
  progressPercent: number
}

interface MapComponentsType {
  MapContainer: React.ComponentType<MapContainerProps>
  TileLayer: React.ComponentType<TileLayerProps>
  Marker: React.ComponentType<MarkerProps>
  Popup: React.ComponentType<PopupProps>
  Polyline: React.ComponentType<PolylineProps>
  originIcon: L.DivIcon
  destinationIcon: L.DivIcon
  currentIcon: L.DivIcon
}

export function ShipmentMap({ originCity, destinationCity, progressPercent }: Props) {
  const [MapComponents, setMapComponents] = useState<MapComponentsType | null>(null)

  useEffect(() => {
    // Dynamically import leaflet to avoid SSR issues
    async function loadMap() {
      const L = (await import('leaflet')).default
      const { MapContainer, TileLayer, Marker, Popup, Polyline } = await import('react-leaflet')

      // Fix default marker icons
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      // Custom icons
      const originIcon = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
        className: '',
        iconAnchor: [7, 7],
      })

      const destinationIcon = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#dc2626;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
        className: '',
        iconAnchor: [7, 7],
      })

      const currentIcon = L.divIcon({
        html: `<div style="width:16px;height:16px;border-radius:50%;background:#f59e0b;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);animation:pulse 2s infinite"></div>`,
        className: '',
        iconAnchor: [8, 8],
      })

      setMapComponents({ MapContainer, TileLayer, Marker, Popup, Polyline, originIcon, destinationIcon, currentIcon })
    }

    loadMap()
  }, [])

  const originCoords = getCoordinates(originCity)
  const destCoords = getCoordinates(destinationCity)
  const currentCoords = interpolatePosition(originCoords, destCoords, progressPercent)

  const center: [number, number] = [
    (originCoords[0] + destCoords[0]) / 2,
    (originCoords[1] + destCoords[1]) / 2,
  ]

  if (!MapComponents) {
    return (
      <div style={{
        height: '260px', background: '#f9fafb', borderRadius: '10px',
        border: '1.5px dashed #d1d5db', display: 'flex',
        alignItems: 'center', justifyContent: 'center'
      }}>
        <p style={{ fontSize: '13px', color: '#9ca3af' }}>Loading map...</p>
      </div>
    )
  }

  const { MapContainer, TileLayer, Marker, Popup, Polyline, originIcon, destinationIcon, currentIcon } = MapComponents

  return (
    <>
      <style>{`
        @import url('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.8; }
        }
      `}</style>
      <div style={{ height: '260px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
        <MapContainer
          center={center}
          zoom={3}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Origin Marker */}
          <Marker position={originCoords} icon={originIcon}>
            <Popup>
              <strong>Origin</strong><br />{originCity}
            </Popup>
          </Marker>

          {/* Destination Marker */}
          <Marker position={destCoords} icon={destinationIcon}>
            <Popup>
              <strong>Destination</strong><br />{destinationCity}
            </Popup>
          </Marker>

          {/* Current Location Marker */}
          {progressPercent > 0 && progressPercent < 100 && (
            <Marker position={currentCoords} icon={currentIcon}>
              <Popup>
                <strong>Current Location</strong><br />
                Approx. {progressPercent}% of route completed
              </Popup>
            </Marker>
          )}

          {/* Route Line */}
          <Polyline
            positions={[originCoords, destCoords]}
            pathOptions={{ color: '#2563eb', weight: 2, dashArray: '6 4', opacity: 0.7 }}
          />

          {/* Completed Route Line */}
          {progressPercent > 0 && (
            <Polyline
              positions={[originCoords, currentCoords]}
              pathOptions={{ color: '#2563eb', weight: 3, opacity: 1 }}
            />
          )}
        </MapContainer>
      </div>
    </>
  )
}