export interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  altitude: number; // meters
}

export interface SavedRoute {
  id: string;
  name: string;
  waypoints: Waypoint[];
  createdAt: number;
}

export type SimulationState = 'idle' | 'playing' | 'paused';
