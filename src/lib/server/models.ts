export interface User {
  id: string;
  name: string;
  lastSeen: number;
  avatarSeed: string;
}

export interface Device {
  id: string;
  userId: string;
  authHash: string;
  isOnline: boolean;
  lastSeen: number;
  webPushEndpoint: string;
  webPushP256DH: string;
  webPushAuth: string;
}

export interface Contacts {
  fromId: string;
  toId: string;
}

export interface UserToDevice {
  userId: string;
  deviceId: string;
}
