import { Context } from "hono/mod.ts";
import { WSContext, WSMessageReceive } from "hono/helper/websocket/index.ts";
import { unpack, pack } from "msgpackr";

import {
  authenticate,
  authorize,
  authorizeGuest,
  authorizeMain,
} from "./auth.ts";
import {
  createContactLinkingCode,
  createDeviceLinkingCode,
  createGroup,
  createGroupRequest,
  createTransfer,
  deleteContact,
  deleteContactLinkingCode,
  deleteDeviceLinkingCode,
  deleteGroupMember,
  deleteTransfer,
  getContacts,
  getDevices,
  getGroupMemberDevices,
  getTurnCredentials,
  redeemContactLinkingCode,
  redeemGroupRequest,
  updateDevice,
  updateUser,
} from "./authorized.ts";
import { EWSContext, isEmpty } from "./common.ts";
import {
  deleteDevice,
  getContacts as getContactsDB,
  getGroupMembers,
  getGroups,
  getUser,
} from "./db.ts";
import { Database } from "./kysely.ts";
import { clients, constants } from "../main.ts";
import { filetransfers } from "./values.ts";
import { webPush } from "./web-push.ts";

import {
  MessageFromClient,
  MessageFromServer,
  messageFromClientSchema,
} from "../../common/api/common.ts";

// Assign client to guests or registered users
const getIds = (
  ws: WSContext,
  url: URL,
  ids: {
    device?: number;
    user?: number;
    guest?: number;
  }
) => {
  const type = url.searchParams.get("type");

  if (type == "main" || type === null) ids.guest = undefined;
  else if (type == "guest") {
    ids.device = undefined;
    ids.user = undefined;
  } else {
    console.log("INFO: Unknown type specified");
    ws.close(1008, "Unauthorized, unknown type specified");
    return false;
  }

  return ids;
};

const getClient = (ws: WSContext) => {
  for (const client of clients) {
    if (ws === client) {
      return client;
    }
  }
};

export const onOpen = async (ws: WSContext, c: Context) => {
  const client: EWSContext = Object.assign(ws, { isAlive: true });

  const ids = getIds(
    ws,
    new URL(c.req.url),
    await authenticate(constants.db, constants.cookieKey, c)
  );

  if (!ids) return;
  else {
    // Fill properties
    Object.assign(client, ids);
  }

  // Check authorization
  if (
    client.guest === undefined &&
    (client.device === undefined || client.user === undefined)
  ) {
    console.log("INFO: Authentication failure");
    return client.close(1008, "Unauthorized");
  }

  // Add to clients
  clients.add(client);

  // Notify devices
  if (client.user !== undefined) deviceStateChanged(constants.db, client.user);
};

export const onMessage = async (ws: WSContext, data: WSMessageReceive) => {
  let decoded: MessageFromClient & { id: number };

  if (typeof data == "string") {
    decoded = JSON.parse(data);
  } else if (data instanceof Blob) {
    decoded = unpack(new Uint8Array(await data.arrayBuffer()));
  } else {
    decoded = unpack(new Uint8Array(data));
  }

  try {
    const client = getClient(ws);
    if (client === undefined) return;

    await handleMessage(
      constants,
      client,
      messageFromClientSchema.parse(decoded)
    );
  } catch (e) {
    sendMessage(
      ws,
      {
        id: decoded.id,
        type: "error",
        data: e instanceof Error ? e.message : e,
      },
      false
    );
  }
};

export const onClose = (ws: WSContext) => {
  const client = getClient(ws);

  if (client !== undefined) {
    clients.delete(client);

    if (client.user !== undefined)
      deviceStateChanged(constants.db, client.user);

    if (client.guest !== undefined && client.guestTransfer !== undefined)
      closeGuestConnection(client.guest * -1, client.guestTransfer);
  }
};

// Utilities

export const sendMessage = (
  ws: WSContext | number,
  message: MessageFromServer & { id?: number },
  error = true
) => {
  if (typeof ws === "number") {
    for (const c of clients) {
      if (ws < 0) {
        if (c.guest === ws * -1) {
          ws = c;
          break;
        }
      } else if (c.device === ws) {
        ws = c;
        break;
      }
    }
    if (typeof ws === "number" && error) throw new Error("404");
  }

  if (typeof ws !== "number") ws.send(pack(message));
};

export const handleMessage = async (
  cts: {
    db: Database;
    cookieKey: CryptoKey;
    turnKey: CryptoKey;
  },
  client: EWSContext,
  data: MessageFromClient & { id: number }
) => {
  // Initial infos
  if (data.type == "getInfos") {
    await authorizeMain(client, async (_, user) => {
      // User
      const userInfos = await getUser(cts.db, user);
      if (userInfos.success)
        sendMessage(client, { type: "user", data: userInfos.message });

      // Contacts
      sendMessage(client, {
        type: "contacts",
        data: await getContacts(cts.db, user),
      });

      // Groups
      const groups = await getGroups(cts.db, user);
      if (groups.success)
        sendMessage(client, { type: "groups", data: groups.message });

      /* Sent via notifyDevices:
       * devices
       * group devices
       */
    });

    // WebRTC sharing
  } else if (data.type == "getTurnCredentials") {
    await authorize(client, async () => {
      sendMessage(client, {
        id: data.id,
        type: "turnCredentials",
        data: await getTurnCredentials(cts.turnKey),
      });
    });
  } else if (data.type == "share") {
    await authorizeMain(client, (device) => {
      sendMessage(data.data.did, {
        type: "webRTCData",
        data: {
          from: device,
          data: data.data.data,
        },
      });
    });
  } else if (data.type == "shareFromGuest") {
    await authorizeGuest(client, (guest) => {
      if (
        !filetransfers.some(
          (transfer) =>
            transfer.id == data.data.guestTransfer &&
            transfer.did === data.data.did
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
  } else if (data.type == "sendNotifications") {
    await authorizeMain(client, async (device, user) => {
      let ids: number[];

      if (data.data.type == "contact") {
        const contacts = await getContactsDB(cts.db, user);
        if (!contacts.success) {
          console.log(contacts.message);
          throw new Error("500");
        }

        for (const contact of data.data.ids) {
          if (!contacts.message.some((c) => c.uid === contact))
            throw new Error("401");
        }

        ids = data.data.ids;
      } else if (data.data.type == "group") {
        const members = await getGroupMembers(cts.db, user, data.data.ids);
        if (!members.success) {
          console.log(members.message);
          throw new Error("500");
        }

        ids = members.message.map((m) => m.uid);
      } else {
        const devices = await getDevices(cts.db, user, device);

        for (const device of data.data.ids) {
          if (!devices.others.some((d) => d.did === device))
            throw new Error("401");
        }

        ids = data.data.ids;
      }

      const userInfos = await getUser(cts.db, user);
      if (!userInfos.success) {
        console.log(userInfos.message);
        throw new Error("500");
      }

      await webPush().sendMessage(
        cts.db,
        data.data.type == "devices" ? "devices" : "users",
        ids,
        {
          username: userInfos.message.display_name,
          avatarSeed: userInfos.message.avatar_seed,
          did: device,
          nid: data.data.nid,
          files: data.data.files,
        }
      );
    });

    // Guest
  } else if (data.type == "createTransfer") {
    await authorizeMain(client, (device) => {
      sendMessage(client, {
        id: data.id,
        type: "filetransfer",
        data: createTransfer(device),
      });
    });
  } else if (data.type == "deleteTransfer") {
    await authorizeMain(client, (device) => {
      deleteTransfer(device);
    });

    // Device
  } else if (data.type == "updateDevice") {
    await authorizeMain(client, async (device, user) => {
      await updateDevice(cts.db, device, user, data.data.update, data.data.did);
    });
  } else if (data.type == "deleteDevice") {
    await authorizeMain(client, async (device, user) => {
      const result = await deleteDevice(
        cts.db,
        device,
        data.data === undefined ? device : data.data,
        user
      );
      if (!result.success) {
        console.log(result.message);
        throw new Error("500");
      }
      deviceStateChanged(cts.db, user);
    });

    // User
  } else if (data.type == "updateUser") {
    await authorizeMain(client, async (_, user) => {
      await updateUser(cts.db, user, data.data);
    });

    // Contacts
  } else if (data.type == "deleteContact") {
    await authorizeMain(client, async (_, user) => {
      await deleteContact(cts.db, user, data.data);
    });
  } else if (data.type == "createContactCode") {
    await authorizeMain(client, async (device, user) => {
      sendMessage(client, {
        id: data.id,
        type: "contactLinkingCode",
        data: await createContactLinkingCode(cts.db, device, user),
      });
    });
  } else if (data.type == "redeemContactCode") {
    await authorizeMain(client, async (_, user) => {
      await redeemContactLinkingCode(cts.db, user, data.data);
    });
  } else if (data.type == "deleteContactCode") {
    await authorizeMain(client, async (device, user) => {
      await deleteContactLinkingCode(cts.db, device, user);
    });

    // Groups
  } else if (data.type == "createGroup") {
    await authorizeMain(client, async (_, user) => {
      await createGroup(cts.db, user, data.data.name, data.data.members);
    });
  } else if (data.type == "createGroupRequest") {
    await authorizeMain(client, async (_, user) => {
      await createGroupRequest(cts.db, data.data.gid, user, data.data.uIds);
    });
  } else if (data.type == "deleteGroupMember") {
    await authorizeMain(client, async (_, user) => {
      await deleteGroupMember(cts.db, data.data.gid, user, data.data.deletion);
    });
  } else if (data.type == "acceptGroupRequest") {
    await authorizeMain(client, async (_, user) => {
      await redeemGroupRequest(cts.db, data.data, user);
    });

    // Device linking code
  } else if (data.type == "createDeviceCode") {
    await authorizeMain(client, async (device, user) => {
      sendMessage(client, {
        id: data.id,
        type: "deviceLinkingCode",
        data: await createDeviceLinkingCode(cts.db, device, user),
      });
    });
  } else if (data.type == "deleteDeviceCode") {
    await authorizeMain(client, async (device, user) => {
      await deleteDeviceLinkingCode(cts.db, device, user);
    });
  } else throw new Error("404");
};

// Connections
export const closeGuestConnection = (device: number, transfer: string) => {
  const client = filetransfers.find((t) => t.id == transfer);
  if (client !== undefined) {
    sendMessage(
      client.did,
      {
        type: "closeConnection",
        data: device,
      },
      false
    );
  }
};

// Utilities
export function filterOnlineDevices<T extends { did: number }>(
  devices: T[]
): T[] {
  const onlineDevices = [];

  for (const client of clients) {
    const index = devices.findIndex((d) => d.did === client.device);
    if (index !== -1) onlineDevices.push(devices[index]);
  }

  return onlineDevices;
}

export function filterOfflineDevices<T extends { did: number }>(
  devices: T[]
): T[] {
  const offlineDevices = devices.slice();

  for (const client of clients) {
    const index = offlineDevices.findIndex((d) => d.did === client.device);
    if (index !== -1) delete offlineDevices[index];
  }

  return offlineDevices;
}

export function markOnlineDevices<T extends { did: number }>(
  devices: T[]
): (T & { online: boolean })[] {
  const onlineDevices = [];

  for (const client of clients) {
    const index = devices.findIndex((d) => d.did === client.device);
    if (index !== -1)
      onlineDevices.push({
        ...devices[index],
        online: true,
      });
  }

  for (const device of devices) {
    if (!onlineDevices.some((d) => d.did === device.did))
      onlineDevices.push({
        ...device,
        online: false,
      });
  }

  return onlineDevices;
}

// Notify devices
const getDevicesByUIds = (userIds: number[]) => {
  const connections: EWSContext[] = [];

  for (const client of clients) {
    if (typeof client.user == "number" && userIds.includes(client.user))
      connections.push(client);
  }

  return connections;
};

export const deviceStateChanged = (db: Database, uid: number) =>
  notifyDevices(
    db,
    uid,
    { devices: true, group_devices: true },
    { contacts: true, group_devices: true }
  );

interface UpdateSelection {
  user?: true;
  devices?: true;
  contacts?: true;
  groups?: number | true;
  group_devices?: number | true;
}

export const notifyDevices = async (
  db: Database,
  uid: number,
  own: UpdateSelection,
  foreign: UpdateSelection
) => {
  const contacts = await getContacts(db, uid);
  const groups = await getGroups(db, uid);

  if (!isEmpty(foreign)) {
    // Notify devices of groups
    const uIds: number[] = [];
    if (groups.success)
      if (
        Object.hasOwn(foreign, "user") ||
        Object.hasOwn(foreign, "devices") ||
        foreign.groups === true ||
        foreign.group_devices === true
      )
        groups.message
          .map((g) => g.members)
          .forEach((m) =>
            uIds.push(...m.filter((u) => u.uid !== uid).map((u) => u.uid))
          );
      else if (foreign.groups !== undefined) {
        const group = groups.message.find((g) => g.gid === foreign.groups);
        if (group !== undefined)
          uIds.push(
            ...group.members.filter((u) => u.uid !== uid).map((u) => u.uid)
          );
      }

    for (const uId of uIds) {
      const deviceSockets = getDevicesByUIds([uId]);
      const user = foreign.user ? await getUser(db, uId) : undefined;
      const groups = foreign.groups ? await getGroups(db, uId) : undefined;
      const groupDevices = foreign.group_devices
        ? await getGroupMemberDevices(db, uId)
        : undefined;

      for (const device of deviceSockets) {
        if (typeof device.device != "number") continue;

        if (user?.success)
          sendMessage(device, { type: "user", data: user.message });

        if (foreign.devices) {
          sendMessage(device, {
            type: "devices",
            data: await getDevices(db, uId, device.device),
          });
        }

        if (groups?.success)
          sendMessage(device, { type: "groups", data: groups.message });

        if (groupDevices !== undefined)
          sendMessage(device, {
            type: "group_devices",
            data: groupDevices.filter((d) => d.did !== device.device),
          });
      }
    }

    // Notify devices of contacts
    for (const uId of contacts.map((c) => c.uid)) {
      const deviceSockets = getDevicesByUIds([uId]);
      const user =
        foreign.user && !uIds.some((id) => id === uId)
          ? await getUser(db, uId)
          : undefined;
      const contacts = foreign.contacts
        ? await getContacts(db, uId)
        : undefined;

      for (const device of deviceSockets) {
        if (typeof device.device != "number") continue;

        if (user?.success)
          sendMessage(device, { type: "user", data: user.message });

        if (foreign.devices && !uIds.some((id) => id === uId)) {
          sendMessage(device, {
            type: "devices",
            data: await getDevices(db, uId, device.device),
          });
        }

        if (contacts) sendMessage(device, { type: "contacts", data: contacts });
      }
    }
  }

  // Notify own devices
  if (!isEmpty(own)) {
    const deviceSockets = getDevicesByUIds([uid]);
    const user = own.user ? await getUser(db, uid) : undefined;
    const contacts = own.contacts ? await getContacts(db, uid) : undefined;
    const groups = own.groups ? await getGroups(db, uid) : undefined;
    const groupDevices = own.group_devices
      ? await getGroupMemberDevices(db, uid)
      : undefined;

    for (const device of deviceSockets) {
      if (typeof device.device != "number") continue;

      if (user?.success)
        sendMessage(device, { type: "user", data: user.message });

      if (own.devices) {
        sendMessage(device, {
          type: "devices",
          data: await getDevices(db, uid, device.device),
        });
      }

      if (contacts) sendMessage(device, { type: "contacts", data: contacts });

      if (groups?.success)
        sendMessage(device, { type: "groups", data: groups.message });

      if (groupDevices !== undefined)
        sendMessage(device, {
          type: "group_devices",
          data: groupDevices.filter((d) => d.did !== device.device),
        });
    }
  }
};
