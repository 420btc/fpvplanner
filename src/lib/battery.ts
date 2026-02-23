export interface BatteryProfile {
  id: string;
  name: string;
  type: 'LiPo' | 'LiHV' | 'Li-ion';
  capacity: number; // mAh
  voltage: number; // V (nominal)
  cells: number; // S
  maxDischarge: number; // A
  weight?: number; // g
}

export const BATTERY_PROFILES: BatteryProfile[] = [
  {
    id: 'lihv-850',
    name: 'LiHV 850mAh 4S',
    type: 'LiHV',
    capacity: 850,
    voltage: 15.2,
    cells: 4,
    maxDischarge: 60,
  },
  {
    id: 'liion-3000',
    name: 'Li-ion 3000mAh 4S',
    type: 'Li-ion',
    capacity: 3000,
    voltage: 14.4,
    cells: 4,
    maxDischarge: 30,
  },
];
