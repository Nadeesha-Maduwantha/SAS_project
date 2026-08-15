"use client";

// ─────────────────────────────────────────────────────────────
//  MapErrorBoundary.jsx
//  Place at: app/components/MapErrorBoundary.jsx
//
//  Wraps any map component. If Leaflet crashes or the component
//  throws, it shows a friendly fallback instead of a white screen.
//
//  Usage:
//    <MapErrorBoundary>
//      <LeafletMap ... />
//    </MapErrorBoundary>
// ─────────────────────────────────────────────────────────────

import { Component } from "react";

export default class MapErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message ?? "Unknown error" };
  }

  componentDidCatch(error, info) {
    console.error("MapErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width:          "100%",
          height:         "100%",
          minHeight:      "200px",
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          gap:            "12px",
          background:     "#F8FAFC",
          border:         "1px solid #E2E8F0",
          borderRadius:   "12px",
          color:          "#94A3B8",
        }}>
          {/* Map icon */}
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
            <line x1="8" y1="2" x2="8" y2="18"/>
            <line x1="16" y1="6" x2="16" y2="22"/>
          </svg>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "14px", fontWeight: "600", color: "#64748B", marginBottom: "4px" }}>
              Map could not be loaded
            </p>
            <p style={{ fontSize: "12px", color: "#94A3B8" }}>
              Please refresh the page or check your connection
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, message: "" })}
            style={{
              marginTop:    "4px",
              padding:      "6px 16px",
              fontSize:     "12px",
              fontWeight:   "600",
              color:        "#2563EB",
              background:   "#EFF6FF",
              border:       "1px solid #BFDBFE",
              borderRadius: "8px",
              cursor:       "pointer",
            }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}