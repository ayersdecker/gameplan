import React, { useEffect, useRef, useState } from "react";
import { Activity } from "../types";

interface IsometricMapProps {
  activities: Activity[];
  nearbyActivities: Activity[];
  userLocation: { latitude: number; longitude: number } | null;
  selectedActivity: Activity | null;
  onSelectActivity: (activity: Activity) => void;
  onViewActivity: (activity: Activity) => void;
  RADIUS_KM: number;
}

// Isometric city-style map for finding activities
export const Map3D: React.FC<IsometricMapProps> = ({
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
  const cityGroupRef = useRef<any>(null);
  const markerGroupRef = useRef<any>(null);
  const raycasterRef = useRef<any>(null);
  const mouseRef = useRef<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const panOffsetRef = useRef({ x: 0, z: 0 });
  const zoomRef = useRef(1);

  const selectedActivityRef = useRef<Activity | null>(null);
  const onSelectActivityRef = useRef<(activity: Activity) => void>(() => {});
  const onViewActivityRef = useRef<(activity: Activity) => void>(() => {});

  useEffect(() => {
    selectedActivityRef.current = selectedActivity;
  }, [selectedActivity]);

  useEffect(() => {
    onSelectActivityRef.current = onSelectActivity;
  }, [onSelectActivity]);

  useEffect(() => {
    onViewActivityRef.current = onViewActivity;
  }, [onViewActivity]);

  useEffect(() => {
    if (!containerRef.current || isInitialized) return;

    const timer = setTimeout(() => {
      const width = containerRef.current?.clientWidth || 0;
      const height = containerRef.current?.clientHeight || 0;

      if (width > 0 && height > 0) {
        import("three")
          .then((module) => {
            const THREE = module;
            initializeScene(THREE, containerRef.current!);
            setIsInitialized(true);
          })
          .catch((err) => {
            console.error("[IsometricMap] Failed to import Three.js:", err);
          });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isInitialized]);

  // Update city and markers
  useEffect(() => {
    if (!cityGroupRef.current || !markerGroupRef.current || !sceneRef.current)
      return;

    import("three").then((THREE) => {
      // Clear old city
      cityGroupRef.current.clear();

      // Create stylized city blocks
      createCity(THREE, cityGroupRef.current);

      // Update markers
      updateMarkers(THREE);
    });
  }, [userLocation]);

  // Update markers when activities change
  useEffect(() => {
    if (!markerGroupRef.current || !sceneRef.current) return;

    import("three").then((THREE) => {
      updateMarkers(THREE);
    });
  }, [nearbyActivities, selectedActivity]);

  const createCity = (THREE: any, cityGroup: any) => {
    // Ground plane - simple grid pattern
    const groundSize = 800;
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(groundSize, groundSize),
      new THREE.MeshStandardMaterial({
        color: 0xe8e8e8,
        roughness: 0.9,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    cityGroup.add(ground);

    // Grid lines
    const gridHelper = new THREE.GridHelper(groundSize, 80, 0xcccccc, 0xdddddd);
    gridHelper.position.y = 0.1;
    cityGroup.add(gridHelper);

    // Create city blocks (buildings, parks, roads)
    const blockSize = 40;
    const gridSize = 10;

    for (let i = -gridSize; i < gridSize; i++) {
      for (let j = -gridSize; j < gridSize; j++) {
        const x = i * blockSize;
        const z = j * blockSize;

        // Every 3rd is a road
        if (i % 3 === 0 || j % 3 === 0) {
          // Road block - darker gray
          const road = new THREE.Mesh(
            new THREE.BoxGeometry(blockSize - 2, 0.2, blockSize - 2),
            new THREE.MeshStandardMaterial({ color: 0x666666 }),
          );
          road.position.set(x, 0.1, z);
          cityGroup.add(road);
        } else {
          // Random: building or park
          const isBuilding = Math.random() > 0.3;

          if (isBuilding) {
            // Building
            const height = 10 + Math.random() * 30;
            const building = new THREE.Mesh(
              new THREE.BoxGeometry(blockSize - 4, height, blockSize - 4),
              new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(
                  0.6,
                  0.1,
                  0.7 + Math.random() * 0.2,
                ),
                roughness: 0.8,
              }),
            );
            building.position.set(x, height / 2, z);
            building.castShadow = true;
            building.receiveShadow = true;
            cityGroup.add(building);

            // Windows
            const windowsGroup = new THREE.Group();
            const windowColor = Math.random() > 0.5 ? 0xffeb3b : 0x64b5f6;
            for (let floor = 0; floor < height / 5; floor++) {
              for (let w = 0; w < 3; w++) {
                const window = new THREE.Mesh(
                  new THREE.BoxGeometry(2, 1.5, 0.2),
                  new THREE.MeshBasicMaterial({
                    color: windowColor,
                    emissive: windowColor,
                    emissiveIntensity: 0.5,
                  }),
                );
                window.position.set(
                  x + (w - 1) * 6,
                  floor * 5 + 2,
                  z + (blockSize - 4) / 2 + 0.1,
                );
                cityGroup.add(window);
              }
            }
          } else {
            // Park (green area)
            const park = new THREE.Mesh(
              new THREE.BoxGeometry(blockSize - 4, 0.5, blockSize - 4),
              new THREE.MeshStandardMaterial({ color: 0x7cb342 }),
            );
            park.position.set(x, 0.25, z);
            park.receiveShadow = true;
            cityGroup.add(park);

            // Trees
            for (let t = 0; t < 4; t++) {
              const treeX = x + (Math.random() - 0.5) * (blockSize - 10);
              const treeZ = z + (Math.random() - 0.5) * (blockSize - 10);

              const trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.5, 0.8, 4, 6),
                new THREE.MeshStandardMaterial({ color: 0x5d4037 }),
              );
              trunk.position.set(treeX, 2, treeZ);
              trunk.castShadow = true;
              cityGroup.add(trunk);

              const foliage = new THREE.Mesh(
                new THREE.ConeGeometry(3, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0x388e3c }),
              );
              foliage.position.set(treeX, 7, treeZ);
              foliage.castShadow = true;
              cityGroup.add(foliage);
            }
          }
        }
      }
    }
  };

  const updateMarkers = (THREE: any) => {
    if (!markerGroupRef.current || !userLocation) return;

    markerGroupRef.current.clear();

    const categoryColors: { [key: string]: number } = {
      Outdoor: 0xff5252,
      Sports: 0xffd740,
      Fitness: 0x69f0ae,
      Social: 0x448aff,
      Learning: 0xe040fb,
      Arts: 0xff6e40,
      Other: 0xab47bc,
    };

    // User location marker
    const userPin = createLocationPin(THREE, 0x2196f3, 25);
    userPin.position.set(panOffsetRef.current.x, 0, panOffsetRef.current.z);
    userPin.userData = { kind: "user", baseY: 0 };
    markerGroupRef.current.add(userPin);

    // Pulsing ring around user
    const ringGeo = new THREE.TorusGeometry(6, 1, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x2196f3,
      transparent: true,
      opacity: 0.5,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(panOffsetRef.current.x, 0.5, panOffsetRef.current.z);
    ring.userData = { kind: "userRing", phase: 0 };
    markerGroupRef.current.add(ring);

    // Activity markers
    nearbyActivities.forEach((activity) => {
      if (!activity.latitude || !activity.longitude || !userLocation) return;

      const latDiff = activity.latitude - userLocation.latitude;
      const lonDiff = activity.longitude - userLocation.longitude;

      // Scale: map degrees to world units (adjust for visibility)
      const scale = 3000;
      const x = lonDiff * scale + panOffsetRef.current.x;
      const z = -latDiff * scale + panOffsetRef.current.z;

      // Clamp to visible range
      const maxRange = 350;
      const distFromCenter = Math.sqrt(
        (x - panOffsetRef.current.x) ** 2 + (z - panOffsetRef.current.z) ** 2,
      );
      if (distFromCenter > maxRange) return;

      const color = categoryColors[activity.category] || categoryColors.Other;

      const activityPin = createLocationPin(THREE, color, 20);
      activityPin.position.set(x, 0, z);
      activityPin.userData = {
        kind: "activity",
        activity,
        baseY: 0,
        phase: Math.random() * Math.PI * 2,
      };
      markerGroupRef.current.add(activityPin);

      // Vertical beam
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 0.8, 60, 8),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.2,
        }),
      );
      beam.position.set(x, 30, z);
      beam.userData = {
        kind: "beam",
        baseY: 30,
        phase: activityPin.userData.phase,
      };
      markerGroupRef.current.add(beam);

      // Selection glow
      if (selectedActivity?.id === activity.id) {
        const glow = new THREE.Mesh(
          new THREE.SphereGeometry(8, 16, 16),
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.2,
          }),
        );
        glow.position.set(x, 10, z);
        glow.userData = { kind: "glow", phase: activityPin.userData.phase };
        markerGroupRef.current.add(glow);
      }
    });
  };

  const createLocationPin = (THREE: any, color: number, height: number) => {
    const group = new THREE.Group();

    // Pin shaft
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 1, height * 0.6, 8),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.3,
      }),
    );
    shaft.position.y = height * 0.3;
    shaft.castShadow = true;
    group.add(shaft);

    // Pin head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(3, 16, 16),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.4,
        metalness: 0.3,
        roughness: 0.4,
      }),
    );
    head.position.y = height;
    head.castShadow = true;
    group.add(head);

    return group;
  };

  const initializeScene = (THREE: any, container: HTMLDivElement) => {
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 400, 800);

    // Isometric camera (orthographic for true isometric view)
    const aspect = width / height;
    const frustumSize = 200;
    const camera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      1,
      1000,
    );
    camera.position.set(100, 100, 100);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 0.6);
    sunLight.position.set(100, 150, 50);
    sunLight.castShadow = true;
    sunLight.shadow.camera.left = -200;
    sunLight.shadow.camera.right = 200;
    sunLight.shadow.camera.top = 200;
    sunLight.shadow.camera.bottom = -200;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 400;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);

    const cityGroup = new THREE.Group();
    scene.add(cityGroup);

    const markerGroup = new THREE.Group();
    scene.add(markerGroup);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    cityGroupRef.current = cityGroup;
    markerGroupRef.current = markerGroup;
    raycasterRef.current = new THREE.Raycaster();
    mouseRef.current = new THREE.Vector2();

    // Mouse interactions
    let isDragging = false;
    let lastMouse = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      lastMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - lastMouse.x;
      const deltaY = e.clientY - lastMouse.y;

      // Pan camera
      const panSpeed = 0.5;
      panOffsetRef.current.x -= deltaX * panSpeed;
      panOffsetRef.current.z += deltaY * panSpeed;

      camera.position.x = 100 + panOffsetRef.current.x;
      camera.position.z = 100 + panOffsetRef.current.z;
      camera.lookAt(panOffsetRef.current.x, 0, panOffsetRef.current.z);

      lastMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomRef.current = Math.max(
        0.5,
        Math.min(2, zoomRef.current + e.deltaY * -0.001),
      );
      camera.zoom = zoomRef.current;
      camera.updateProjectionMatrix();
    };

    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(
        markerGroup.children,
        true,
      );

      if (intersects.length > 0) {
        let obj = intersects[0].object;
        while (obj.parent && !obj.userData.activity) {
          obj = obj.parent;
        }

        const activity = obj.userData?.activity;
        if (activity) {
          if (selectedActivityRef.current?.id === activity.id) {
            onViewActivityRef.current(activity);
          } else {
            onSelectActivityRef.current(activity);
          }
        }
      }
    };

    renderer.domElement.addEventListener("mousedown", onMouseDown);
    renderer.domElement.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("mouseup", onMouseUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
    renderer.domElement.addEventListener("click", onClick);

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const t = performance.now() / 1000;

      // Animate markers
      markerGroup.children.forEach((obj: any) => {
        const kind = obj?.userData?.kind;
        if (!kind) return;

        const phase = obj.userData.phase ?? 0;

        if (kind === "activity" || kind === "user") {
          obj.position.y = Math.sin(t * 1.5 + phase) * 1.2;
        } else if (kind === "beam") {
          obj.material.opacity = 0.15 + Math.sin(t * 2 + phase) * 0.08;
        } else if (kind === "glow") {
          obj.scale.setScalar(1 + Math.sin(t * 2.5 + phase) * 0.15);
        } else if (kind === "userRing") {
          obj.scale.setScalar(1 + Math.sin(t * 1.8) * 0.1);
          obj.material.opacity = 0.4 + Math.sin(t * 1.8) * 0.15;
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      const aspect = w / h;

      camera.left = (frustumSize * aspect) / -2;
      camera.right = (frustumSize * aspect) / 2;
      camera.top = frustumSize / 2;
      camera.bottom = frustumSize / -2;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      renderer.domElement.removeEventListener("mousemove", onMouseMove);
      renderer.domElement.removeEventListener("mouseup", onMouseUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("click", onClick);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#87ceeb",
        cursor: isInitialized ? "grab" : "default",
      }}
    >
      {!isInitialized && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            color: "#666",
            fontFamily: "Inter, sans-serif",
          }}
        >
          <div style={{ fontSize: "16px" }}>🏙️ Building city map...</div>
        </div>
      )}
    </div>
  );
};
