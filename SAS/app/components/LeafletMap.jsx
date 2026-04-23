"use client";

// ─────────────────────────────────────────────────────────────
//  LeafletMap.jsx
//  Place at: app/(protected)/admin/department_overview/LeafletMap.jsx
//
//  Props:
//    pins        – { lat, lng, id, label, status, route }[]
//    routes      – { from:[lat,lng], to:[lat,lng], id, status }[]
//    selectedPin – string | null
//    onPinClick  – (id: string) => void
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";

// Status → colour mapping (must match page.jsx SHIP_STATUS keys)
const STATUS_COLOR = {
  on_track: "#16A34A",
  at_risk:  "#D97706",
  overdue:  "#DC2626",
};

const DEFAULT_COLOR = "#64748B";

function colorFor(status) {
  return STATUS_COLOR[status] ?? DEFAULT_COLOR;
}

export default function LeafletMap({ pins = [], routes = [], selectedPin, onPinClick }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const markersRef   = useRef([]);
  const polylinesRef = useRef([]);

  // ── Bootstrap Leaflet once ──────────────────────────────────
  useEffect(() => {
    if (mapRef.current) return; // already initialised

    const L = window.L;
    if (!L) {
      console.error("LeafletMap: Leaflet (window.L) not found. Make sure leaflet.css and leaflet.js are loaded.");
      return;
    }

    // Fix default marker icon paths broken by webpack
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    const map = L.map(containerRef.current, {
      center:    [20, 20],
      zoom:      2,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Draw / redraw pins and routes when data changes ─────────
  useEffect(() => {
    const L   = window.L;
    const map = mapRef.current;
    if (!L || !map) return;

    // Clear previous layers
    markersRef.current.forEach(m => m.remove());
    polylinesRef.current.forEach(p => p.remove());
    markersRef.current   = [];
    polylinesRef.current = [];

    // Draw route lines first (behind pins)
    routes.forEach(r => {
      const color   = colorFor(r.status);
      const isSelected = r.id === selectedPin;
      const line = L.polyline([r.from, r.to], {
        color,
        weight:    isSelected ? 3 : 1.5,
        opacity:   isSelected ? 0.9 : 0.45,
        dashArray: r.status === "on_track" ? null : "6 4",
      }).addTo(map);
      polylinesRef.current.push(line);
    });

    // Draw pins
    pins.forEach(pin => {
      const color      = colorFor(pin.status);
      const isSelected = pin.id === selectedPin;
      const size       = isSelected ? 14 : 10;

      const icon = L.divIcon({
        className: "",
        html: `
          <div style="
            width:${size}px; height:${size}px;
            border-radius:50%;
            background:${color};
            border:${isSelected ? "3px solid white" : "2px solid white"};
            box-shadow:0 0 0 ${isSelected ? "3px" : "2px"} ${color},
                       0 2px 6px rgba(0,0,0,0.35);
            transition:all 0.15s ease;
          "></div>`,
        iconSize:   [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([pin.lat, pin.lng], { icon })
        .addTo(map)
        .bindTooltip(
          `<div style="font-size:11px;font-weight:600;color:#0F172A;">${pin.label}</div>
           <div style="font-size:10px;color:#64748B;">${pin.route}</div>`,
          { direction: "top", offset: [0, -6], opacity: 1 }
        )
        .on("click", () => onPinClick?.(pin.id));

      markersRef.current.push(marker);
    });
  }, [pins, routes, selectedPin]);

  // ── Pan to selected pin ─────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedPin) return;
    const pin = pins.find(p => p.id === selectedPin);
    if (pin) map.flyTo([pin.lat, pin.lng], 5, { duration: 0.8 });
  }, [selectedPin, pins]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", minHeight: "400px" }}
    />
  );
}