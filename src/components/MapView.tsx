import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl, { Map, Marker } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { FeatureCollection, LineString, Point } from 'geojson';
import { useRoute } from '@/contexts/RouteContext';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
const MAPBOX_STYLE_SAT = 'mapbox://styles/mapbox/satellite-v9';
const MAPBOX_STYLE_NORMAL = 'mapbox://styles/mapbox/streets-v12';

function generateBezierPointsWithSegments(waypoints: { lat: number; lng: number }[]) {
  if (waypoints.length < 2) {
    return { points: waypoints.map(w => [w.lat, w.lng] as [number, number]), segmentRanges: [] };
  }
  const points: [number, number][] = [];
  const segmentRanges: { start: number; end: number }[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const startIndex = points.length;
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
    const endIndex = points.length - 1;
    segmentRanges.push({ start: startIndex, end: endIndex });
  }
  return { points, segmentRanges };
}

function haversineDistance(a: [number, number], b: [number, number]) {
  const R = 6371000;
  const dLat = (b[0] - a[0]) * Math.PI / 180;
  const dLng = (b[1] - a[1]) * Math.PI / 180;
  const lat1 = a[0] * Math.PI / 180;
  const lat2 = b[0] * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function mixColor(a: [number, number, number], b: [number, number, number], t: number) {
  const clampT = Math.min(1, Math.max(0, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * clampT),
    Math.round(a[1] + (b[1] - a[1]) * clampT),
    Math.round(a[2] + (b[2] - a[2]) * clampT),
  ] as [number, number, number];
}

function rgbToHex([r, g, b]: [number, number, number]) {
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

function severityColor(level: number) {
  const green: [number, number, number] = [34, 197, 94];
  const orange: [number, number, number] = [249, 115, 22];
  const red: [number, number, number] = [239, 68, 68];
  if (level <= 0.5) {
    return rgbToHex(mixColor(green, orange, level / 0.5));
  }
  return rgbToHex(mixColor(orange, red, (level - 0.5) / 0.5));
}

export default function MapView() {
  const { waypoints, updateWaypoint, simulationState, simulationProgress, activePattern, addPattern, addWaypoint, patternRadius, routeAnalysis } = useRoute();
  const curveData = useMemo(() => generateBezierPointsWithSegments(waypoints), [waypoints]);
  const curvePoints = curveData.points;
  const [mapStyle, setMapStyle] = useState<'satellite' | 'normal'>('satellite');
  const [styleReady, setStyleReady] = useState(0);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Record<string, Marker>>({});
  const droneSourceId = 'drone';
  const routeSourceId = 'route';
  const initialStyleRef = useRef(mapStyle);
  const activePatternRef = useRef(activePattern);
  const patternRadiusRef = useRef(patternRadius);
  const addPatternRef = useRef(addPattern);
  const addWaypointRef = useRef(addWaypoint);

  const lineGradient = useMemo(() => {
    if (curveData.segmentRanges.length === 0 || routeAnalysis.segments.length === 0) {
      return ['interpolate', ['linear'], ['line-progress'], 0, '#22c55e', 1, '#22c55e'] as mapboxgl.Expression;
    }
    const segmentCurrents = routeAnalysis.segments.map(s => s.averageCurrent);
    const minCurrent = Math.min(...segmentCurrents);
    const maxCurrent = Math.max(...segmentCurrents);
    const levels = segmentCurrents.map(v => {
      if (maxCurrent === minCurrent) return 0.5;
      return Math.min(1, Math.max(0, (v - minCurrent) / (maxCurrent - minCurrent)));
    });

    const segmentLengths = curveData.segmentRanges.map(range => {
      let length = 0;
      for (let i = range.start; i < range.end; i++) {
        length += haversineDistance(curvePoints[i], curvePoints[i + 1]);
      }
      return length;
    });
    const totalLength = segmentLengths.reduce((acc, v) => acc + v, 0);
    if (totalLength === 0) {
      return ['interpolate', ['linear'], ['line-progress'], 0, '#22c55e', 1, '#22c55e'] as mapboxgl.Expression;
    }

    const stops: (number | string)[] = [];
    let acc = 0;
    for (let i = 0; i < segmentLengths.length; i++) {
      const startProgress = acc / totalLength;
      acc += segmentLengths[i];
      const endProgress = acc / totalLength;
      const currentColor = severityColor(levels[i] ?? 0.5);
      const nextColor = severityColor(levels[i + 1] ?? levels[i] ?? 0.5);
      if (i === 0) {
        stops.push(0, currentColor);
      }
      stops.push(endProgress, nextColor);
    }
    return ['interpolate', ['linear'], ['line-progress'], ...stops] as mapboxgl.Expression;
  }, [curveData.segmentRanges, curvePoints, routeAnalysis.segments]);

  useEffect(() => {
    activePatternRef.current = activePattern;
    patternRadiusRef.current = patternRadius;
    addPatternRef.current = addPattern;
    addWaypointRef.current = addWaypoint;
  }, [activePattern, patternRadius, addPattern, addWaypoint]);

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

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN ?? '';
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: initialStyleRef.current === 'satellite' ? MAPBOX_STYLE_SAT : MAPBOX_STYLE_NORMAL,
      center: [-4.4990, 36.6235], // Torremolinos, Málaga
      zoom: 16,
      attributionControl: false,
    });
    mapRef.current = map;

    map.on('click', (e) => {
      const pattern = activePatternRef.current;
      const radius = patternRadiusRef.current;
      if (pattern) {
        addPatternRef.current(pattern, e.lngLat.lat, e.lngLat.lng, radius);
      } else {
        addWaypointRef.current(e.lngLat.lat, e.lngLat.lng);
      }
    });
    map.dragRotate.enable();
    map.touchZoomRotate.enableRotation();
    map.setPitch(0);
    map.on('load', () => {
      setStyleReady(v => v + 1);
    });
    map.on('style.load', () => {
      setStyleReady(v => v + 1);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const styleUrl = mapStyle === 'satellite' ? MAPBOX_STYLE_SAT : MAPBOX_STYLE_NORMAL;
    map.setStyle(styleUrl);
    map.once('style.load', () => {
      map.resize();
      setStyleReady(v => v + 1);
    });
  }, [mapStyle]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || styleReady === 0) return;

    const routeGeoJson: FeatureCollection<LineString> = {
      type: 'FeatureCollection',
      features: curvePoints.length > 1 ? [{
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: curvePoints.map(([lat, lng]) => [lng, lat]),
        },
        properties: {},
      }] : [],
    };

    if (!map.getSource(routeSourceId)) {
      map.addSource(routeSourceId, { type: 'geojson', data: routeGeoJson, lineMetrics: true });
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: routeSourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#3b82f6', 'line-width': 3, 'line-opacity': 0.9, 'line-gradient': lineGradient },
      });
    } else {
      const source = map.getSource(routeSourceId) as mapboxgl.GeoJSONSource;
      source.setData(routeGeoJson);
      map.setPaintProperty('route-line', 'line-gradient', lineGradient);
    }
  }, [curvePoints, lineGradient, styleReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || styleReady === 0) return;
    const droneGeoJson: FeatureCollection<Point> = {
      type: 'FeatureCollection',
      features: dronePosition ? [{
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [dronePosition[1], dronePosition[0]],
        },
        properties: {},
      }] : [],
    };

    if (!map.getSource(droneSourceId)) {
      map.addSource(droneSourceId, { type: 'geojson', data: droneGeoJson });
      map.addLayer({
        id: 'drone-point',
        type: 'circle',
        source: droneSourceId,
        paint: {
          'circle-radius': 6,
          'circle-color': '#f59e0b',
          'circle-stroke-color': '#facc15',
          'circle-stroke-width': 2,
        },
      });
    } else {
      const source = map.getSource(droneSourceId) as mapboxgl.GeoJSONSource;
      source.setData(droneGeoJson);
    }
  }, [dronePosition, styleReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || styleReady === 0) return;

    const nextIds = new Set(waypoints.map(wp => wp.id));
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      if (!nextIds.has(id)) {
        marker.remove();
        delete markersRef.current[id];
      }
    });

    waypoints.forEach((wp) => {
      const existing = markersRef.current[wp.id];
      if (existing) {
        existing.setLngLat([wp.lng, wp.lat]);
        return;
      }
      const el = document.createElement('div');
      el.style.width = '16px';
      el.style.height = '16px';
      el.style.borderRadius = '50%';
      el.style.background = '#3b82f6';
      el.style.border = '3px solid #93c5fd';
      el.style.boxShadow = '0 0 12px #3b82f680';
      const marker = new mapboxgl.Marker({ element: el, draggable: true })
        .setLngLat([wp.lng, wp.lat])
        .addTo(map);
      marker.on('dragend', () => {
        const { lng, lat } = marker.getLngLat();
        updateWaypoint(wp.id, { lat, lng });
      });
      markersRef.current[wp.id] = marker;
    });
  }, [updateWaypoint, waypoints, styleReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onStyleLoad = () => {
      map.resize();
    };
    map.on('style.load', onStyleLoad);
    return () => {
      map.off('style.load', onStyleLoad);
    };
  }, []);

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainerRef} className="h-full w-full" />
    </div>
  );
}
