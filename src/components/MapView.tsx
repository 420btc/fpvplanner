import { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useRoute } from '@/contexts/RouteContext';
import PatternToolbar from '@/components/PatternToolbar';
import { Button } from '@/components/ui/button';

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const waypointIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid #93c5fd;box-shadow:0 0 12px #3b82f680;"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

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

function ClickHandler() {
  const { addWaypoint, activePattern, addPattern, patternRadius } = useRoute();
  useMapEvents({
    click(e) {
      if (activePattern) {
        addPattern(activePattern, e.latlng.lat, e.latlng.lng, patternRadius);
      } else {
        addWaypoint(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export default function MapView() {
  const { waypoints, updateWaypoint, simulationState, simulationProgress } = useRoute();
  const curvePoints = generateBezierPoints(waypoints);
  const [mapStyle, setMapStyle] = useState<'satellite' | 'normal'>('satellite');

  const dronePosition = useMemo(() => {
    if (simulationState === 'idle' || curvePoints.length < 2) return null;
    const rawIndex = simulationProgress * (curvePoints.length - 1);
    const idx = Math.min(Math.floor(rawIndex), curvePoints.length - 1);
    const nextIdx = Math.min(idx + 1, curvePoints.length - 1);
    const t = rawIndex - idx;
    const [lat1, lng1] = curvePoints[idx];
    const [lat2, lng2] = curvePoints[nextIdx];
    return [lat1 + (lat2 - lat1) * t, lng1 + (lng2 - lng1) * t] as [number, number];
  }, [simulationState, simulationProgress, curvePoints]);

  return (
    <div className="relative h-full w-full">
      <PatternToolbar />
      <div className="absolute top-3 left-16 z-[1000]">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setMapStyle(prev => prev === 'satellite' ? 'normal' : 'satellite')}
          className="h-8 text-xs"
        >
          {mapStyle === 'satellite' ? 'Normal' : 'Satélite'}
        </Button>
      </div>
    <MapContainer
      center={[40.4168, -3.7038]}
      zoom={14}
      className="h-full w-full"
      zoomControl={false}
    >
      {mapStyle === 'satellite' ? (
        <TileLayer
          attribution='&copy; Esri'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
      ) : (
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      )}
      <ClickHandler />
      {waypoints.map((wp, i) => (
        <Marker
          key={wp.id}
          position={[wp.lat, wp.lng]}
          icon={waypointIcon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const latlng = e.target.getLatLng();
              updateWaypoint(wp.id, { lat: latlng.lat, lng: latlng.lng });
            },
          }}
        />
      ))}
      {curvePoints.length > 1 && (
        <Polyline
          positions={curvePoints}
          pathOptions={{ color: '#3b82f6', weight: 3, opacity: 0.9 }}
        />
      )}
      {dronePosition && (
        <CircleMarker
          center={dronePosition}
          radius={8}
          pathOptions={{ color: '#facc15', fillColor: '#f59e0b', fillOpacity: 1, weight: 2 }}
        />
      )}
    </MapContainer>
    </div>
  );
}
