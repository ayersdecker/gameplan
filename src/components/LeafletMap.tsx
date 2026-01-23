import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Activity } from '../types';

interface LeafletMapProps {
  activities: Activity[];
  nearbyActivities: Activity[];
  userLocation: { latitude: number; longitude: number } | null;
  selectedActivity: Activity | null;
  onSelectActivity: (activity: Activity) => void;
  RADIUS_KM: number;
}

const CATEGORY_COLORS: { [key: string]: string } = {
  Outdoor: '#FF4040',
  Sports: '#FFD700',
  Fitness: '#00E676',
  Social: '#00E5FF',
  Learning: '#D946EF',
  Arts: '#FF6B35',
  Other: '#7C3AED',
};

const CATEGORY_ICONS: { [key: string]: string } = {
  Outdoor: '🏕️',
  Sports: '⚽',
  Fitness: '💪',
  Social: '🎉',
  Learning: '📚',
  Arts: '🎨',
  Other: '🎯',
};

// Custom marker HTML
const createMarkerHTML = (color: string, icon: string, isSelected: boolean) => {
  const scale = isSelected ? 1.3 : 1;
  const shadow = isSelected ? '0 0 15px rgba(0, 122, 255, 0.6)' : '0 2px 6px rgba(0, 0, 0, 0.2)';
  return `
    <div style="
      width: ${32 * scale}px;
      height: ${32 * scale}px;
      background: ${color};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${16 * scale}px;
      box-shadow: ${shadow};
      border: ${isSelected ? '3px solid #007AFF' : 'none'};
      cursor: pointer;
      transition: all 0.3s ease;
    ">
      ${icon}
    </div>
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
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const userMarkerRef = useRef<L.Marker | null>(null);
  const radiusCircleRef = useRef<L.Circle | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const handleCenter = () => {
    if (mapInstanceRef.current && userLocation) {
      mapInstanceRef.current.setView([userLocation.latitude, userLocation.longitude], 15, {
        animate: true,
        duration: 0.5,
      });
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
    if (!mapRef.current || !userLocation) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current).setView(
        [userLocation.latitude, userLocation.longitude],
        15
      );

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
        attribution: '© CartoDB, © OpenStreetMap contributors',
        maxZoom: 19,
        minZoom: 2,
      }).addTo(map);

      mapInstanceRef.current = map;
      setMapReady(true);
    } else {
      mapInstanceRef.current.setView([userLocation.latitude, userLocation.longitude], 15);
    }
  }, [userLocation?.latitude, userLocation?.longitude]);

  // Update user location marker
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation) return;

    // Remove old user marker
    if (userMarkerRef.current) {
      mapInstanceRef.current.removeLayer(userMarkerRef.current);
    }

    // Add new user marker with custom styling
    const userMarker = L.marker([userLocation.latitude, userLocation.longitude], {
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
        className: 'user-marker',
      }),
    }).addTo(mapInstanceRef.current);

    userMarkerRef.current = userMarker;
  }, [userLocation]);

  // Update radius circle
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation) return;

    if (radiusCircleRef.current) {
      mapInstanceRef.current.removeLayer(radiusCircleRef.current);
    }

    const circle = L.circle([userLocation.latitude, userLocation.longitude], {
      radius: RADIUS_KM * 1000, // Convert km to meters
      fillColor: '#007AFF',
      fillOpacity: 0.1,
      color: '#007AFF',
      weight: 2,
      dashArray: '5, 5',
    }).addTo(mapInstanceRef.current);

    radiusCircleRef.current = circle;
  }, [userLocation, RADIUS_KM]);

  // Update activity markers
  useEffect(() => {
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
            font-family: Roboto, sans-serif;
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
              👥 ${activity.participants.length} participant${activity.participants.length !== 1 ? 's' : ''}
            </div>
          </div>`
        )
        .on('click', () => onSelectActivity(activity))
        .addTo(mapInstanceRef.current);

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
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <div
        ref={mapRef}
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          zIndex: 1,
        }}
      />

      {/* Map Controls */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 1000,
        }}
      >
        <button
          onClick={handleZoomIn}
          style={{
            padding: '10px 13px',
            backgroundColor: '#007AFF',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#0056b3';
            e.currentTarget.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#007AFF';
            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.2)';
          }}
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          style={{
            padding: '10px 13px',
            backgroundColor: '#007AFF',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#0056b3';
            e.currentTarget.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#007AFF';
            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.2)';
          }}
        >
          −
        </button>
        <button
          onClick={handleCenter}
          style={{
            padding: '10px 13px',
            backgroundColor: '#007AFF',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#0056b3';
            e.currentTarget.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#007AFF';
            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.2)';
          }}
        >
          📍
        </button>
      </div>

      <style>{`
        .leaflet-container {
          background: #f0f0f0;
          font-family: Roboto, sans-serif;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          font-family: Roboto, sans-serif;
        }
        .leaflet-popup-tip {
          background: white;
        }
        .activity-marker-${selectedActivity?.id} {
          filter: drop-shadow(0 0 10px rgba(0, 122, 255, 0.5));
        }
        * {
          font-family: Roboto, sans-serif;
        }
      `}</style>
    </div>
  );
};
