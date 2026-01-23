import React, { useState, useRef, useEffect } from 'react';
import { Activity } from '../types';

interface InteractiveMapProps {
  activities: Activity[];
  nearbyActivities: Activity[];
  userLocation: { latitude: number; longitude: number } | null;
  selectedActivity: Activity | null;
  onSelectActivity: (activity: Activity) => void;
  RADIUS_KM: number;
}

const CATEGORY_COLORS: { [key: string]: string } = {
  Outdoor: '#FF4040',      // Vibrant red
  Sports: '#FFD700',       // Golden yellow
  Fitness: '#00E676',      // Neon green
  Social: '#00E5FF',       // Cyan
  Learning: '#D946EF',     // Vibrant purple
  Arts: '#FF6B35',         // Vibrant orange
  Other: '#7C3AED',        // Purple
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

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  activities,
  nearbyActivities,
  userLocation,
  selectedActivity,
  onSelectActivity,
  RADIUS_KM,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Draw the map
  useEffect(() => {
    if (!canvasRef.current || !userLocation) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const time = Date.now() / 1000; // For animations

    // Draw white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Draw terrain/grass areas (parks)
    ctx.fillStyle = '#E8F5E9';
    const grassAreas = [
      { x: 150, y: 100, w: 200, h: 180 },
      { x: 500, y: 300, w: 250, h: 200 },
      { x: 50, y: 400, w: 180, h: 150 },
    ];
    grassAreas.forEach((area) => {
      ctx.fillRect(area.x + pan.x, area.y + pan.y, area.w * zoom, area.h * zoom);
    });

    // Draw roads
    ctx.strokeStyle = '#D0D0D0';
    ctx.lineWidth = 3 * zoom;
    const roads = [
      { x1: 0, y1: 200, x2: 800, y2: 200 }, // Horizontal
      { x1: 400, y1: 0, x2: 400, y2: 600 }, // Vertical
      { x1: 0, y1: 450, x2: 800, y2: 450 }, // Horizontal
      { x1: 250, y1: 0, x2: 250, y2: 600 }, // Vertical
    ];
    roads.forEach((road) => {
      ctx.beginPath();
      ctx.moveTo(road.x1 + pan.x, road.y1 + pan.y);
      ctx.lineTo(road.x2 + pan.x, road.y2 + pan.y);
      ctx.stroke();
    });

    // Draw buildings
    ctx.fillStyle = '#BDBDBD';
    ctx.strokeStyle = '#808080';
    ctx.lineWidth = 1;
    const buildings = [
      { x: 100, y: 80, w: 80, h: 70 },
      { x: 520, y: 120, w: 100, h: 85 },
      { x: 700, y: 250, w: 70, h: 75 },
      { x: 30, y: 300, w: 90, h: 80 },
      { x: 600, y: 380, w: 110, h: 95 },
    ];
    buildings.forEach((building) => {
      const x = building.x + pan.x;
      const y = building.y + pan.y;
      const w = building.w * zoom;
      const h = building.h * zoom;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);

      // Windows
      ctx.fillStyle = '#FFE082';
      const windowSize = 8 * zoom;
      const windowGap = 12 * zoom;
      for (let wx = x + 10 * zoom; wx < x + w - 10 * zoom; wx += windowGap) {
        for (let wy = y + 10 * zoom; wy < y + h - 10 * zoom; wy += windowGap) {
          ctx.fillRect(wx, wy, windowSize, windowSize);
        }
      }
    });

    // Draw animated grid background (subtle)
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.15)';
    ctx.lineWidth = 1;
    const gridSize = 50 * zoom;
    for (let x = pan.x % gridSize; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = pan.y % gridSize; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Helper to convert lat/lon to canvas coordinates
    const latLonToCanvas = (lat: number, lon: number) => {
      const dLat = lat - userLocation.latitude;
      const dLon = lon - userLocation.longitude;
      const x = width / 2 + (dLon * 111.32) * Math.cos((userLocation.latitude * Math.PI) / 180) * zoom * 50 + pan.x;
      const y = height / 2 + dLat * 110.57 * zoom * 50 + pan.y;
      return { x, y };
    };

    // Draw user location with pulsing animation
    const userPos = latLonToCanvas(userLocation.latitude, userLocation.longitude);
    const pulseSize = 3 + Math.sin(time * 2) * 2;

    // Outer pulsing ring
    ctx.strokeStyle = `rgba(0, 122, 255, ${0.5 + Math.sin(time * 2) * 0.3})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(userPos.x, userPos.y, 12 + pulseSize * 2, 0, Math.PI * 2);
    ctx.stroke();

    // Inner glow
    ctx.fillStyle = 'rgba(0, 122, 255, 0.15)';
    ctx.beginPath();
    ctx.arc(userPos.x, userPos.y, 10, 0, Math.PI * 2);
    ctx.fill();

    // Center circle
    ctx.fillStyle = '#007AFF';
    ctx.beginPath();
    ctx.arc(userPos.x, userPos.y, 6, 0, Math.PI * 2);
    ctx.fill();

    // Draw compass (top indicator)
    ctx.fillStyle = '#FF4040';
    ctx.beginPath();
    ctx.moveTo(userPos.x, userPos.y - 15);
    ctx.lineTo(userPos.x - 3, userPos.y - 8);
    ctx.lineTo(userPos.x + 3, userPos.y - 8);
    ctx.fill();

    // Draw radius circle with glow effect
    ctx.shadowColor = 'rgba(0, 122, 255, 0.3)';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = 'rgba(0, 122, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(userPos.x, userPos.y, RADIUS_KM * zoom * 50 / 111.32, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowColor = 'transparent';

    // Draw nearby activities
    nearbyActivities.forEach((activity, index) => {
      if (!activity.latitude || !activity.longitude) return;

      const pos = latLonToCanvas(activity.latitude, activity.longitude);
      const color = CATEGORY_COLORS[activity.category] || CATEGORY_COLORS.Other;
      const isSelected = selectedActivity?.id === activity.id;

      // Spawn animation (staggered)
      const spawnTime = time + index * 0.1;
      const scale = Math.max(0.3, Math.min(1, Math.sin(spawnTime * 2) * 0.5 + 0.5));

      // Outer glow for all markers
      const glowSize = isSelected ? 18 : 12;
      const glowAlpha = isSelected ? 0.4 : 0.2;
      ctx.fillStyle = `rgba(${hexToRgb(color).join(',')}, ${glowAlpha * scale})`;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, glowSize, 0, Math.PI * 2);
      ctx.fill();

      // Activity marker
      ctx.fillStyle = color;
      ctx.beginPath();
      const markerSize = isSelected ? 10 : 6;
      ctx.arc(pos.x, pos.y, markerSize, 0, Math.PI * 2);
      ctx.fill();

      // Selected indicator - border and outer ring
      if (isSelected) {
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, markerSize + 3, 0, Math.PI * 2);
        ctx.stroke();

        // Outer pulsing ring for selected
        ctx.strokeStyle = `rgba(51, 51, 51, ${0.5 + Math.sin(time * 3) * 0.3})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, markerSize + 6 + Math.sin(time * 3) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    // Draw legend with white background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = 'rgba(0, 122, 255, 0.3)';
    ctx.lineWidth = 2;
    
    const legendRadius = 8;
    const legendX = 15;
    const legendY = 15;
    const legendWidth = 180;
    const legendHeight = 140;

    // Rounded rectangle for legend
    roundRect(ctx, legendX, legendY, legendWidth, legendHeight, legendRadius);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#007AFF';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('⚡ NEARBY ACTIVITIES', legendX + 10, legendY + 20);

    ctx.fillStyle = '#333';
    ctx.font = '11px sans-serif';
    const legendItems = [
      { label: 'Outdoor', color: CATEGORY_COLORS.Outdoor },
      { label: 'Sports', color: CATEGORY_COLORS.Sports },
      { label: 'Fitness', color: CATEGORY_COLORS.Fitness },
      { label: 'Social', color: CATEGORY_COLORS.Social },
    ];

    legendItems.forEach((item, i) => {
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(legendX + 15, legendY + 45 + i * 20, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#333';
      ctx.font = '11px sans-serif';
      ctx.fillText(item.label, legendX + 28, legendY + 49 + i * 20);
    });

    // Stats box (top right)
    const statsX = width - 155;
    const statsY = 15;
    const statsWidth = 140;
    const statsHeight = 100;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
    ctx.lineWidth = 2;
    roundRect(ctx, statsX, statsY, statsWidth, statsHeight, legendRadius);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FF9800';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('📊 STATS', statsX + 10, statsY + 18);

    ctx.fillStyle = '#333';
    ctx.font = '10px sans-serif';
    ctx.fillText(`Visible: ${nearbyActivities.length}`, statsX + 10, statsY + 35);
    ctx.fillText(`Zoom: ${zoom.toFixed(1)}x`, statsX + 10, statsY + 50);
    ctx.fillText(`Radius: ${RADIUS_KM}km`, statsX + 10, statsY + 65);
    ctx.fillText(`Search Area`, statsX + 10, statsY + 80);
  }, [nearbyActivities, selectedActivity, userLocation, zoom, pan, RADIUS_KM]);

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.max(0.5, Math.min(5, prev * delta)));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!userLocation) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const latLonToCanvas = (lat: number, lon: number) => {
      const width = canvas.width;
      const height = canvas.height;
      const dLat = lat - userLocation.latitude;
      const dLon = lon - userLocation.longitude;
      const x = width / 2 + (dLon * 111.32) * Math.cos((userLocation.latitude * Math.PI) / 180) * zoom * 50 + pan.x;
      const y = height / 2 + dLat * 110.57 * zoom * 50 + pan.y;
      return { x, y };
    };

    // Check if clicked on any activity
    for (const activity of nearbyActivities) {
      if (!activity.latitude || !activity.longitude) continue;

      const pos = latLonToCanvas(activity.latitude, activity.longitude);
      const distance = Math.sqrt((clickX - pos.x) ** 2 + (clickY - pos.y) ** 2);

      if (distance < 15) {
        onSelectActivity(activity);
        return;
      }
    }

    onSelectActivity(null);
  };

  const handleCenter = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(5, prev * 1.3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(0.5, prev / 1.3));
  };

  // Utility function: hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [255, 255, 255];
  };

  // Utility function: draw rounded rectangle
  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        backgroundColor: '#FFFFFF',
      }}
    >
      {/* Map Canvas */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#FFFFFF' }}>
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleCanvasClick}
        />

        {/* Map Controls */}
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            zIndex: 10,
          }}
        >
          <button
            onClick={handleZoomIn}
            style={{
              padding: '12px 14px',
              backgroundColor: '#007AFF',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: 'bold',
              boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3), 0 0 20px rgba(0, 122, 255, 0.15)',
              transition: 'all 0.2s',
              color: '#fff',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 122, 255, 0.5), 0 0 30px rgba(0, 122, 255, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 122, 255, 0.3), 0 0 20px rgba(0, 122, 255, 0.15)';
            }}
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            style={{
              padding: '12px 14px',
              backgroundColor: '#007AFF',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: 'bold',
              boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3), 0 0 20px rgba(0, 122, 255, 0.15)',
              transition: 'all 0.2s',
              color: '#fff',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 122, 255, 0.5), 0 0 30px rgba(0, 122, 255, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 122, 255, 0.3), 0 0 20px rgba(0, 122, 255, 0.15)';
            }}
          >
            −
          </button>
          <button
            onClick={handleCenter}
            style={{
              padding: '12px 14px',
              backgroundColor: '#007AFF',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '16px',
              boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3), 0 0 20px rgba(0, 122, 255, 0.15)',
              transition: 'all 0.2s',
              color: '#fff',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 122, 255, 0.5), 0 0 30px rgba(0, 122, 255, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 122, 255, 0.3), 0 0 20px rgba(0, 122, 255, 0.15)';
            }}
          >
            📍
          </button>
        </div>
      </div>

      {/* Info Card */}
      {selectedActivity && (
        <div
          style={{
            padding: '16px',
            background: '#FFFFFF',
            borderTop: '2px solid #007AFF',
            boxShadow: '0 -4px 16px rgba(0, 122, 255, 0.2)',
            animation: 'slideUp 0.3s ease-out',
          }}
        >
          <style>{`
            @keyframes slideUp {
              from {
                transform: translateY(100%);
                opacity: 0;
              }
              to {
                transform: translateY(0);
                opacity: 1;
              }
            }
          `}</style>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#007AFF', marginBottom: '4px' }}>
                {CATEGORY_ICONS[selectedActivity.category] || '🎯'} {selectedActivity.title}
              </div>
              <div
                style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  backgroundColor: CATEGORY_COLORS[selectedActivity.category] || CATEGORY_COLORS.Other,
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  marginRight: '8px',
                }}
              >
                {selectedActivity.category}
              </div>
              <div
                style={{
                  display: 'inline-block',
                  padding: '4px 8px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(0, 122, 255, 0.15)',
                  color: '#007AFF',
                  fontSize: '11px',
                  fontWeight: 'bold',
                }}
              >
                👥 {selectedActivity.participants.length}
              </div>
            </div>
            <button
              onClick={() => onSelectActivity(null)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#007AFF',
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.6' }}>
            <div>📅 {(selectedActivity.date instanceof Date ? selectedActivity.date : new Date(selectedActivity.date)).toLocaleDateString()}</div>
            <div>⏰ {(selectedActivity.date instanceof Date ? selectedActivity.date : new Date(selectedActivity.date)).toLocaleTimeString()}</div>
          </div>
        </div>
      )}

      <style>{`
        * {
          box-sizing: border-box;
        }
      `}</style>
    </div>
  );
};
