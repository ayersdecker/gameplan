# Interactive Map Component

## Overview
The `InteractiveMap` component provides an interactive canvas-based map visualization for web. It displays user location, nearby activities, and includes standard map controls.

## Features

### Map Display
- **Sky blue background** with grid overlay for scale reference
- **User location**: Blue circle at map center
- **Activity markers**: Color-coded circles based on activity category
- **Radius visualization**: Circle showing the 50km activity search radius
- **Legend**: Display of activity categories with color coding

### Category Colors
- **Outdoor** (#FF6B6B - Red)
- **Sports** (#FFD93D - Yellow)  
- **Fitness** (#6BCB77 - Green)
- **Social** (#4D96FF - Blue)
- **Learning** (#9D84B7 - Purple)
- **Arts** (#F4A261 - Orange)
- **Other** (#95A5A6 - Gray)

### Controls

#### Zoom Controls
- **+ Button**: Zoom in (max 5x)
- **- Button**: Zoom out (min 0.5x)
- **Mouse Scroll**: Scroll wheel to zoom dynamically

#### Navigation
- **Drag**: Click and drag to pan the map around
- **Center Button**: Re-center map on user location and reset zoom to 1x

#### Interaction
- **Click on markers**: Select an activity to see its details
- **Visual feedback**: Selected markers have black border and are 10px radius (vs 6px normally)
- **Info panel**: Shows activity details at bottom when selected

### Coordinate System
Uses proper geographic projection:
- Converts lat/lon to canvas pixels using Mercator-like projection
- Accounts for latitude when calculating longitude distances
- Uses Haversine-based distances (111.32km per degree longitude, 110.57km per degree latitude)

## Component Props

```tsx
interface InteractiveMapProps {
  activities: Activity[];           // All activities
  nearbyActivities: Activity[];     // Filtered activities within RADIUS_KM
  userLocation: {                   // User's current location
    latitude: number;
    longitude: number;
  } | null;
  selectedActivity: Activity | null;         // Currently selected activity
  onSelectActivity: (activity: Activity) => void;  // Callback when activity clicked
  RADIUS_KM: number;               // Search radius in kilometers
}
```

## Usage Example

```tsx
import { InteractiveMap } from './src/components/InteractiveMap';

<InteractiveMap
  activities={activities}
  nearbyActivities={nearbyActivities}
  userLocation={userLocation}
  selectedActivity={selectedActivity}
  onSelectActivity={setSelectedActivity}
  RADIUS_KM={50}
/>
```

## Technical Details

### Canvas Rendering
- Uses HTML5 Canvas API for efficient rendering
- Redraws on state changes (activities, zoom, pan, selection)
- Responsive to container dimensions

### Performance
- Single canvas for all rendering (no multiple DOM elements for markers)
- Efficient click detection via distance calculation
- Only re-renders when necessary

### Styling
- Flexbox container with responsive sizing
- Touch-friendly button sizes (8-12px padding)
- Subtle shadows on control buttons for depth

## Future Enhancements
- [ ] Export as image
- [ ] Search/filter by activity type
- [ ] Draw custom routes
- [ ] Real-time activity tracking
- [ ] Heatmap overlay for activity density
- [ ] Multi-layer toggle (satellite, terrain)
