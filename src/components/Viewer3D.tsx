import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useRoute } from '@/contexts/RouteContext';

const SCALE = 3;
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
const MAPBOX_STYLE = 'mapbox/satellite-v9';

function toPoint3D(lat: number, lng: number, altitude: number, centerLat: number, centerLng: number) {
  const x = (lng - centerLng) * 111320 * Math.cos(centerLat * Math.PI / 180) / 10 * SCALE;
  const z = -(lat - centerLat) * 110540 / 10 * SCALE;
  const y = altitude / 10 * SCALE;
  return new THREE.Vector3(x, y, z);
}

function waypointsTo3D(waypoints: { lat: number; lng: number; altitude: number }[]) {
  if (waypoints.length === 0) return [];
  const center = waypoints[0];
  return waypoints.map(wp => {
    return toPoint3D(wp.lat, wp.lng, wp.altitude, center.lat, center.lng);
  });
}

function generateBezierPoints(waypoints: { lat: number; lng: number }[]): [number, number][] {
  if (waypoints.length < 2) return waypoints.map(w => [w.lat, w.lng]);
  const points: [number, number][] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const p0 = waypoints[Math.max(0, i - 1)];
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    const p3 = waypoints[Math.min(waypoints.length - 1, i + 2)];
    for (let t = 0; t <= 1; t += 0.05) {
      const t2 = t * t;
      const t3 = t2 * t;
      const lat = 0.5 * (
        (2 * p1.lat) +
        (-p0.lat + p2.lat) * t +
        (2 * p0.lat - 5 * p1.lat + 4 * p2.lat - p3.lat) * t2 +
        (-p0.lat + 3 * p1.lat - 3 * p2.lat + p3.lat) * t3
      );
      const lng = 0.5 * (
        (2 * p1.lng) +
        (-p0.lng + p2.lng) * t +
        (2 * p0.lng - 5 * p1.lng + 4 * p2.lng - p3.lng) * t2 +
        (-p0.lng + 3 * p1.lng - 3 * p2.lng + p3.lng) * t3
      );
      points.push([lat, lng]);
    }
  }
  return points;
}

function interpolateAltitude(waypoints: { altitude: number }[], t: number) {
  if (waypoints.length === 0) return 0;
  if (waypoints.length === 1) return waypoints[0].altitude;
  const rawIndex = t * (waypoints.length - 1);
  const idx = Math.min(Math.floor(rawIndex), waypoints.length - 1);
  const nextIdx = Math.min(idx + 1, waypoints.length - 1);
  const localT = rawIndex - idx;
  const a1 = waypoints[idx].altitude;
  const a2 = waypoints[nextIdx].altitude;
  return a1 + (a2 - a1) * localT;
}

function createCatmullRomCurve(points: THREE.Vector3[]) {
  if (points.length < 2) return null;
  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
}

function centerXZ(points: THREE.Vector3[]) {
  if (points.length === 0) return new THREE.Vector3(0, 0, 0);
  let minX = points[0].x;
  let maxX = points[0].x;
  let minZ = points[0].z;
  let maxZ = points[0].z;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }
  return new THREE.Vector3((minX + maxX) / 2, 0, (minZ + maxZ) / 2);
}

function centerLatLng(waypoints: { lat: number; lng: number }[]) {
  if (waypoints.length === 0) return { lat: 0, lng: 0 };
  let minLat = waypoints[0].lat;
  let maxLat = waypoints[0].lat;
  let minLng = waypoints[0].lng;
  let maxLng = waypoints[0].lng;
  for (const p of waypoints) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  return { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
}

function latLngToTile(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const xtile = Math.floor((lng + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const ytile = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x: xtile, y: ytile };
}

function mapSizeForLat(lat: number, zoom: number) {
  const metersPerPixel = 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, zoom);
  const widthMeters = metersPerPixel * 256 * 3;
  return widthMeters / 10 * SCALE;
}

function tileUrl(x: number, y: number, z: number) {
  if (!MAPBOX_TOKEN) return null;
  return `https://api.mapbox.com/styles/v1/${MAPBOX_STYLE}/tiles/256/${z}/${x}/${y}?access_token=${MAPBOX_TOKEN}`;
}

function GroundMap({
  lat,
  lng,
  position,
  onReady,
}: {
  lat: number;
  lng: number;
  position: THREE.Vector3;
  onReady: (ready: boolean) => void;
}) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const zoom = 16;
  const size = mapSizeForLat(lat, zoom);
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size, size, 128, 128);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const h = (Math.sin(x * 0.03) + Math.cos(y * 0.03)) * 0.6 + Math.sin((x + y) * 0.02) * 0.4;
      pos.setZ(i, h);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [size]);

  useEffect(() => {
    let active = true;
    const { x, y } = latLngToTile(lat, lng, zoom);
    const tiles: Array<[number, number]> = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        tiles.push([x + dx, y + dy]);
      }
    }

    if (!MAPBOX_TOKEN) {
      setTexture(null);
      onReady(false);
      return () => {
        active = false;
      };
    }

    const canvas = document.createElement('canvas');
    const tileSize = 256;
    canvas.width = tileSize * 3;
    canvas.height = tileSize * 3;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    Promise.all(tiles.map(([tx, ty]) => {
      return new Promise<{ img: HTMLImageElement; dx: number; dy: number }>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve({ img, dx: tx - x + 1, dy: ty - y + 1 });
        img.onerror = () => resolve({ img, dx: tx - x + 1, dy: ty - y + 1 });
        const url = tileUrl(tx, ty, zoom);
        if (!url) {
          resolve({ img, dx: tx - x + 1, dy: ty - y + 1 });
          return;
        }
        img.src = url;
      });
    })).then((images) => {
      if (!active) return;
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      images.forEach(({ img, dx, dy }) => {
        ctx.drawImage(img, dx * tileSize, dy * tileSize, tileSize, tileSize);
      });
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      setTexture(tex);
      onReady(true);
    });

    return () => {
      active = false;
    };
  }, [lat, lng, zoom, onReady]);

  if (!texture) return null;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[position.x, -0.04, position.z]}>
      <primitive object={geometry} />
      <meshStandardMaterial map={texture} roughness={1} metalness={0} />
    </mesh>
  );
}

function RouteTube({ curve }: { curve: THREE.CatmullRomCurve3 }) {
  const geometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 128, 0.3, 8, false);
  }, [curve]);

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color="#3b82f6" transparent opacity={0.9} />
    </mesh>
  );
}

function WaypointSpheres({ points }: { points: THREE.Vector3[] }) {
  return (
    <>
      {points.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshStandardMaterial color="#e2e8f0" emissive="#94a3b8" emissiveIntensity={0.6} />
        </mesh>
      ))}
    </>
  );
}

function DroneSimulation({ points }: { points: THREE.Vector3[] }) {
  const { simulationState, simulationSpeed, simulationProgress, setSimulationProgress, stopSimulation } = useRoute();
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (simulationState !== 'playing' || !meshRef.current) return;
    const newProgress = simulationProgress + delta * simulationSpeed * 0.05;
    if (newProgress >= 1) {
      stopSimulation();
      return;
    }
    setSimulationProgress(newProgress);
    if (points.length < 2) return;
    const rawIndex = newProgress * (points.length - 1);
    const idx = Math.min(Math.floor(rawIndex), points.length - 1);
    const nextIdx = Math.min(idx + 1, points.length - 1);
    const t = rawIndex - idx;
    meshRef.current.position.lerpVectors(points[idx], points[nextIdx], t);
  });

  if (simulationState === 'idle' || points.length < 2) return null;
  const rawIndex = Math.min(simulationProgress, 1) * (points.length - 1);
  const idx = Math.min(Math.floor(rawIndex), points.length - 1);
  const nextIdx = Math.min(idx + 1, points.length - 1);
  const t = rawIndex - idx;
  const pos = new THREE.Vector3().lerpVectors(points[idx], points[nextIdx], t);

  return (
    <mesh ref={meshRef} position={pos}>
      <sphereGeometry args={[0.4, 16, 16]} />
      <meshStandardMaterial color="#facc15" emissive="#f59e0b" emissiveIntensity={1} />
    </mesh>
  );
}

function Scene() {
  const { waypoints, lastPattern } = useRoute();
  const points = useMemo(() => waypointsTo3D(waypoints), [waypoints]);
  const [mapReady, setMapReady] = useState(false);
  const curveLatLng = useMemo(() => generateBezierPoints(waypoints), [waypoints]);
  const curvePoints = useMemo(() => {
    if (waypoints.length === 0) return [];
    const center = waypoints[0];
    const total = curveLatLng.length;
    return curveLatLng.map((p, i) => {
      const t = total > 1 ? i / (total - 1) : 0;
      const altitude = interpolateAltitude(waypoints, t);
      return toPoint3D(p[0], p[1], altitude, center.lat, center.lng);
    });
  }, [curveLatLng, waypoints]);
  const curve = useMemo(() => createCatmullRomCurve(curvePoints), [curvePoints]);
  const gridCenter = useMemo(() => {
    const base = curvePoints.length > 0 ? curvePoints : points;
    return centerXZ(base);
  }, [curvePoints, points]);
  const mapCenter = useMemo(() => {
    if (lastPattern) {
      return { lat: lastPattern.centerLat, lng: lastPattern.centerLng };
    }
    return centerLatLng(waypoints);
  }, [lastPattern, waypoints]);
  const mapPosition = useMemo(() => {
    if (waypoints.length === 0) return new THREE.Vector3(0, 0, 0);
    const origin = waypoints[0];
    return toPoint3D(mapCenter.lat, mapCenter.lng, 0, origin.lat, origin.lng);
  }, [mapCenter.lat, mapCenter.lng, waypoints]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} />
      {waypoints.length > 0 && (
        <GroundMap
          lat={mapCenter.lat}
          lng={mapCenter.lng}
          position={mapPosition}
          onReady={setMapReady}
        />
      )}
      {!mapReady && (
        <Grid
          args={[300, 300]}
          position={[gridCenter.x, 0, gridCenter.z]}
          cellSize={1}
          cellColor="#94a3b8"
          sectionSize={5}
          sectionColor="#cbd5f5"
          fadeDistance={240}
          fadeStrength={1}
        />
      )}
      <WaypointSpheres points={points} />
      {curve && <RouteTube curve={curve} />}
      {curvePoints.length > 1 && <DroneSimulation points={curvePoints} />}
      <OrbitControls makeDefault target={[gridCenter.x, 0, gridCenter.z]} />
    </>
  );
}

export default function Viewer3D() {
  return (
    <div className="h-full w-full bg-background">
      <Canvas camera={{ position: [15, 15, 15], fov: 60 }}>
        <Scene />
      </Canvas>
    </div>
  );
}
