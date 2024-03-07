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
import type { ExtendedWebSocket } from "$lib/api/common";

import { filetransfers } from "./stores";
import { filterOnlineDevices, notifyDevices, sendMessage } from "./main";

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
    const result = await db
      .deleteFrom("contacts")
      .where((eb) =>
        eb.and([
          eb("cid", "=", cid),
          eb.or([eb("a", "=", uid), eb("b", "=", uid)]),
        ]),
      )
      .returning(["a", "b"])
      .executeTakeFirstOrThrow();

    notifyDevices(db, "contact", result.a, true);
    notifyDevices(db, "contact", result.b, true);
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
    push_subscription?: string;
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
      }, 3600000); // 1 hour
    } else {
      uuid = nanoid();
      insert();
    }
  };

  insert();

  return uuid;
};

export const deleteTransfer = (device: number) => {
  filetransfers.update((transfers) =>
    transfers.filter((transfer) => transfer.did !== device),
  );
};

// Turn credentials
export const getTurnCredentials = async (user: string, key: CryptoKey) => {
  const unixTimeStamp = Math.ceil(Date.now() / 1000) + 12 * 3600; // 12 hours

  const username = [unixTimeStamp, user].join(":");
  const password = await sign(username, key, "base64");

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
      .select(["uid", "created_did"])
      .where((eb) =>
        eb.and([eb("code", "=", code), eb("expires", ">", dayjs().unix())]),
      )
      .executeTakeFirst();

    if (!res1) throw new Error("400 Invalid code");

    const { uid: uid_b } = res1;

    if (user === uid_b) throw new Error("400 Cannot create contact to self");

    const res2 = await db
      .selectFrom("contacts")
      .select("cid")
      .where((eb) => eb.and([eb("a", "=", user), eb("b", "=", uid_b)]))
      .executeTakeFirst();

    if (res2) throw new Error("400 Contacts already linked");

    await db
      .deleteFrom("contacts_link_codes")
      .where((eb) =>
        eb.or([eb("code", "=", code), eb("expires", "<=", dayjs().unix())]),
      )
      .execute();

    await db
      .insertInto("contacts")
      .values({ a: user, b: uid_b })
      .returning("cid")
      .executeTakeFirst();

    sendMessage(res1.created_did, {
      type: "contactCodeRedeemed",
    });
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
      .where((eb) =>
        eb.and([eb("uid", "=", user), eb("created_did", "=", device)]),
      )
      .execute();
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
      .execute();

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
      .where((eb) =>
        eb.or([
          eb.and([eb("uid", "=", user), eb("created_did", "=", device)]),
          eb("expires", "<=", dayjs().unix()),
        ]),
      )
      .execute();
  } catch (e: any) {
    console.log("Error:", e);
    throw new Error("500");
  }
};
