import dayjs from "dayjs";
import { nanoid } from "nanoid";
import { get } from "svelte/store";

import {
  type DeviceType,
  LINKING_EXPIRY_TIME,
  LINKING_REFRESH_TIME,
} from "$lib/lib/common";
import type { Database } from "$lib/lib/db";
import { getContacts as getContactsDB } from "$lib/server/db";
import { sign } from "$lib/server/signing";
import type { ExtendedWebSocket } from "$lib/websocket/common";

import { filetransfers } from "./stores";
import { filterOnlineDevices, notifyDevices } from "./main";

// Contacts
export const getContacts = async (db: Database, uid: number) => {
  const result = await getContactsDB(db, uid);
  if (!result.success) throw new Error("500");

  for (let i = 0; i < result.message.length; i++) {
    result.message[i].devices = filterOnlineDevices(result.message[i].devices);
  }

  return result.message;
};

export const deleteContact = async (db: Database, uid: number, cid: number) => {
  try {
    await db
      .deleteFrom("contacts")
      .where((eb) =>
        eb("cid", "=", cid).and(eb("a", "=", uid).or("b", "=", uid)),
      )
      .returning(["a", "b"])
      .executeTakeFirstOrThrow();

    notifyDevices(db, "contact", uid);
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

// Turn credentials
export const getTurnCredentials = async (
  client: ExtendedWebSocket,
  id: number,
  user: string,
  key: CryptoKey,
) => {
  const unixTimeStamp = Math.ceil(Date.now() / 1000) + 12 * 3600; // 12 hours

  const username = [unixTimeStamp, user].join(":");
  const password = await sign(username, key, "base64");

  console.log("Credentials:", username, password);

  return { username, password };
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
