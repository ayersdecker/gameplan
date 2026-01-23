import React, { useEffect, useRef, useState } from 'react';
import { Activity } from '../types';

interface Map3DProps {
  activities: Activity[];
  nearbyActivities: Activity[];
  userLocation: { latitude: number; longitude: number } | null;
  selectedActivity: Activity | null;
  onSelectActivity: (activity: Activity) => void;
  onViewActivity: (activity: Activity) => void;
  RADIUS_KM: number;
}

// This component is only rendered on web via next/dynamic
export const Map3D: React.FC<Map3DProps> = ({
  activities,
  nearbyActivities,
  userLocation,
  selectedActivity,
  onSelectActivity,
  onViewActivity,
  RADIUS_KM,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const terrainRef = useRef<any>(null);
  const markerGroupRef = useRef<any>(null);
  const raycasterRef = useRef<any>(null);
  const mouseRef = useRef<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!containerRef.current || isInitialized) {
      console.log('[Map3D] Skipping init', { hasContainer: !!containerRef.current, isInitialized });
      return;
    }

    console.log('[Map3D] Starting initialization check...');

    // Add a small delay to ensure container has dimensions
    const timer = setTimeout(() => {
      const width = containerRef.current?.clientWidth || 0;
      const height = containerRef.current?.clientHeight || 0;
      
      console.log('[Map3D] Container dimensions:', { width, height });

      if (width > 0 && height > 0) {
        console.log('[Map3D] Dimensions valid, attempting Three.js import...');
        
        // Dynamically import Three.js only on web
        import('three')
          .then((module) => {
            console.log('[Map3D] Three.js imported successfully:', { hasScene: !!module.Scene });
            const THREE = module;
            initializeScene(THREE, containerRef.current!);
            setIsInitialized(true);
          })
          .catch((err) => {
            console.error('[Map3D] Failed to import Three.js:', err);
          });
      } else {
        console.warn('[Map3D] Container does not have valid dimensions yet', { width, height });
        // Try again
        setTimeout(() => {
          console.log('[Map3D] Retrying after delay...');
          if (containerRef.current?.clientWidth && containerRef.current?.clientHeight) {
            import('three')
              .then((module) => {
                console.log('[Map3D] Three.js imported successfully (retry)');
                const THREE = module;
                initializeScene(THREE, containerRef.current!);
                setIsInitialized(true);
              })
              .catch((err) => console.error('[Map3D] Import failed (retry):', err));
          }
        }, 500);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isInitialized]);

  // Update markers when activities change
  useEffect(() => {
    if (!markerGroupRef.current || !userLocation || !sceneRef.current) return;

    // Clear existing markers
    markerGroupRef.current.clear();

    import('three').then((THREE) => {
      const categoryColors: { [key: string]: number } = {
        Outdoor: 0xff6b6b,
        Sports: 0xffd93d,
        Fitness: 0x6bcb77,
        Social: 0x4d96ff,
        Learning: 0x9d84b7,
        Arts: 0xf4a261,
        Other: 0x95a5a6,
      };

      // Add user location marker
      const userMarkerGeometry = new THREE.ConeGeometry(3, 10, 8);
      const userMarkerMaterial = new THREE.MeshStandardMaterial({ color: 0x007aff });
      const userMarker = new THREE.Mesh(userMarkerGeometry, userMarkerMaterial);
      userMarker.position.set(0, 0, 0);
      userMarker.castShadow = true;
      markerGroupRef.current.add(userMarker);

      // Add activity markers
      nearbyActivities.forEach((activity) => {
        if (!activity.latitude || !activity.longitude || !userLocation) return;

        // Calculate distance and position
        const R = 6371; // Earth's radius in km
        const dLat = ((activity.latitude - userLocation.latitude) * Math.PI) / 180;
        const dLon = ((activity.longitude - userLocation.longitude) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((userLocation.latitude * Math.PI) / 180) *
            Math.cos((activity.latitude * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        const normalizedDistance = Math.min(distance / RADIUS_KM, 1);
        const angle = Math.atan2(
          activity.longitude - userLocation.longitude,
          activity.latitude - userLocation.latitude
        );

        const x = normalizedDistance * RADIUS_KM * 30 * Math.cos(angle);
        const z = normalizedDistance * RADIUS_KM * 30 * Math.sin(angle);
        const y = Math.random() * 20 + 10;

        // Create marker as sphere
        const markerGeometry = new THREE.SphereGeometry(2, 32, 32);
        const color = categoryColors[activity.category] || categoryColors.Other;
        const markerMaterial = new THREE.MeshStandardMaterial({
          color,
          roughness: 0.4,
          metalness: 0.6,
        });

        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.set(x, y, z);
        marker.castShadow = true;
        marker.receiveShadow = true;
        (marker as any).activity = activity;

        // Add glow for selected activity
        if (selectedActivity?.id === activity.id) {
          const glowGeometry = new THREE.SphereGeometry(3, 32, 32);
          const glowMaterial = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.3,
          });
          const glow = new THREE.Mesh(glowGeometry, glowMaterial);
          glow.position.copy(marker.position);
          markerGroupRef.current!.add(glow);
        }

        markerGroupRef.current!.add(marker);
      });
    });
  }, [nearbyActivities, selectedActivity, userLocation, RADIUS_KM]);

  const initializeScene = (THREE: any, container: HTMLDivElement) => {
    console.log('[Map3D] initializeScene called', { 
      width: container.clientWidth, 
      height: container.clientHeight,
      hasThree: !!THREE,
    });
    
    if (!container.clientWidth || !container.clientHeight) {
      console.error('[Map3D] Container has invalid dimensions');
      return;
    }
    
    // Scene setup
    const scene = new THREE.Scene();
    console.log('[Map3D] Scene created');
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 300, 1000);

    // Camera setup
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    if (width <= 0 || height <= 0) {
      console.error('Container has invalid dimensions:', { width, height });
      return;
    }
    
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(80, 100, 80);
    camera.lookAt(0, 30, 0);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowShadowMap;
    console.log('[Map3D] Renderer created, appending to container...');
    container.appendChild(renderer.domElement);
    console.log('[Map3D] Renderer DOM element appended successfully');

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 200, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Generate low-poly terrain
    const terrainGeometry = generateLowPolyTerrain(THREE, 200, 200, 50);
    const terrainMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d8659,
      roughness: 0.8,
      metalness: 0.1,
    });
    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrain.castShadow = true;
    terrain.receiveShadow = true;
    terrain.position.y = -20;
    scene.add(terrain);

    // Marker group
    const markerGroup = new THREE.Group();
    scene.add(markerGroup);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    terrainRef.current = terrain;
    markerGroupRef.current = markerGroup;
    raycasterRef.current = new THREE.Raycaster();
    mouseRef.current = new THREE.Vector2();

    // Handle mouse click for raycasting
    const onMouseClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(markerGroup.children);

      if (intersects.length > 0) {
        const marker = intersects[0].object as any;
        if (marker.activity) {
          onSelectActivity(marker.activity);
        }
      }
    };

    renderer.domElement.addEventListener('click', onMouseClick);

    // Camera controls
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    const rotation = { x: 0, y: 0 };

    const onMouseDown = (event: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: event.clientX, y: event.clientY };
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = event.clientX - previousMousePosition.x;
      const deltaY = event.clientY - previousMousePosition.y;

      rotation.y += deltaX * 0.01;
      rotation.x += deltaY * 0.01;

      const distance = camera.position.length();
      camera.position.x = distance * Math.sin(rotation.y) * Math.cos(rotation.x);
      camera.position.y = distance * Math.sin(rotation.x) + 50;
      camera.position.z = distance * Math.cos(rotation.y) * Math.cos(rotation.x);
      camera.lookAt(0, 30, 0);

      previousMousePosition = { x: event.clientX, y: event.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const distance = camera.position.length();
      const newDistance = Math.max(50, Math.min(300, distance + event.deltaY * 0.1));
      const ratio = newDistance / distance;
      camera.position.multiplyScalar(ratio);
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();
    console.log('[Map3D] Animation loop started, rendering should begin now');

    // Handle resize
    const handleResize = () => {
      const newWidth = container.clientWidth || width;
      const newHeight = container.clientHeight || height;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      console.log('Cleaning up 3D scene');
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', onMouseClick);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      terrainGeometry.dispose();
      terrainMaterial.dispose();
    };
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#87ceeb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {!isInitialized && (
        <div
          style={{
            textAlign: 'center',
            color: '#666',
            fontSize: '16px',
            fontFamily: 'sans-serif',
          }}
        >
          <div>📍 Loading 3D Map...</div>
          <div style={{ fontSize: '12px', marginTop: '8px', color: '#999' }}>
            Container: {containerRef.current?.clientWidth || 0}x{containerRef.current?.clientHeight || 0}px
          </div>
        </div>
      )}
    </div>
  );
};

function generateLowPolyTerrain(THREE: any, width: number, height: number, scale: number): any {
  const geometry = new THREE.BufferGeometry();

  const verticesArray: number[] = [];
  const indicesArray: number[] = [];

  const cols = Math.floor(width / 20);
  const rows = Math.floor(height / 20);

  // Generate vertices
  for (let i = 0; i <= rows; i++) {
    for (let j = 0; j <= cols; j++) {
      const x = (j / cols) * width - width / 2;
      const z = (i / rows) * height - height / 2;
      const y = Math.random() * scale - scale / 2;

      verticesArray.push(x, y, z);
    }
  }

  // Generate indices
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j;
      const b = a + cols + 1;
      const c = a + 1;
      const d = b + 1;

      indicesArray.push(a, b, c);
      indicesArray.push(c, b, d);
    }
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verticesArray), 3));
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indicesArray), 1));
  geometry.computeVertexNormals();

  return geometry;
}
