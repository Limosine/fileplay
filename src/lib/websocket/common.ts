import type { SignalData } from "simple-peer";
import type { WebSocket } from "ws";

import type { DeviceType } from "$lib/lib/common";

export interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  device: number | null;
  user: number | null;
  guest: number | null;
}

export interface AuthenticationIds {
  device: number | null;
  user: number | null;
  guest: number | null;
}

export type MessageFromServer =
  | User
  | Devices
  | Contacts
  | WebRTCData
  | Filetransfer
  | LinkingCode
  | TurnCredentials
  | Error;

export interface User {
  id?: number;
  type: "user";
  data: {
    uid: number;
    display_name: string;
    created_at: number;
    avatar_seed: string;
  };
}

export interface Devices {
  id?: number;
  type: "devices";
  data: {
    self: {
      created_at: number;
      display_name: string;
      did: number;
      type: DeviceType;
    };
    others: {
      did: number;
      display_name: string;
      type: DeviceType;
      created_at: number;
    }[];
  };
}

export interface Contacts {
  id?: number;
  type: "contacts";
  data: {
    cid: number;
    uid: number;
    display_name: string;
    avatar_seed: string;
    linked_at: number;
    devices: {
      did: number;
      type: string;
      display_name: string;
    }[];
  }[];
}

export interface WebRTCData {
  id?: number;
  type: "webRTCData";
  data: {
    data:
      | {
          type: "webrtc";
          data: Uint8Array;
        }
      | { type: "signal"; data: SignalData };
    from: number;
  };
}

export interface Filetransfer {
  id: number;
  type: "filetransfer";
  data: string;
}

export interface LinkingCode {
  id: number;
  type: "contactLinkingCode" | "deviceLinkingCode";
  data: {
    code: string;
    expires: number;
    refresh: number;
  };
}

export interface TurnCredentials {
  id: number;
  type: "turnCredentials";
  data: {
    username: string;
    password: string;
  };
}

export interface Error {
  id: number;
  type: "error";
  data: any;
}

export type MessageFromClient =
  | GetInfos
  | GetTurnCredentials
  | Share
  | ShareFromGuest
  | CreateTransfer
  | UpdateDevice
  | DeleteDevice
  | UpdateUser
  | DeleteContact
  | CreateContactCode
  | RedeemContactCode
  | DeleteContactCode
  | CreateDeviceCode
  | DeleteDeviceCode;

export interface GetInfos {
  type: "getInfos";
}

export interface GetTurnCredentials {
  type: "getTurnCredentials";
}

interface DataOverWebSocket {
  did: number;
  data:
    | {
        type: "webrtc";
        data: Uint8Array;
      }
    | {
        type: "signal";
        data: SignalData;
      };
}

export interface Share {
  type: "share";
  data: DataOverWebSocket;
}

export interface ShareFromGuest {
  type: "shareFromGuest";
  data: DataOverWebSocket & { guestTransfer: string };
}

export interface CreateTransfer {
  type: "createTransfer";
}

export interface UpdateDevice {
  type: "updateDevice";
  data: {
    did?: number;
    update: {
      display_name?: string;
      type?: DeviceType;
    };
  };
}

export interface DeleteDevice {
  type: "deleteDevice";
  data?: number;
}

export interface UpdateUser {
  type: "updateUser";
  data: {
    display_name?: string;
    avatar_seed?: string;
  };
}

export interface DeleteContact {
  type: "deleteContact";
  data: number;
}

export interface CreateContactCode {
  type: "createContactCode";
}

export interface RedeemContactCode {
  type: "redeemContactCode";
  data: string;
}

export interface DeleteContactCode {
  type: "deleteContactCode";
}

export interface CreateDeviceCode {
  type: "createDeviceCode";
}

export interface DeleteDeviceCode {
  type: "deleteDeviceCode";
}
