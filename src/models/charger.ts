export enum ChargerStatus {
  AVAILABLE = 'AVAILABLE',
  BLOCKED = 'BLOCKED',
  CHARGING = 'CHARGING',
  INOPERATIVE = 'INOPERATIVE',
  REMOVED = 'REMOVED',
  RESERVED = 'RESERVED',
  UNKNOWN = 'UNKNOWN'
}

export interface Charger {
  id: string;
  partnerId: string;
  status: ChargerStatus;
  lastUpdate: Date;
  meterValue: number; // in kWh
}

export interface ChargerStatusUpdate {
  status: ChargerStatus;
  meterValue: number;
  timestamp: Date;
}
