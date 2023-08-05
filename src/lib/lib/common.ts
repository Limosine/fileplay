// Common values
export enum DeviceType {
  Desktop = "desktop",
  Laptop = "laptop",
  Phone = "phone",
  Tablet = "tablet",
}

export enum TimeFormat {
  Date = "L",
  MinuteDate = "L LT",
}

export const LINKING_EXPIRY_TIME = 15 * 60 * 1000; // 15 minutes
export const LINKING_REFRESH_TIME = 10 * 60 * 1000; // 10 minutes
export const ONLINE_STATUS_TIMEOUT: number = 30; // 30 seconds
export const ONLINE_STATUS_REFRESH_TIME: number = 25; // 25 seconds

// Dicebear avatars
export function getDicebearUrl(seed: string, size: number, radius: number = 50): string {
  return `https://api.dicebear.com/6.x/adventurer/svg?seed=${seed}&radius=${radius}&backgroundColor=b6e3f4&width=${size}&height=${size}`;
}