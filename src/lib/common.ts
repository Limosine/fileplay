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
export const SHARING_TIMEOUT = 3 * 60 * 1000; // 5 minutes
