"use client";

import { useEffect, useRef } from "react";

// MapPinIcon for the overlay label
const MapPinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);

const STATUS_COLORS = {
  completed: "#10b981",
  overdue:   "#ef4444",
  pending:   "#94a3b8",
};

export default function MilestoneMap({ milestone, allMilestones, currentIndex }) {
  const mapRef      = useRef(null);
  const mapInstance = useRef(null);
  const markersRef  = useRef([]);
  const polylineRef = useRef(null);
  const pulseRef    = useRef(null);

  // ── Initialize map once ──────────────────────────────────────────────────
  useEffect(() => {
    if (mapInstance.current) return; // already initialized

    // Also guard against leftover _leaflet_id from Strict Mode's first unmount
    if (mapRef.current && mapRef.current._leaflet_id) {
      delete mapRef.current._leaflet_id;
    }

    import("leaflet").then((L) => {
      // Fix default marker icon paths broken by webpack
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current, {
        center:          [milestone.location.lat, milestone.location.lng],
        zoom:            5,
        zoomControl:     true,
        attributionControl: false,
        scrollWheelZoom: false,
      });

      // Dark-style tile layer (CartoDB Dark Matter — free, no key)
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
      }).addTo(map);

      // Attribution (small, bottom right)
      L.control.attribution({ prefix: false })
        .addAttribution('© <a href="https://carto.com">CARTO</a> © <a href="https://www.openstreetmap.org/copyright">OSM</a>')
        .addTo(map);

      mapInstance.current = map;
      drawAll(L, map, allMilestones, currentIndex);
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
      if (mapRef.current) {
        delete mapRef.current._leaflet_id;
      }
      // Also clear markers/polyline refs
      markersRef.current = [];
      polylineRef.current = null;
      pulseRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update when milestone changes ────────────────────────────────────────
  useEffect(() => {
    if (!mapInstance.current) return;
    import("leaflet").then((L) => {
      // Clear old markers + polyline
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (polylineRef.current) { polylineRef.current.remove(); polylineRef.current = null; }
      if (pulseRef.current)    { pulseRef.current.remove();    pulseRef.current    = null; }

      drawAll(L, mapInstance.current, allMilestones, currentIndex);

      // Fly to new location smoothly
      mapInstance.current.flyTo(
        [milestone.location.lat, milestone.location.lng],
        5,
        { duration: 1.2, easeLinearity: 0.4 }
      );
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  function drawAll(L, map, milestones, activeIdx) {
    // Route polyline
    const latlngs = milestones.map((m) => [m.location.lat, m.location.lng]);
    polylineRef.current = L.polyline(latlngs, {
      color:     "#3b82f6",
      weight:    2,
      opacity:   0.5,
      dashArray: "6 5",
    }).addTo(map);

    // Markers
    milestones.forEach((m, i) => {
      const isActive = i === activeIdx;
      const color    = isActive
        ? (m.status === "overdue" ? "#ef4444" : m.status === "completed" ? "#10b981" : "#3b82f6")
        : STATUS_COLORS[m.status];

      const icon = L.divIcon({
        className: "",
        html: isActive
          ? `<div style="
              width:18px;height:18px;
              background:${color};
              border:3px solid white;
              border-radius:50%;
              box-shadow:0 0 0 4px ${color}55, 0 2px 8px rgba(0,0,0,0.4);
            "></div>`
          : `<div style="
              width:10px;height:10px;
              background:${color};
              border:2px solid rgba(255,255,255,0.6);
              border-radius:50%;
              opacity:0.85;
            "></div>`,
        iconSize:   isActive ? [18, 18] : [10, 10],
        iconAnchor: isActive ? [9, 9]   : [5, 5],
      });

      const marker = L.marker([m.location.lat, m.location.lng], { icon })
        .addTo(map)
        .bindTooltip(
          `<div style="font-size:11px;font-weight:600;color:#1e293b">${m.number}. ${m.name}</div>
           <div style="font-size:10px;color:#64748b;margin-top:2px">${m.location.label}</div>`,
          { direction: "top", offset: [0, -8], className: "sas-tooltip" }
        );

      markersRef.current.push(marker);
    });
  }

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-gray-700" style={{ height: "280px" }}>
      {/* Inject Leaflet CSS */}
      <style>{`
        @import url("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
        .sas-tooltip {
          background: white !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 8px !important;
          padding: 6px 10px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
        }
        .sas-tooltip::before { display: none !important; }
        .leaflet-control-zoom a {
          background: #1e293b !important;
          color: #94a3b8 !important;
          border-color: #334155 !important;
        }
        .leaflet-control-zoom a:hover { background: #334155 !important; color: white !important; }
        .leaflet-control-attribution {
          background: rgba(15,23,42,0.7) !important;
          color: #475569 !important;
          font-size: 9px !important;
        }
        .leaflet-control-attribution a { color: #64748b !important; }
      `}</style>

      {/* Map container */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Location label overlay */}
      <div className="absolute bottom-0 left-0 right-0 px-4 py-3 pointer-events-none"
           style={{ background: "linear-gradient(to top, rgba(15,23,42,0.85) 0%, transparent 100%)" }}>
        <div className="flex items-center gap-2">
          <span className="text-slate-400"><MapPinIcon /></span>
          <span className="text-white text-sm font-medium">{milestone.location.label}</span>
          <span className="ml-auto text-slate-400 text-xs font-mono">
            {milestone.location.lat.toFixed(4)}°, {milestone.location.lng.toFixed(4)}°
          </span>
        </div>
      </div>
    </div>
  );
}