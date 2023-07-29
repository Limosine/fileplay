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
export const SHARING_TIMEOUT = 3 * 60 * 1000; // 3 minutes
export const ONLINE_STATUS_TIMEOUT = 1.5 * 60 * 1000;
export const ONLINE_STATUS_REFRESH_TIME = 1 * 60 * 1000;

export function getDicebearUrl(seed: string, size: number, radius: number = 50): string {
  return `https://api.dicebear.com/6.x/adventurer/svg?seed=${seed}&radius=${radius}&backgroundColor=b6e3f4&width=${size}&height=${size}`;
}