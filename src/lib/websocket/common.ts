import { encode } from "@msgpack/msgpack";
import type { SignalData } from "simple-peer";
import type { WebSocket } from "ws";

import type { DeviceType } from "$lib/lib/common";
import type { Database } from "$lib/lib/db";
import { deleteDevice, getContacts, getDevices, getUser } from "$lib/server/db";

import { clients } from "../../hooks.server";
import {
  createContactLinkingCode,
  createDeviceLinkingCode,
  createTransfer,
  deleteContact,
  deleteContactLinkingCode,
  deleteDeviceLinkingCode,
  notifyDevices,
  redeemContactLinkingCode,
  updateDevice,
  updateUser,
} from "./server/lib/authorized";
import { getTurnCredentials } from "./server/lib/common";
import { authorize, authorizeGuest, authorizeMain } from "./server/lib/context";

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
      last_seen_at: number;
    };
    others: {
      did: number;
      display_name: string;
      is_online: number;
      type: DeviceType;
      created_at: number;
      last_seen_at: number;
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
  id: number;
  type: "getInfos";
  data?: any;
}

export interface GetTurnCredentials {
  id: number;
  type: "getTurnCredentials";
  data?: any;
}

export interface Share {
  id: number;
  type: "share" | "shareFromGuest";
  data: {
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
  };
}

export interface CreateTransfer {
  id: number;
  type: "createTransfer";
  data?: any;
}

export interface UpdateDevice {
  id: number;
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
  id: number;
  type: "deleteDevice";
  data?: number;
}

export interface UpdateUser {
  id: number;
  type: "updateUser";
  data: {
    display_name?: string;
    avatar_seed?: string;
  };
}

export interface DeleteContact {
  id: number;
  type: "deleteContact";
  data: number;
}

export interface CreateContactCode {
  id: number;
  type: "createContactCode";
  data?: any;
}

export interface RedeemContactCode {
  id: number;
  type: "redeemContactCode";
  data: string;
}

export interface DeleteContactCode {
  id: number;
  type: "deleteContactCode";
  data?: any;
}

export interface CreateDeviceCode {
  id: number;
  type: "createDeviceCode";
  data?: any;
}

export interface DeleteDeviceCode {
  id: number;
  type: "deleteDeviceCode";
  data?: any;
}

export const sendMessage = (
  client: WebSocket | number,
  message: MessageFromServer,
) => {
  if (typeof client === "number") {
    for (const c of clients) {
      if (c.device === client) {
        client = c;
        return;
      }
    }
    if (typeof client === "number") throw new Error("404");
  }

  client.send(encode(message));
};

export const handleMessage = async (
  cts: {
    db: Database;
    cookieKey: CryptoKey;
    turnKey: CryptoKey;
  },
  client: ExtendedWebSocket,
  ids: AuthenticationIds,
  data: MessageFromClient,
) => {
  // Initial infos
  if (data.type == "getInfos") {
    authorizeMain(client, ids, async (device, user) => {
      // User
      const userInfos = await getUser(cts.db, user);
      if (!userInfos.success) throw new Error("500");
      sendMessage(client, { type: "user", data: userInfos.message });
      // Devices
      const deviceInfos = await getDevices(cts.db, user, device);
      if (!deviceInfos.success) throw new Error("500");
      sendMessage(client, { type: "devices", data: deviceInfos.message });
      // Contacts
      const contacts = await getContacts(cts.db, user);
      if (!contacts.success) throw new Error("500");
      sendMessage(client, { type: "contacts", data: contacts.message });
    });

    // WebRTC sharing
  } else if (data.type == "getTurnCredentials") {
    authorize(client, ids, (AuthIds) => {
      if (typeof AuthIds != "number") {
        getTurnCredentials(
          client,
          data.id,
          AuthIds.device.toString(),
          cts.turnKey,
        );
      } else {
        getTurnCredentials(client, data.id, AuthIds.toString(), cts.turnKey);
      }
    });
  } else if (data.type == "share") {
    authorizeMain(client, ids, (device) => {
      sendMessage(data.data.did, {
        type: "webRTCData",
        data: {
          from: device,
          data: data.data.data,
        },
      });
    });
  } else if (data.type == "shareFromGuest") {
    authorizeGuest(client, ids, (guest) => {
      sendMessage(data.data.did, {
        type: "webRTCData",
        data: {
          from: guest * -1,
          data: data.data.data,
        },
      });
    });

    // Guest
  } else if (data.type == "createTransfer") {
    authorizeMain(client, ids, (device) => {
      sendMessage(client, {
        id: data.id,
        type: "filetransfer",
        data: createTransfer(device),
      });
    });

    // Device
  } else if (data.type == "updateDevice") {
    authorizeMain(client, ids, (device, user) => {
      updateDevice(cts.db, device, user, data.data.update, data.data.did);
    });
  } else if (data.type == "deleteDevice") {
    authorizeMain(client, ids, async (device, user) => {
      const result = await deleteDevice(
        cts.db,
        device,
        data.data === undefined ? device : data.data,
        user,
      );
      if (!result.success) throw new Error("500");
      notifyDevices(cts.db, "device", user);
    });

    // User
  } else if (data.type == "updateUser") {
    authorizeMain(client, ids, (device, user) => {
      updateUser(cts.db, user, data.data);
    });

    // Contacts
  } else if (data.type == "deleteContact") {
    authorizeMain(client, ids, (device, user) => {
      deleteContact(cts.db, user, data.data);
    });
  } else if (data.type == "createContactCode") {
    authorizeMain(client, ids, async (device, user) => {
      sendMessage(client, {
        id: data.id,
        type: "contactLinkingCode",
        data: await createContactLinkingCode(cts.db, device, user),
      });
    });
  } else if (data.type == "redeemContactCode") {
    authorizeMain(client, ids, (device, user) => {
      redeemContactLinkingCode(cts.db, user, data.data);
    });
  } else if (data.type == "deleteContactCode") {
    authorizeMain(client, ids, (device, user) => {
      deleteContactLinkingCode(cts.db, device, user);
    });

    // Device linking code
  } else if (data.type == "createDeviceCode") {
    authorizeMain(client, ids, async (device, user) => {
      sendMessage(client, {
        id: data.id,
        type: "deviceLinkingCode",
        data: await createDeviceLinkingCode(cts.db, device, user),
      });
    });
  } else if (data.type == "deleteDeviceCode") {
    authorizeMain(client, ids, (device, user) => {
      deleteDeviceLinkingCode(cts.db, device, user);
    });
  } else throw new Error("404");
};
