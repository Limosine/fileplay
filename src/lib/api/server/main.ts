import { encode } from "@msgpack/msgpack";
import { get } from "svelte/store";
import type { WebSocket } from "ws";

import type {
  AuthenticationIds,
  ExtendedWebSocket,
  MessageFromClient,
  MessageFromServer,
} from "$lib/api/common";
import type { Database } from "$lib/lib/db";
import {
  deleteDevice,
  getDevices as getDevicesDB,
  getUser,
} from "$lib/server/db";
import { webPush } from "$lib/server/web-push";

import {
  createContactLinkingCode,
  createDeviceLinkingCode,
  createTransfer,
  deleteContact,
  deleteContactLinkingCode,
  deleteDeviceLinkingCode,
  deleteTransfer,
  getContacts,
  getTurnCredentials,
  redeemContactLinkingCode,
  updateDevice,
  updateUser,
} from "./authorized";
import { authorize, authorizeGuest, authorizeMain } from "./context";
import { clients } from "../../../hooks.server";
import { filetransfers } from "./stores";

// Message handler
export const sendMessage = (
  client: WebSocket | number,
  message: MessageFromServer,
  error = true,
) => {
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
    await authorizeMain(ids, async (device, user) => {
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
    await authorize(ids, async (AuthIds) => {
      sendMessage(client, {
        id: data.id,
        type: "turnCredentials",
        data: await getTurnCredentials(
          typeof AuthIds != "number"
            ? AuthIds.device.toString()
            : AuthIds.toString(),
          cts.turnKey,
        ),
      });
    });
  } else if (data.type == "share") {
    await authorizeMain(ids, (device) => {
      sendMessage(data.data.did, {
        type: "webRTCData",
        data: {
          from: device,
          data: data.data.data,
        },
      });
    });
  } else if (data.type == "shareFromGuest") {
    await authorizeGuest(ids, (guest) => {
      if (
        !get(filetransfers).some(
          (transfer) =>
            transfer.id == data.data.guestTransfer &&
            transfer.did === data.data.did,
        )
      )
        throw new Error("401 Filetransfer not found");
      client.guestTransfer = data.data.guestTransfer;
      sendMessage(data.data.did, {
        type: "webRTCData",
        data: {
          from: guest * -1,
          data: data.data.data,
        },
      });
    });
  } else if (data.type == "sendNotification") {
    await authorizeMain(ids, async (device, user) => {
      const userInfos = await getUser(cts.db, user);
      if (!userInfos.success) throw new Error("500");

      await webPush().sendMessage(cts.db, data.data.uid, {
        username: userInfos.message.display_name,
        avatarSeed: userInfos.message.avatar_seed,
        did: device,
        nid: data.data.id,
        files: data.data.files,
      });
    });

    // Guest
  } else if (data.type == "createTransfer") {
    await authorizeMain(ids, (device) => {
      sendMessage(client, {
        id: data.id,
        type: "filetransfer",
        data: createTransfer(device),
      });
    });
  } else if (data.type == "deleteTransfer") {
    await authorizeMain(ids, (device) => {
      deleteTransfer(device);
    });

    // Device
  } else if (data.type == "updateDevice") {
    await authorizeMain(ids, async (device, user) => {
      await updateDevice(cts.db, device, user, data.data.update, data.data.did);
    });
  } else if (data.type == "deleteDevice") {
    await authorizeMain(ids, async (device, user) => {
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
    await authorizeMain(ids, async (device, user) => {
      await updateUser(cts.db, user, data.data);
    });

    // Contacts
  } else if (data.type == "deleteContact") {
    await authorizeMain(ids, async (device, user) => {
      await deleteContact(cts.db, user, data.data);
    });
  } else if (data.type == "createContactCode") {
    await authorizeMain(ids, async (device, user) => {
      sendMessage(client, {
        id: data.id,
        type: "contactLinkingCode",
        data: await createContactLinkingCode(cts.db, device, user),
      });
    });
  } else if (data.type == "redeemContactCode") {
    await authorizeMain(ids, async (device, user) => {
      await redeemContactLinkingCode(cts.db, user, data.data);
    });
  } else if (data.type == "deleteContactCode") {
    await authorizeMain(ids, async (device, user) => {
      await deleteContactLinkingCode(cts.db, device, user);
    });

    // Device linking code
  } else if (data.type == "createDeviceCode") {
    await authorizeMain(ids, async (device, user) => {
      sendMessage(client, {
        id: data.id,
        type: "deviceLinkingCode",
        data: await createDeviceLinkingCode(cts.db, device, user),
      });
    });
  } else if (data.type == "deleteDeviceCode") {
    await authorizeMain(ids, async (device, user) => {
      await deleteDeviceLinkingCode(cts.db, device, user);
    });
  } else throw new Error("404");
};

// Connections
export const closeGuestConnection = (device: number, transfer: string) => {
  const client = get(filetransfers).find((t) => t.id == transfer);
  if (client !== undefined) {
    sendMessage(
      client.did,
      {
        type: "closeConnection",
        data: device,
      },
      false,
    );
  }
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
    if (typeof client.user == "number" && userIds.includes(client.user))
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
      if (typeof device.user != "number") continue;
      const contacts = await getContacts(db, device.user);
      sendMessage(device, { type: "contacts", data: contacts });
    }
  }

  const devices = getDevices([uid]);
  const user = await getUser(db, uid);
  for (const device of devices) {
    if (typeof device.device != "number") continue;
    if (type == "device") {
      const deviceInfos = await getDevicesDB(db, uid, device.device);
      if (deviceInfos.success)
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
