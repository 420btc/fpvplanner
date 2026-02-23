import { Waypoint } from '@/types/route';
import { BatteryProfile } from './battery';

// Constantes de consumo para LR4 (4 pulgadas Long Range)
const CRUISE_CURRENT = 5.5; // Amperios en vuelo nivelado (4.5A - 6A)
const CLIMB_CURRENT_BASE = 13.5; // Amperios subiendo fuerte (12A - 15A)
const IDLE_DESCENT_CURRENT = 2.0; // Amperios bajando (motores al mínimo)
const CLIMB_PENALTY_FACTOR = 0.40; // 40% extra por subida fuerte
const ALTITUDE_PENALTY_PER_100M = 0.01; // 1% extra por cada 100m de altura

export interface SegmentAnalysis {
  distance: number; // metros
  verticalDistance: number; // metros
  time: number; // segundos
  consumedCapacity: number; // mAh
  averageCurrent: number; // A
}

export interface RouteAnalysis {
  totalDistance: number;
  totalTime: number;
  totalConsumption: number; // mAh
  segments: SegmentAnalysis[];
  batteryStatus: 'ok' | 'warning' | 'critical' | 'crash';
}

function calculateSegmentConsumption(
  p1: Waypoint,
  p2: Waypoint,
  speed: number, // m/s (velocidad horizontal media)
  climbSpeed: number // m/s (velocidad vertical)
): SegmentAnalysis {
  const R = 6371000;
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLng = (p2.lng - p1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const horizontalDist = R * c;
  
  const verticalDist = p2.altitude - p1.altitude;
  const distance3D = Math.sqrt(horizontalDist ** 2 + verticalDist ** 2);
  
  // Tiempo estimado para recorrer el segmento
  // Si es subida pura, limitamos por climbSpeed, si es avance, por speed
  const timeHorizontal = horizontalDist / speed;
  const timeVertical = Math.abs(verticalDist) / climbSpeed;
  const time = Math.max(timeHorizontal, timeVertical, 0.1); // Evitar división por cero

  // Cálculo de Amperaje
  let current = CRUISE_CURRENT;

  // Factor de subida/bajada
  const verticalRate = verticalDist / time; // m/s reales
  
  if (verticalRate > 0.5) {
      // Subiendo
      // Interpolamos entre CRUISE y CLIMB según la agresividad de la subida
      const effort = Math.min(verticalRate / climbSpeed, 1); 
      current = CRUISE_CURRENT + (CLIMB_CURRENT_BASE - CRUISE_CURRENT) * effort;
      // Penalización extra del 40% si sube cerca del máximo
      if (effort > 0.8) current *= (1 + CLIMB_PENALTY_FACTOR);
  } else if (verticalRate < -0.5) {
      // Bajando
      current = IDLE_DESCENT_CURRENT;
  }

  // Penalización por altitud (densidad del aire)
  const avgAlt = (p1.altitude + p2.altitude) / 2;
  const altitudeFactor = 1 + (avgAlt / 100) * ALTITUDE_PENALTY_PER_100M;
  current *= altitudeFactor;

  // Consumo en este segmento
  // mAh = Amperios * horas * 1000
  // horas = segundos / 3600
  const consumedAh = current * (time / 3600);
  const consumedCapacity = consumedAh * 1000;

  return {
    distance: distance3D,
    verticalDistance: verticalDist,
    time,
    consumedCapacity,
    averageCurrent: current
  };
}

export function analyzeRoute(
  waypoints: Waypoint[],
  battery: BatteryProfile,
  cruiseSpeed: number = 15, // m/s (~54 km/h)
  climbSpeed: number = 5 // m/s
): RouteAnalysis {
  if (waypoints.length < 2) {
    return { totalDistance: 0, totalTime: 0, totalConsumption: 0, segments: [], batteryStatus: 'ok' };
  }

  let totalDistance = 0;
  let totalTime = 0;
  let totalConsumption = 0;
  const segments: SegmentAnalysis[] = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const segment = calculateSegmentConsumption(waypoints[i], waypoints[i+1], cruiseSpeed, climbSpeed);
    totalDistance += segment.distance;
    totalTime += segment.time;
    totalConsumption += segment.consumedCapacity;
    segments.push(segment);
  }

  // Estado de la batería
  const usagePercent = (totalConsumption / battery.capacity) * 100;
  let batteryStatus: 'ok' | 'warning' | 'critical' | 'crash' = 'ok';
  
  if (usagePercent > 100) batteryStatus = 'crash';
  else if (usagePercent > 80) batteryStatus = 'critical';
  else if (usagePercent > 50) batteryStatus = 'warning';

  return {
    totalDistance,
    totalTime,
    totalConsumption,
    segments,
    batteryStatus
  };
}
