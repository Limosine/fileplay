import dayjs from "dayjs";
import { nanoid } from "nanoid";
import { get } from "svelte/store";

import {
  type DeviceType,
  LINKING_EXPIRY_TIME,
  LINKING_REFRESH_TIME,
} from "$lib/lib/common";
import type { Database } from "$lib/lib/db";
import {
  getContacts,
  getDevices as getDevicesDB,
  getUser,
} from "$lib/server/db";
import { sendMessage, type ExtendedWebSocket } from "$lib/websocket/common";

import { clients } from "../../../../hooks.server";
import { filetransfers } from "./stores";

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
  if (contacts.success && !onlyOwnDevices) {
    const foreignDevices = getDevices(contacts.message.map((c) => c.uid));

    for (const device of foreignDevices) {
      if (device.user === null) break;
      const contacts = await getContacts(db, device.user);
      if (!contacts.success) throw new Error("500");
      sendMessage(device, { type: "contacts", data: contacts.message });
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
      if (contacts.success) {
        sendMessage(device, { type: "contacts", data: contacts.message });
      }
    } else {
      if (user.success) {
        sendMessage(device, { type: "user", data: user.message });
      }
    }
  }
};

// Contacts
export const deleteContact = async (db: Database, uid: number, cid: number) => {
  try {
    const result = await db
      .deleteFrom("contacts")
      .where((eb) =>
        eb("cid", "=", cid).and(eb("a", "=", uid).or("b", "=", uid)),
      )
      .returning(["a", "b"])
      .executeTakeFirstOrThrow();

    notifyDevices(db, "user", result.a, true);
    notifyDevices(db, "user", result.b, true);
  } catch (e: any) {
    console.log("Error 500: ", e);
    throw new Error("500");
  }
};

// User
export const updateUser = async (
  db: Database,
  uid: number,
  update: {
    display_name?: string;
    avatar_seed?: string;
  },
) => {
  try {
    await db
      .updateTable("users")
      .set(update)
      .where((eb) => eb("uid", "=", uid))
      .executeTakeFirst();

    notifyDevices(db, "user", uid);
  } catch (e: any) {
    console.log("Error 500: ", e);
    throw new Error("500");
  }
};

// Device
export const updateDevice = async (
  db: Database,
  device: number,
  user: number,
  data: {
    display_name?: string;
    type?: DeviceType;
  },
  didParam?: number,
) => {
  try {
    const did = didParam === undefined ? device : didParam;

    await db
      .updateTable("devices")
      .set(data)
      .where((eb) => eb("did", "=", did).and("uid", "=", user))
      .executeTakeFirst();

    notifyDevices(db, "device", user);
  } catch (e: any) {
    console.log("Error 500: ", e);
    throw new Error("500");
  }
};

// Guest
export const createTransfer = (device: number) => {
  let uuid = nanoid();
  const insert = () => {
    if (
      get(filetransfers).find((transfer) => transfer.id == uuid) === undefined
    ) {
      filetransfers.set([...get(filetransfers), { id: uuid, did: device }]);
      setTimeout(() => {
        filetransfers.update((transfers) =>
          transfers.filter((transfer) => transfer.id != uuid),
        );
      }, 3600000);
    } else {
      uuid = nanoid();
      insert();
    }
  };

  insert();

  return uuid;
};

// Linking codes
export const createContactLinkingCode = async (
  db: Database,
  device: number,
  user: number,
) => {
  try {
    let code: string;
    const alphabet = "0123456789ABCDEF";

    do {
      code = "";
      for (let i = 0; i < 6; i++) {
        code += alphabet[Math.floor(Math.random() * alphabet.length)];
      }
    } while (
      await db
        .selectFrom("contacts_link_codes")
        .select("code")
        .where("code", "=", code)
        .executeTakeFirst()
    );

    const expires = dayjs().add(LINKING_EXPIRY_TIME, "millisecond").unix();

    await db
      .deleteFrom("contacts_link_codes")
      .where("uid", "=", user)
      .execute();

    await db
      .insertInto("contacts_link_codes")
      .values({ code, uid: user, expires, created_did: device })
      .returning("code")
      .executeTakeFirst();

    return { code, expires, refresh: LINKING_REFRESH_TIME };
  } catch (e: any) {
    console.log("Error 500: ", e);
    throw new Error("500");
  }
};

export const redeemContactLinkingCode = async (
  db: Database,
  user: number,
  code: string,
) => {
  try {
    const res1 = await db
      .selectFrom("contacts_link_codes")
      .select("uid")
      .where("code", "=", code)
      .where("expires", ">", dayjs().unix())
      .executeTakeFirst();

    if (!res1) throw new Error("400 Invalid code");

    const { uid: uid_b } = res1;

    if (user === uid_b) throw new Error("400 Cannot create contact to self");

    const res2 = await db
      .selectFrom("contacts")
      .select("cid")
      .where("a", "=", user)
      .where("b", "=", uid_b)
      .executeTakeFirst();

    if (res2) throw new Error("400 Contacts already linked");

    await db
      .insertInto("contacts")
      .values({ a: user, b: uid_b })
      .returning("cid")
      .executeTakeFirst();

    notifyDevices(db, "contact", user);
  } catch (e: any) {
    console.log("Error:", e);
    throw new Error("500");
  }
};

export const deleteContactLinkingCode = async (
  db: Database,
  device: number,
  user: number,
) => {
  try {
    await db
      .deleteFrom("contacts_link_codes")
      .where("uid", "=", user)
      .where("created_did", "=", device)
      .returning("uid")
      .executeTakeFirst();
  } catch (e: any) {
    console.log("Error:", e);
    throw new Error("500");
  }
};

export const createDeviceLinkingCode = async (
  db: Database,
  device: number,
  user: number,
) => {
  try {
    let code: string;
    const alphabet = "0123456789ABCDEF";

    do {
      code = "";
      for (let i = 0; i < 6; i++) {
        code += alphabet[Math.floor(Math.random() * alphabet.length)];
      }
    } while (
      await db
        .selectFrom("devices_link_codes")
        .select("code")
        .where("code", "=", code)
        .executeTakeFirst()
    );

    const expires = dayjs().add(LINKING_EXPIRY_TIME, "millisecond").unix();

    await db.deleteFrom("devices_link_codes").where("uid", "=", user).execute();

    await db
      .insertInto("devices_link_codes")
      .values({ code, uid: user, expires, created_did: device })
      .returning("code")
      .executeTakeFirst();

    return { code, expires, refresh: LINKING_REFRESH_TIME };
  } catch (e: any) {
    console.log("Error:", e);
    throw new Error("500");
  }
};

export const deleteDeviceLinkingCode = async (
  db: Database,
  device: number,
  user: number,
) => {
  try {
    await db
      .deleteFrom("devices_link_codes")
      .where("uid", "=", user)
      .where("created_did", "=", device)
      .returning("uid")
      .executeTakeFirst();
  } catch (e: any) {
    console.log("Error:", e);
    throw new Error("500");
  }
};
