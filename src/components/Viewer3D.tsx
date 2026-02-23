import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useRoute } from '@/contexts/RouteContext';

const SCALE = 3;

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

function RouteTube({ curve }: { curve: THREE.CatmullRomCurve3 }) {
  const geometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 128, 0.15, 8, false);
  }, [curve]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#3b82f6" emissive="#1d4ed8" emissiveIntensity={0.5} transparent opacity={0.85} />
    </mesh>
  );
}

function WaypointSpheres({ points }: { points: THREE.Vector3[] }) {
  return (
    <>
      {points.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial color="#60a5fa" emissive="#3b82f6" emissiveIntensity={0.8} />
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
  const { waypoints } = useRoute();
  const points = useMemo(() => waypointsTo3D(waypoints), [waypoints]);
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

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} />
      <Grid
        args={[300, 300]}
        position={[0, 0, 0]}
        cellSize={1}
        cellColor="#1e3a5f"
        sectionSize={5}
        sectionColor="#2563eb"
        fadeDistance={240}
        fadeStrength={1}
      />
      <WaypointSpheres points={points} />
      {curve && <RouteTube curve={curve} />}
      {curvePoints.length > 1 && <DroneSimulation points={curvePoints} />}
      <OrbitControls makeDefault />
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
