# Pokemon Go Design System

## Color Palette

### Primary Colors
- **Cyan (#00E5FF)**: Primary accent, UI elements, glows
- **Gold (#FFD700)**: Secondary accent, buttons, highlights, stats
- **Red (#FF4040)**: Activity markers, compass indicators
- **Dark Blue (#1A1A2E)**: Card backgrounds, headers
- **Darker Blue (#16213E)**: Secondary backgrounds
- **Darkest Blue (#0F3460)**: Main background

### Category Colors (Vibrant)
- **Outdoor**: #FF4040 (Vibrant Red)
- **Sports**: #FFD700 (Golden Yellow)
- **Fitness**: #00E676 (Neon Green)
- **Social**: #00E5FF (Cyan)
- **Learning**: #D946EF (Vibrant Purple)
- **Arts**: #FF6B35 (Vibrant Orange)

## Typography

- **Titles**: Bold, 24px, Cyan (#00E5FF)
- **Subtitles**: Regular, 12px, Light Cyan (#B0E0E6)
- **Body**: Regular, 13px, Light Cyan (#B0E0E6)
- **Labels**: Bold, 11-13px, varies by context

## Visual Effects

### Shadows & Glows
- **Cyan Glow**: Used on primary elements
  - Box Shadow: `0 0 20px rgba(0, 229, 255, 0.2)`
  - Drop Shadow: `0 4px 12px rgba(0, 229, 255, 0.4)`

- **Gold Glow**: Used on interactive elements
  - Box Shadow: `0 0 20px rgba(255, 215, 0, 0.2)`
  - Drop Shadow: `0 4px 12px rgba(255, 215, 0, 0.4)`

### Animations
- **Pulsing**: Sine wave oscillation (frequency 2 cycles/sec)
- **Spawning**: Gradual scale-in effect on marker appearance
- **Hover**: Scale 1.1x with increased glow on button interaction
- **Slide**: Bottom-to-top slide-in (0.3s ease-out) for cards

## Components

### Buttons

#### Primary Button (Gold)
- Background: #FFD700
- Color: #000 (black text)
- Padding: 12px 14px
- Border Radius: 50% (circular) or 8px (rounded)
- Glow: Gold shadow effect
- Hover: scale(1.1), enhanced glow

#### Secondary Button (Cyan)
- Background: #00E5FF
- Color: #000 (black text)
- Padding: 12px 14px
- Border Radius: 50% (circular)
- Glow: Cyan shadow effect

#### Tertiary Button (Ghost)
- Background: rgba(255, 215, 0, 0.2)
- Border: 1px solid #FFD700
- Color: #FFD700
- Padding: 10px 16px

### Cards

#### Info Card
- Background: Linear gradient (1A1A2E → 16213E)
- Border: 2px solid #00E5FF
- Border Radius: 16px
- Padding: 16px
- Shadow: Cyan glow (0 -4px 16px rgba(0, 229, 255, 0.3))
- Animation: Slide in from bottom

#### Legend Card
- Background: rgba(26, 26, 46, 0.95)
- Border: 2px solid rgba(0, 229, 255, 0.3)
- Border Radius: 10px
- Padding: 10px
- Title: Bold 13px Cyan
- Items: 11px Light Cyan

### Map Elements

#### Marker Styling
- **Idle**: 6px radius, colored circle with 12px glow aura
- **Spawn Animation**: Gradual scale-in (0-100% over 2 seconds)
- **Hovered**: 10px radius, white border, pulsing outer ring
- **Glow Layers**: 
  1. Outer white aura (30-60% opacity)
  2. Colored glow aura (40% opacity)
  3. Core colored circle (fully opaque)

#### User Location
- **Center Marker**: 6px cyan circle
- **Glow Ring**: 10px radius glow (20% opacity)
- **Pulse Ring**: 12+ radius outer ring (animated opacity)
- **Compass**: Red triangle pointing north

#### Radius Circle
- Stroke: 2px, cyan with 15% opacity
- Shadow: Cyan glow (10px blur)
- Represents: 50km search boundary

### Background

#### Map Canvas
- **Gradient**: Linear gradient (0F3460 → 16213E)
- **Grid**: Cyan lines (5% opacity) at 50px intervals (scaled by zoom)
- **Effect**: Subtle tech-grid overlay

## Spacing

- **Buttons**: 12px gap between controls
- **Card Padding**: 16px
- **Element Margins**: 4-8px
- **Tab Bar Height**: 70px

## Border Radius

- **Cards**: 16px
- **Buttons**: 8px (rounded) or 50% (circular)
- **Legend**: 10px
- **Subtle**: 4px

## Responsive Design

- **Mobile**: Full-width cards, centered buttons
- **Web Canvas**: 800x600px base, scales with container
- **Controls**: Fixed position, always visible
- **Info Panel**: Bottom-docked with safe area adjustment

## Pokemon Go References

1. **Dark Theme**: Night-mode UI with neon accents (cyan/gold)
2. **Glowing Effects**: Neon-like glows on markers and buttons
3. **Pulsing Animation**: Breathing effect on player location
4. **Spawning Animation**: Creatures appear with scale animation
5. **Category Icons**: Emoji indicators for activity types
6. **Stats Panel**: Real-time metrics display (visible: count, zoom level, radius)
7. **Compass**: Red north indicator on map
8. **AR Feel**: Dark background with glowing elements creates immersive feel

## Accessibility

- **Color Contrast**: All text maintains 4.5:1+ contrast ratio
- **Focus States**: Buttons scale up on hover for feedback
- **Text Sizing**: Minimum 11px for readability
- **Icons**: Combined with text labels for clarity

## Implementation Notes

- Use CSS animations for web (slide-in, pulse effects)
- Use React Native `Animated` API for mobile
- Consider performance with canvas rendering on large datasets
- Maintain 60fps animations with requestAnimationFrame
