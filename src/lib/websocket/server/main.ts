import { encode } from "@msgpack/msgpack";
import type { WebSocket } from "ws";

import type { Database } from "$lib/lib/db";
import {
  deleteDevice,
  getDevices as getDevicesDB,
  getUser,
} from "$lib/server/db";
import type {
  AuthenticationIds,
  ExtendedWebSocket,
  MessageFromClient,
  MessageFromServer,
} from "$lib/websocket/common";

import {
  createContactLinkingCode,
  createDeviceLinkingCode,
  createTransfer,
  deleteContact,
  deleteContactLinkingCode,
  deleteDeviceLinkingCode,
  getContacts,
  getTurnCredentials,
  redeemContactLinkingCode,
  updateDevice,
  updateUser,
} from "./authorized";
import { authorize, authorizeGuest, authorizeMain } from "./context";
import { clients } from "../../../hooks.server";
import { get } from "svelte/store";
import { filetransfers } from "./stores";

// Message handler
export const sendMessage = (
  client: WebSocket | number,
  message: MessageFromServer,
  error = true,
) => {
  console.log(message);
  if (typeof client === "number") {
    for (const c of clients) {
      if (client < 0) {
        if (c.guest === client * -1) {
          client = c;
          break;
        }
      } else if (c.device === client) {
        client = c;
        break;
      }
    }
    if (typeof client === "number" && error) throw new Error("404");
  }

  if (typeof client !== "number") client.send(encode(message));
};

export const handleMessage = async (
  cts: {
    db: Database;
    cookieKey: CryptoKey;
    turnKey: CryptoKey;
  },
  client: ExtendedWebSocket,
  ids: AuthenticationIds,
  data: MessageFromClient & { id: number },
) => {
  // Initial infos
  if (data.type == "getInfos") {
    authorizeMain(ids, async (device, user) => {
      // User
      const userInfos = await getUser(cts.db, user);
      if (!userInfos.success) throw new Error("500");
      sendMessage(client, { type: "user", data: userInfos.message });
      // Devices
      const deviceInfos = await getDevicesDB(cts.db, user, device);
      if (!deviceInfos.success) throw new Error("500");
      sendMessage(client, { type: "devices", data: deviceInfos.message });
      // Contacts
      const contacts = await getContacts(cts.db, user);
      sendMessage(client, { type: "contacts", data: contacts });
    });

    // WebRTC sharing
  } else if (data.type == "getTurnCredentials") {
    authorize(ids, async (AuthIds) => {
      sendMessage(client, {
        id: data.id,
        type: "turnCredentials",
        data: await getTurnCredentials(
          client,
          data.id,
          typeof AuthIds != "number"
            ? AuthIds.device.toString()
            : AuthIds.toString(),
          cts.turnKey,
        ),
      });
    });
  } else if (data.type == "share") {
    authorizeMain(ids, (device) => {
      sendMessage(data.data.did, {
        type: "webRTCData",
        data: {
          from: device,
          data: data.data.data,
        },
      });
    });
  } else if (data.type == "shareFromGuest") {
    authorizeGuest(ids, (guest) => {
      if (
        !get(filetransfers).some(
          (transfer) =>
            transfer.id == data.data.guestTransfer &&
            transfer.did === data.data.did,
        )
      )
        throw new Error("401 Filetransfer not found");
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
    authorizeMain(ids, (device) => {
      sendMessage(client, {
        id: data.id,
        type: "filetransfer",
        data: createTransfer(device),
      });
    });

    // Device
  } else if (data.type == "updateDevice") {
    authorizeMain(ids, (device, user) => {
      updateDevice(cts.db, device, user, data.data.update, data.data.did);
    });
  } else if (data.type == "deleteDevice") {
    authorizeMain(ids, async (device, user) => {
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
    authorizeMain(ids, (device, user) => {
      updateUser(cts.db, user, data.data);
    });

    // Contacts
  } else if (data.type == "deleteContact") {
    authorizeMain(ids, (device, user) => {
      deleteContact(cts.db, user, data.data);
    });
  } else if (data.type == "createContactCode") {
    authorizeMain(ids, async (device, user) => {
      sendMessage(client, {
        id: data.id,
        type: "contactLinkingCode",
        data: await createContactLinkingCode(cts.db, device, user),
      });
    });
  } else if (data.type == "redeemContactCode") {
    authorizeMain(ids, (device, user) => {
      redeemContactLinkingCode(cts.db, user, data.data);
    });
  } else if (data.type == "deleteContactCode") {
    authorizeMain(ids, (device, user) => {
      deleteContactLinkingCode(cts.db, device, user);
    });

    // Device linking code
  } else if (data.type == "createDeviceCode") {
    authorizeMain(ids, async (device, user) => {
      sendMessage(client, {
        id: data.id,
        type: "deviceLinkingCode",
        data: await createDeviceLinkingCode(cts.db, device, user),
      });
    });
  } else if (data.type == "deleteDeviceCode") {
    authorizeMain(ids, (device, user) => {
      deleteDeviceLinkingCode(cts.db, device, user);
    });
  } else throw new Error("404");
};

// Utilities
export const filterOnlineDevices = (
  devices: {
    did: number;
    type: string;
    display_name: string;
  }[],
) => {
  const onlineDevices = [];

  for (const client of clients) {
    const index = devices.findIndex((d) => d.did === client.device);
    if (index !== -1) onlineDevices.push(devices[index]);
  }

  return onlineDevices;
};

// Notify devices
const getDevices = (userIds: number[]) => {
  const connections: ExtendedWebSocket[] = [];

  for (const client of clients) {
    if (client.user !== null && userIds.includes(client.user))
      connections.push(client);
  }

  return connections;
};

export const notifyDevices = async (
  db: Database,
  type: "device" | "user" | "contact",
  uid: number,
  onlyOwnDevices = false,
) => {
  const contacts = await getContacts(db, uid);
  if (!onlyOwnDevices) {
    const foreignDevices = getDevices(contacts.map((c) => c.uid));

    for (const device of foreignDevices) {
      if (device.user === null) break;
      const contacts = await getContacts(db, device.user);
      sendMessage(device, { type: "contacts", data: contacts });
    }
  }

  const devices = getDevices([uid]);
  const user = await getUser(db, uid);
  for (const device of devices) {
    if (device.device === null) break;
    if (type == "device") {
      const deviceInfos = await getDevicesDB(db, uid, device.device);
      if (!deviceInfos.success) throw new Error("500");
      sendMessage(device, { type: "devices", data: deviceInfos.message });
    } else if (type == "contact") {
      sendMessage(device, { type: "contacts", data: contacts });
    } else {
      if (user.success) {
        sendMessage(device, { type: "user", data: user.message });
      }
    }
  }
};
