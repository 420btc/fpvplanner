import { Waypoint } from '@/types/route';

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export type PatternType = 'circle' | 'spiral-up' | 'spiral-down' | 'figure8' | 'oval';

interface PatternConfig {
  label: string;
  icon: string;
  description: string;
}

export const PATTERNS: Record<PatternType, PatternConfig> = {
  'circle': { label: 'Círculo', icon: '⭕', description: 'Órbita circular a altitud fija' },
  'spiral-up': { label: 'Espiral ↑', icon: '🌀', description: 'Espiral ascendente' },
  'spiral-down': { label: 'Espiral ↓', icon: '🔽', description: 'Espiral descendente' },
  'figure8': { label: 'Figura 8', icon: '♾️', description: 'Ruta en forma de 8' },
  'oval': { label: 'Óvalo', icon: '🔵', description: 'Órbita ovalada' },
};

const DEG_PER_METER_LAT = 1 / 110540;
function degPerMeterLng(lat: number) {
  return 1 / (111320 * Math.cos(lat * Math.PI / 180));
}

export function generatePattern(
  type: PatternType,
  centerLat: number,
  centerLng: number,
  radius: number = 80, // meters
  points: number = 16,
  startAlt: number = 30,
  endAlt: number = 80,
): Waypoint[] {
  const waypoints: Waypoint[] = [];
  const dLat = DEG_PER_METER_LAT;
  const dLng = degPerMeterLng(centerLat);

  switch (type) {
    case 'circle': {
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        waypoints.push({
          id: generateId(),
          lat: centerLat + Math.sin(angle) * radius * dLat,
          lng: centerLng + Math.cos(angle) * radius * dLng,
          altitude: startAlt,
        });
      }
      break;
    }

    case 'spiral-up': {
      const loops = 3;
      const totalPoints = points * loops;
      for (let i = 0; i <= totalPoints; i++) {
        const t = i / totalPoints;
        const angle = t * Math.PI * 2 * loops;
        const r = radius * (0.4 + t * 0.6);
        waypoints.push({
          id: generateId(),
          lat: centerLat + Math.sin(angle) * r * dLat,
          lng: centerLng + Math.cos(angle) * r * dLng,
          altitude: Math.round(startAlt + t * (endAlt - startAlt)),
        });
      }
      break;
    }

    case 'spiral-down': {
      const loops2 = 3;
      const totalPoints2 = points * loops2;
      for (let i = 0; i <= totalPoints2; i++) {
        const t = i / totalPoints2;
        const angle = t * Math.PI * 2 * loops2;
        const r = radius * (1 - t * 0.6);
        waypoints.push({
          id: generateId(),
          lat: centerLat + Math.sin(angle) * r * dLat,
          lng: centerLng + Math.cos(angle) * r * dLng,
          altitude: Math.round(endAlt - t * (endAlt - startAlt)),
        });
      }
      break;
    }

    case 'figure8': {
      for (let i = 0; i <= points * 2; i++) {
        const t = i / (points * 2);
        const angle = t * Math.PI * 2;
        const r = radius * Math.sin(angle);
        waypoints.push({
          id: generateId(),
          lat: centerLat + Math.sin(angle * 2) * radius * 0.5 * dLat,
          lng: centerLng + Math.cos(angle) * radius * dLng,
          altitude: startAlt,
        });
      }
      break;
    }

    case 'oval': {
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        waypoints.push({
          id: generateId(),
          lat: centerLat + Math.sin(angle) * radius * 0.6 * dLat,
          lng: centerLng + Math.cos(angle) * radius * dLng,
          altitude: startAlt,
        });
      }
      break;
    }
  }

  return waypoints;
}
