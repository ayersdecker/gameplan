import React, { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { Activity } from "../types";

let leafletModule: typeof import("leaflet") | null = null;
let markerClusterGroup: any = null;

function getLeaflet(): typeof import("leaflet") | null {
  if (leafletModule) return leafletModule;
  if (typeof window === "undefined") return null;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const L: typeof import("leaflet") = require("leaflet");
  leafletModule = L;

  // Load marker cluster plugin
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require("leaflet.markercluster");
  } catch (e) {
    console.warn("Marker cluster not available");
  }

  // Ensure default marker icons work when Leaflet CSS comes from a CDN.
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });

  return leafletModule;
}

interface LeafletMapProps {
  activities: Activity[];
  nearbyActivities: Activity[];
  userLocation: { latitude: number; longitude: number } | null;
  selectedActivity: Activity | null;
  onSelectActivity: (activity: Activity) => void;
  RADIUS_KM: number;
}

const CATEGORY_COLORS: { [key: string]: string } = {
  Outdoor: "#FF4040",
  Sports: "#FFD700",
  Fitness: "#00E676",
  Social: "#00E5FF",
  Learning: "#D946EF",
  Arts: "#FF6B35",
  Other: "#7C3AED",
};

const CATEGORY_ICONS: { [key: string]: string } = {
  Outdoor: "🏕️",
  Sports: "⚽",
  Fitness: "💪",
  Social: "🎉",
  Learning: "📚",
  Arts: "🎨",
  Other: "🎯",
};

// Enhanced marker HTML with better visuals
const createMarkerHTML = (
  color: string,
  icon: string,
  isSelected: boolean,
  distance?: number,
) => {
  const scale = isSelected ? 1.4 : 1;
  const shadow = isSelected
    ? "0 0 20px rgba(0, 122, 255, 0.8), 0 4px 10px rgba(0, 0, 0, 0.3)"
    : "0 3px 8px rgba(0, 0, 0, 0.25)";

  return `
    <div style="
      position: relative;
      width: ${40 * scale}px;
      height: ${40 * scale}px;
    ">
      ${
        isSelected
          ? `
        <div style="
          position: absolute;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(0, 122, 255, 0.4), transparent);
          border-radius: 50%;
          animation: marker-pulse 1.5s ease-out infinite;
        "></div>
      `
          : ""
      }
      <div style="
        position: absolute;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${20 * scale}px;
        box-shadow: ${shadow};
        border: ${isSelected ? "4px solid #007AFF" : "3px solid white"};
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        transform: ${isSelected ? "translateY(-4px)" : "translateY(0)"};
      ">
        ${icon}
      </div>
      ${
        distance !== undefined
          ? `
        <div style="
          position: absolute;
          bottom: -20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.75);
          color: white;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: bold;
          white-space: nowrap;
          font-family: Inter, sans-serif;
        ">${distance.toFixed(1)}km</div>
      `
          : ""
      }
    </div>
    <style>
      @keyframes marker-pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.5); opacity: 0.3; }
      }
    </style>
  `;
};

export const LeafletMap: React.FC<LeafletMapProps> = ({
  activities,
  nearbyActivities,
  userLocation,
  selectedActivity,
  onSelectActivity,
  RADIUS_KM,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Leaflet.Map | null>(null);
  const markersRef = useRef<Record<string, Leaflet.Marker>>({});
  const userMarkerRef = useRef<Leaflet.Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const handleCenter = () => {
    if (mapInstanceRef.current && userLocation) {
      mapInstanceRef.current.setView(
        [userLocation.latitude, userLocation.longitude],
        15,
        {
          animate: true,
          duration: 0.5,
        },
      );
    }
  };

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  // Initialize map
  useEffect(() => {
    const L = getLeaflet();
    if (!L) return;
    if (!mapRef.current || !userLocation) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current).setView(
        [userLocation.latitude, userLocation.longitude],
        15,
      );

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        {
          attribution: "© CartoDB, © OpenStreetMap contributors",
          maxZoom: 19,
          minZoom: 2,
        },
      ).addTo(map);

      mapInstanceRef.current = map;
      setMapReady(true);
    } else {
      mapInstanceRef.current.setView(
        [userLocation.latitude, userLocation.longitude],
        15,
      );
    }
  }, [userLocation?.latitude, userLocation?.longitude]);

  // Update user location marker
  useEffect(() => {
    const L = getLeaflet();
    if (!L) return;
    if (!mapInstanceRef.current || !userLocation) return;

    // Remove old user marker
    if (userMarkerRef.current) {
      mapInstanceRef.current.removeLayer(userMarkerRef.current);
    }

    // Add new user marker with custom styling
    const userMarker = L.marker(
      [userLocation.latitude, userLocation.longitude],
      {
        icon: L.divIcon({
          html: `
          <div style="
            position: relative;
            width: 40px;
            height: 40px;
          ">
            <div style="
              position: absolute;
              width: 100%;
              height: 100%;
              background: radial-gradient(circle, rgba(0, 122, 255, 0.3), transparent);
              border-radius: 50%;
              animation: pulse 2s infinite;
            "></div>
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 16px;
              height: 16px;
              background: #007AFF;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 0 8px rgba(0, 122, 255, 0.6);
            "></div>
          </div>
          <style>
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.3); opacity: 0.3; }
            }
          </style>
        `,
          iconSize: [40, 40],
          className: "user-marker",
        }),
      },
    ).addTo(mapInstanceRef.current);

    userMarkerRef.current = userMarker;
  }, [userLocation]);

  // Intentionally not rendering the radius circle (keep filtering logic, remove visual ring)

  // Update activity markers
  useEffect(() => {
    const L = getLeaflet();
    if (!L) return;
    if (!mapInstanceRef.current) return;

    // Remove old markers
    Object.values(markersRef.current).forEach((marker) => {
      mapInstanceRef.current!.removeLayer(marker);
    });
    markersRef.current = {};

    // Add new markers
    nearbyActivities.forEach((activity) => {
      if (!activity.latitude || !activity.longitude) return;

      const color = CATEGORY_COLORS[activity.category] || CATEGORY_COLORS.Other;
      const icon = CATEGORY_ICONS[activity.category] || CATEGORY_ICONS.Other;
      const isSelected = selectedActivity?.id === activity.id;

      const marker = L.marker([activity.latitude, activity.longitude], {
        icon: L.divIcon({
          html: createMarkerHTML(color, icon, isSelected),
          iconSize: [32, 32],
          className: `activity-marker-${activity.id}`,
        }),
      })
        .bindPopup(
          `<div style="
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
            padding: 8px;
            min-width: 200px;
          ">
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">
              ${icon} ${activity.title}
            </div>
            <div style="
              display: inline-block;
              background: ${color};
              color: white;
              padding: 3px 8px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: bold;
              margin-bottom: 6px;
            ">${activity.category}</div>
            <div style="font-size: 12px; color: #666; margin-top: 6px;">
              📅 ${(activity.date instanceof Date ? activity.date : new Date(activity.date)).toLocaleDateString()}
            </div>
            <div style="font-size: 12px; color: #666;">
              👥 ${activity.participants.length} participant${activity.participants.length !== 1 ? "s" : ""}
            </div>
          </div>`,
        )
        .on("click", () => onSelectActivity(activity))
        .addTo(mapInstanceRef.current!);

      markersRef.current[activity.id] = marker;

      // Update marker styling for selection
      if (isSelected && mapInstanceRef.current) {
        marker.openPopup();
      }
    });
  }, [nearbyActivities, selectedActivity, onSelectActivity]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      <div
        ref={mapRef}
        style={{
          flex: 1,
          width: "100%",
          height: "100%",
          zIndex: 1,
        }}
      />

      {/* Map Controls */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          zIndex: 1000,
        }}
      >
        <button
          onClick={handleZoomIn}
          style={{
            padding: "10px 13px",
            backgroundColor: "#007AFF",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "bold",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#0056b3";
            e.currentTarget.style.boxShadow = "0 4px 10px rgba(0, 0, 0, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#007AFF";
            e.currentTarget.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.2)";
          }}
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          style={{
            padding: "10px 13px",
            backgroundColor: "#007AFF",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "bold",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#0056b3";
            e.currentTarget.style.boxShadow = "0 4px 10px rgba(0, 0, 0, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#007AFF";
            e.currentTarget.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.2)";
          }}
        >
          −
        </button>
        <button
          onClick={handleCenter}
          style={{
            padding: "10px 13px",
            backgroundColor: "#007AFF",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#0056b3";
            e.currentTarget.style.boxShadow = "0 4px 10px rgba(0, 0, 0, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#007AFF";
            e.currentTarget.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.2)";
          }}
        >
          📍
        </button>
      </div>

      <style>{`
        .leaflet-container {
          background: #f0f0f0;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        }
        .leaflet-popup-tip {
          background: white;
        }
        .activity-marker-${selectedActivity?.id} {
          filter: drop-shadow(0 0 10px rgba(0, 122, 255, 0.5));
        }
        * {
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        }
      `}</style>
    </div>
  );
};
