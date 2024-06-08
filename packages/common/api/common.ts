import { z } from "zod";

import { DeviceType } from "../common.ts";

export type MessageFromServer =
  | User
  | Devices
  | Contacts
  | Groups
  | GroupDevices
  | WebRTCData
  | CloseConnection
  | Filetransfer
  | LinkingCode
  | CodeRedeemed
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
      online: boolean;
    }[];
  };
}

export interface Contacts {
  id?: number;
  type: "contacts";
  data: {
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

export interface Groups {
  id?: number;
  type: "groups";
  data: {
    gid: number;
    oid: number;
    name: string;
    created_at: number;
    members: {
      uid: number;
      joined_at: number;
      display_name: string;
      avatar_seed: string;
    }[];
    requests: {
      uid: number;
      created_at: number;
      display_name: string;
      avatar_seed: string;
    }[];
  }[];
}

export interface GroupDevices {
  id?: number;
  type: "group_devices";
  data: {
    gid: number;
    did: number;
    type: string;
    display_name: string;
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
      | { type: "signal"; data: string };
    from: number;
  };
}

export interface CloseConnection {
  id?: number;
  type: "closeConnection";
  data: number;
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

export interface CodeRedeemed {
  id?: number;
  type: "contactCodeRedeemed" | "deviceCodeRedeemed";
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

const data = z
  .object({
    type: z.enum(["webrtc"]),
    data: z.instanceof(Uint8Array),
  })
  .or(
    z.object({
      type: z.enum(["signal"]),
      data: z.string(),
    }),
  );

const messageFromClientSchemaWithoutId = z.union([
  z.object({
    type: z.enum([
      "getInfos",
      "getTurnCredentials",
      "createTransfer",
      "deleteTransfer",
      "createContactCode",
      "deleteContactCode",
      "createDeviceCode",
      "deleteDeviceCode",
    ]),
  }),
  z.object({
    type: z.enum(["share"]),
    data: z.object({
      did: z.number(),
      data,
    }),
  }),
  z.object({
    type: z.enum(["shareFromGuest"]),
    data: z.object({
      did: z.number(),
      data,
      guestTransfer: z.string(),
    }),
  }),
  z.object({
    type: z.enum(["sendNotifications"]),
    data: z.object({
      type: z.enum(["group", "contact", "devices"]),
      ids: z.array(z.number()),
      nid: z.string(),
      files: z.array(z.string()),
    }),
  }),
  z.object({
    type: z.enum(["updateDevice"]),
    data: z.object({
      did: z.number().optional(),
      update: z.object({
        display_name: z.string().optional(),
        type: z.nativeEnum(DeviceType).optional(),
        push_subscription: z.string().optional(),
      }),
    }),
  }),
  z.object({
    type: z.enum(["deleteDevice"]),
    data: z.number().optional(),
  }),
  z.object({
    type: z.enum(["updateUser"]),
    data: z.object({
      display_name: z.string().optional(),
      type: z.string().optional(),
      avatar_seed: z.string().optional(),
    }),
  }),
  z.object({
    type: z.enum(["deleteContact"]),
    data: z.number(),
  }),
  z.object({
    type: z.enum(["redeemContactCode"]),
    data: z.string(),
  }),
  z.object({
    type: z.enum(["createGroup"]),
    data: z.object({
      name: z.string(),
      members: z.array(z.number()),
    }),
  }),
  z.object({
    type: z.enum(["createGroupRequest"]),
    data: z.object({
      gid: z.number(),
      uIds: z.array(z.number()),
    }),
  }),
  z.object({
    type: z.enum(["acceptGroupRequest"]),
    data: z.number(), // Group id
  }),
  z.object({
    type: z.enum(["deleteGroupMember"]),
    data: z.object({
      gid: z.number(),
      deletion: z.number().optional(),
    }),
  }),
]);

export const messageFromClientSchema = messageFromClientSchemaWithoutId.and(
  z.object({
    id: z.number(),
  }),
);

export type MessageFromClient = z.infer<
  typeof messageFromClientSchemaWithoutId
>;
