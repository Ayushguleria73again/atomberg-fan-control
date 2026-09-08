export interface FanMetadata {
  id: string;
  name: string;
  room: string;
  model: string;
  series: string;
  hasLed: boolean;
  hasSleep: boolean;
  hasTimer: boolean;
}

export const KNOWN_FANS: Record<string, FanMetadata> = {
  "3844be6b7c80": {
    id: "3844be6b7c80",
    name: "Hall Fan 1",
    room: "Hall",
    model: "renesa+",
    series: "R2",
    hasLed: true,
    hasSleep: true,
    hasTimer: true,
  },
  "3844be560e10": {
    id: "3844be560e10",
    name: "Balcony Fan",
    room: "Balcony",
    model: "renesa+",
    series: "R2",
    hasLed: true,
    hasSleep: true,
    hasTimer: true,
  },
  "3844be54dfa4": {
    id: "3844be54dfa4",
    name: "Hall Fan 2",
    room: "Hall",
    model: "renesa+",
    series: "R2",
    hasLed: true,
    hasSleep: true,
    hasTimer: true,
  },
  "8cfd495a1730": {
    id: "8cfd495a1730",
    name: "Master Bedroom Fan",
    room: "Master Bedroom",
    model: "renesa+",
    series: "R2",
    hasLed: true,
    hasSleep: true,
    hasTimer: true,
  },
};

export const KNOWN_DEVICE_IDS = Object.keys(KNOWN_FANS);
