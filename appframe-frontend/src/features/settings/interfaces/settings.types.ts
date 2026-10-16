import type { ActiveSession } from '../../auth';

export interface UserSessionItem {
  id: string;
  deviceName: string;
  browser: string;
  ipAddress: string;
  isCurrent: boolean;
  lastActiveAt: string;
  icon: string;
}

export type SettingsSection = 'profile' | 'security' | 'sessions' | 'danger';

export type { ActiveSession };
