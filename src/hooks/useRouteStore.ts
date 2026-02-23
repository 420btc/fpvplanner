import { useState, useCallback } from 'react';
import { Waypoint, SavedRoute, SimulationState } from '@/types/route';
import { PatternType, generatePattern } from '@/lib/patterns';

const STORAGE_KEY = 'fpv-routes';

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function useRouteStore() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [routeName, setRouteName] = useState('Nueva Ruta');
  const [simulationState, setSimulationState] = useState<SimulationState>('idle');
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [activePattern, setActivePattern] = useState<PatternType | null>(null);
  const [patternRadius, setPatternRadiusState] = useState(80);
  const [patternMaxAltitude, setPatternMaxAltitudeState] = useState(100);
  const [lastPattern, setLastPattern] = useState<{
    type: PatternType;
    centerLat: number;
    centerLng: number;
    waypointIds: string[];
  } | null>(null);

  const inferPointsCount = useCallback((type: PatternType, length: number) => {
    if (length <= 1) return 1;
    switch (type) {
      case 'circle':
      case 'oval':
        return Math.max(1, length - 1);
      case 'spiral-up':
      case 'spiral-down':
        return Math.max(1, Math.round((length - 1) / 3));
      case 'figure8':
        return Math.max(1, Math.round((length - 1) / 2));
    }
  }, []);

  const addWaypoint = useCallback((lat: number, lng: number) => {
    setWaypoints(prev => [...prev, { id: generateId(), lat, lng, altitude: 30 }]);
  }, []);

  const addPattern = useCallback((type: PatternType, lat: number, lng: number, radius: number) => {
    const patternWaypoints = generatePattern(type, lat, lng, radius, undefined, undefined, patternMaxAltitude);
    setWaypoints(prev => [...prev, ...patternWaypoints]);
    setLastPattern({
      type,
      centerLat: lat,
      centerLng: lng,
      waypointIds: patternWaypoints.map(wp => wp.id),
    });
    setActivePattern(null);
  }, [patternMaxAltitude]);

  const setPatternRadius = useCallback((radius: number) => {
    setPatternRadiusState(radius);
    setWaypoints(prev => {
      if (!lastPattern) return prev;
      const pointsCount = inferPointsCount(lastPattern.type, lastPattern.waypointIds.length);
      const regenerated = generatePattern(
        lastPattern.type,
        lastPattern.centerLat,
        lastPattern.centerLng,
        radius,
        pointsCount,
        undefined,
        patternMaxAltitude
      );
      const indexById = new Map(lastPattern.waypointIds.map((id, i) => [id, i]));
      return prev.map(wp => {
        const idx = indexById.get(wp.id);
        if (idx === undefined) return wp;
        const next = regenerated[idx];
        return { ...next, id: wp.id };
      });
    });
  }, [inferPointsCount, lastPattern, patternMaxAltitude]);

  const setPatternMaxAltitude = useCallback((altitude: number) => {
    setPatternMaxAltitudeState(altitude);
    setWaypoints(prev => {
      if (!lastPattern) return prev;
      const pointsCount = inferPointsCount(lastPattern.type, lastPattern.waypointIds.length);
      const regenerated = generatePattern(
        lastPattern.type,
        lastPattern.centerLat,
        lastPattern.centerLng,
        patternRadius,
        pointsCount,
        undefined,
        altitude
      );
      const indexById = new Map(lastPattern.waypointIds.map((id, i) => [id, i]));
      return prev.map(wp => {
        const idx = indexById.get(wp.id);
        if (idx === undefined) return wp;
        const next = regenerated[idx];
        return { ...next, id: wp.id };
      });
    });
  }, [inferPointsCount, lastPattern, patternRadius]);

  const updateWaypoint = useCallback((id: string, updates: Partial<Waypoint>) => {
    setWaypoints(prev => prev.map(wp => wp.id === id ? { ...wp, ...updates } : wp));
  }, []);

  const removeWaypoint = useCallback((id: string) => {
    setWaypoints(prev => prev.filter(wp => wp.id !== id));
  }, []);

  const clearRoute = useCallback(() => {
    setWaypoints([]);
    setSimulationState('idle');
    setSimulationProgress(0);
    setLastPattern(null);
  }, []);

  const getSavedRoutes = useCallback((): SavedRoute[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  }, []);

  const saveRoute = useCallback(() => {
    const routes = getSavedRoutes();
    const route: SavedRoute = {
      id: generateId(),
      name: routeName,
      waypoints,
      createdAt: Date.now(),
    };
    routes.push(route);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
    return route;
  }, [routeName, waypoints, getSavedRoutes]);

  const loadRoute = useCallback((route: SavedRoute) => {
    setWaypoints(route.waypoints);
    setRouteName(route.name);
    setSimulationState('idle');
    setSimulationProgress(0);
    setLastPattern(null);
  }, []);

  const deleteRoute = useCallback((id: string) => {
    const routes = getSavedRoutes().filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
  }, [getSavedRoutes]);

  const toggleSimulation = useCallback(() => {
    setSimulationState(prev => {
      if (prev === 'idle' || prev === 'paused') return 'playing';
      return 'paused';
    });
  }, []);

  const stopSimulation = useCallback(() => {
    setSimulationState('idle');
    setSimulationProgress(0);
  }, []);

  const totalDistance = waypoints.reduce((acc, wp, i) => {
    if (i === 0) return 0;
    const prev = waypoints[i - 1];
    const R = 6371000;
    const dLat = (wp.lat - prev.lat) * Math.PI / 180;
    const dLng = (wp.lng - prev.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(prev.lat * Math.PI / 180) * Math.cos(wp.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return acc + R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, 0);

  const minAltitude = waypoints.length ? Math.min(...waypoints.map(w => w.altitude)) : 0;
  const maxAltitude = waypoints.length ? Math.max(...waypoints.map(w => w.altitude)) : 0;

  return {
    waypoints, routeName, setRouteName,
    addWaypoint, addPattern, updateWaypoint, removeWaypoint, clearRoute,
    activePattern, setActivePattern, patternRadius, setPatternRadius,
    patternMaxAltitude, setPatternMaxAltitude,
    lastPattern,
    simulationState, simulationSpeed, setSimulationSpeed,
    simulationProgress, setSimulationProgress,
    toggleSimulation, stopSimulation,
    getSavedRoutes, saveRoute, loadRoute, deleteRoute,
    totalDistance, minAltitude, maxAltitude,
  };
}
