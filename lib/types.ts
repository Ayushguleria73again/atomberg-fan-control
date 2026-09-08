export interface RawAtombergDevice {
  device_id: string;
  name?: string;
  room?: string;
  series?: string;
  model?: string;
}

export interface RawAtombergState {
  device_id: string;
  device_name?: string;
  power?: boolean;
  speed?: number;
  last_recorded_speed?: number;
  sleep?: boolean;
  sleep_mode?: boolean;
  led?: boolean;
  is_online?: boolean;
  timer?: number;
  timer_hours?: number;
  timer_time_elapsed_mins?: number;
  ts_epoch_seconds?: number;
}

export interface NormalizedFanState {
  id: string;
  name: string;
  room: string;
  model: string;
  series: string;
  online: boolean;
  power: boolean;
  speed: number;
  led: boolean;
  sleep: boolean;
  timerHours: number;
  hasLed: boolean;
  hasSleep: boolean;
  hasTimer: boolean;
  lastUpdated?: number;
}

export interface FansApiResponse {
  fans: NormalizedFanState[];
  cached: boolean;
  cachedAt: number;
}

export type FanAction = "power" | "speed" | "led" | "sleep" | "timer";

export interface FanCommandPayload {
  action: FanAction;
  value: boolean | number;
}
