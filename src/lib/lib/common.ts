// Common values
export enum DeviceType {
  Desktop = "desktop",
  Laptop = "laptop",
  Phone = "phone",
  Tablet = "tablet",
}

export const LINKING_EXPIRY_TIME = 1000 * 60 * 15; // 15 minutes
export const LINKING_REFRESH_TIME = 1000 * 60 * 10; // 10 minutes
export const ONLINE_STATUS_TIMEOUT = 7; // 7 seconds
export const ONLINE_STATUS_REFRESH_TIME = 5; // 5 seconds

// Dicebear avatars
export const getDicebearUrl = (
  seed: string,
  size: number,
  radius: number = 50,
) => {
  return `https://api.dicebear.com/6.x/adventurer/svg?seed=${seed}&radius=${radius}&backgroundColor=b6e3f4&width=${size}&height=${size}`;
};
