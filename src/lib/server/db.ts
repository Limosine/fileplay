import dayjs from "dayjs";
import { Kysely, sql, PostgresDialect } from "kysely";
import pkg from "pg";
import { error, type Cookies } from "@sveltejs/kit";

import { env } from "$env/dynamic/private";
import { loadKey, loadSignedDeviceID } from "./crypto";
import {
  DeviceType,
  LINKING_EXPIRY_TIME,
  LINKING_REFRESH_TIME,
  ONLINE_STATUS_TIMEOUT,
} from "$lib/lib/common";
import type { DB, Database } from "$lib/lib/db";

const { Pool } = pkg;

export function createKysely():
  | {
      success: false;
      message: string;
    }
  | {
      success: true;
      message: Kysely<DB>;
      } {
  const kys = new Kysely<DB>({
    dialect: new PostgresDialect({
      pool: async () =>
        new Pool({
          database: "fileplay",
          user: "fileplay",
          password: "fileplay",
          host: "127.0.0.1",
        }),
    }),
  });

  if (!kys) {
    return { success: false, message: "Database could not be accessed" };
  } else {
    return { success: true, message: kys };
  }
}

/* If the user parameter is true, an error is thrown if the uid doesn't exist
 */
export async function httpAuthorized(cookies: Cookies, user = true) {
  const db = createKysely();
  const key = await loadKey(env.COOKIE_SIGNING_SECRET);
  const signature = cookies.get("did_sig");
  const deviceID = cookies.get("did");

  if (db.success) {
    if (signature && deviceID) {
      const signed = await loadSignedDeviceID(
        signature,
        deviceID,
        key,
        db.message,
      );

      if (signed.success) {
        if (user && !signed.message.uid)
          error(401, "No user associated with this device");

        return {
          key,
          database: db.message,
          device: signed.message.did,
          user: signed.message.uid,
        };
      } else {
        error(401, signed.message);
      }
    } else {
      error(401, "Missing cookies");
    }
  } else {
    error(500, db.message);
  }
}

export async function httpContext() {
  const db = createKysely();
  const key = await loadKey(env.COOKIE_SIGNING_SECRET);

  if (db.success) {
    return { key, database: db.message };
  } else {
    error(500, db.message);
  }
}

export async function updateLastSeen(db: Database, did: number) {
  try {
    const res_device = await db
      .updateTable("devices")
      .set({ last_seen_at: dayjs().unix(), is_online: 1 })
      .where("did", "=", did)
      .returning(["did", "uid"])
      .executeTakeFirst();

    if (!res_device) {
      return { success: false, message: "Device not found" };
    } else {
      return { success: true };
    }
  } catch (e: any) {
    return { success: false, message: e };
  }
}

// WebSocket server status codes: 0 (Offline | Error), 1 (Online)
// WebSocket client status codes: 0 (Offline), 1 (Online), 2 (Error)
export async function updateOnlineStatus(
  db: Database,
  did: number,
  status: number,
) {
  try {
    await db
      .updateTable("devices")
      .set({ is_online: status })
      .where("did", "=", did)
      .executeTakeFirst();

    return { success: true };
  } catch (e: any) {
    return { success: true, message: e };
  }
}

export async function correctOnlineStatus(db: Database) {
  try {
    await db
      .updateTable("devices")
      .set({ is_online: 0 })
      .where("last_seen_at", "<", dayjs().unix() - ONLINE_STATUS_TIMEOUT)
      .executeTakeFirst();

    return { success: true };
  } catch (e: any) {
    return { success: false, message: e };
  }
}

export async function checkOnlineStatus(db: Database, did: number) {
  try {
    const device = await db
      .selectFrom("devices")
      .select(["is_online"])
      .where(eb => eb("did", "=", did).and("is_online", "=", 1).and("last_seen_at", ">", dayjs().unix() - ONLINE_STATUS_TIMEOUT))
      .executeTakeFirst();

    if (device === undefined) {
      return { success: false, message: "404 Device not found" };
    } else {
      return { success: true };
    }

  } catch (e: any) {
    return { success: false, message: e };
  }
}

export async function getDeviceInfos(
  db: Database,
  uid: number,
): Promise<
  | {
      success: true;
      message: {
        cid: number;
        a: number;
        b: number;
        did: number;
        type: string;
        display_name: string;
      }[];
    }
  | {
      success: false;
      message: any;
    }
> {
  try {
    (BigInt.prototype as any).toJSON = function () {
      return this.toString();
    };

    const devices = await sql<{
      cid: number;
      a: number;
      b: number;
      did: number;
      type: string;
      display_name: string;
    }>`SELECT cid, a, b, devices.did, devices.type, devices.display_name FROM (SELECT contacts.cid, contacts.a, contacts.b, users.uid FROM contacts JOIN users ON users.uid = contacts.a WHERE contacts.b = ${uid} UNION SELECT contacts.cid, contacts.a, contacts.b, users.uid FROM contacts JOIN users ON users.uid = contacts.b WHERE contacts.a = ${uid}) AS U JOIN devices ON U.uid = devices.uid WHERE "devices"."is_online" = 1 AND "devices"."last_seen_at" > ${
      dayjs().unix() - ONLINE_STATUS_TIMEOUT
    } ORDER BY devices.display_name`.execute(db);

    return { success: true, message: devices.rows };
  } catch (e: any) {
    return { success: false, message: e };
  }
}

export async function getContacts(
  db: Database,
  uid: number,
): Promise<
  | {
      success: true;
      message: {
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
  | {
      success: false;
      message: any;
    }
> {
  try {
    const contacts: {
      cid: number;
      uid: number;
      display_name: string;
      avatar_seed: string;
      linked_at: number;
      devices?: {
        did: number;
        type: string;
        display_name: string;
      }[];
    }[] = await db
      .selectFrom("contacts")
      .innerJoin("users", "contacts.a", "users.uid")
      .select([
        "contacts.cid",
        "contacts.a as uid",
        "users.display_name",
        "users.avatar_seed",
        "contacts.created_at as linked_at",
      ])
      .where("contacts.b", "=", uid)
      .union(
        db
          .selectFrom("contacts")
          .innerJoin("users", "contacts.b", "users.uid")
          .select([
            "contacts.cid",
            "contacts.b as uid",
            "users.display_name",
            "users.avatar_seed",
            "contacts.created_at as linked_at",
          ])
          .where("contacts.a", "=", uid),
      )
      .orderBy("display_name")
      .execute();

    contacts.forEach((con) => (con.devices = []));

    const devices = await sql<{
      cid?: number;
      did: number;
      type: string;
      display_name: string;
    }>`SELECT cid, devices.did, devices.type, devices.display_name FROM (SELECT contacts.cid, users.uid FROM contacts JOIN users ON users.uid = contacts.a WHERE contacts.b = ${uid} UNION SELECT contacts.cid, users.uid FROM contacts JOIN users ON users.uid = contacts.b WHERE contacts.a = ${uid}) AS U JOIN devices ON U.uid = devices.uid WHERE "devices"."is_online" = 1 AND "devices"."last_seen_at" > ${
      dayjs().unix() - ONLINE_STATUS_TIMEOUT
    } ORDER BY devices.display_name`.execute(db);

    devices.rows.forEach((device) => {
      const contact = contacts.find((con) => con.cid == device.cid);
      delete device.cid;
      if (contact === undefined) return;
      contact.devices?.push(device);
    });

    // @ts-ignore
    return { success: true, message: contacts };
  } catch (e: any) {
    return { success: false, message: e };
  }
}

export async function deleteContact(
  db: Database,
  uid: number,
  cid: number,
): Promise<
  | {
      success: true;
      message: number[];
    }
  | {
      success: false;
      message: any;
    }
> {
  try {
    const result = await db
      .deleteFrom("contacts")
      .where((eb) =>
        eb("cid", "=", cid).and(eb("a", "=", uid).or("b", "=", uid)),
      )
      .returning(["a", "b"])
      .executeTakeFirstOrThrow();

    return { success: true, message: [result.a, result.b] };
  } catch (e: any) {
    return { success: false, message: e };
  }
}

export async function getUID(
  db: Database,
  did: number,
): Promise<
  | {
      success: true;
      message: number | null;
    }
  | {
      success: false;
      message: any;
    }
> {
  try {
    const device = await db
      .selectFrom("devices")
      .select(["did", "uid"])
      .where("did", "=", did)
      .executeTakeFirstOrThrow();

    return { success: true, message: device.uid };
  } catch (e: any) {
    return { success: false, message: e };
  }
}

export async function getDevices(
  db: Database,
  uid: number,
  did: number,
): Promise<
  | {
      success: true;
      message: {
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
  | {
      success: false;
      message: any;
    }
> {
  try {
    const d_self = await db
      .selectFrom("devices")
      .select(["did", "type", "display_name", "created_at", "last_seen_at"])
      .where("did", "=", did)
      .executeTakeFirstOrThrow();

    const d_others = await db
      .selectFrom("devices")
      .select([
        "did",
        "type",
        "display_name",
        "created_at",
        "last_seen_at",
        "is_online",
      ])
      .where((eb) => eb("did", "!=", did).and("uid", "=", uid))
      .orderBy("display_name")
      .execute();

    return { success: true, message: { self: d_self, others: d_others } };
  } catch (e: any) {
    return { success: false, message: e };
  }
}

export async function getAllDevices(
  db: Database,
  uid: number,
): Promise<
  | {
      success: true;
      message: {
        did: number;
        display_name: string;
        is_online: number;
        type: DeviceType;
        created_at: number;
        last_seen_at: number;
      }[];
    }
  | {
      success: false;
      message: any;
    }
> {
  try {
    const devices = await db
      .selectFrom("devices")
      .select([
        "did",
        "type",
        "display_name",
        "created_at",
        "last_seen_at",
        "is_online",
      ])
      .where((eb) => eb("uid", "=", uid))
      .orderBy("display_name")
      .execute();

    return { success: true, message: devices };
  } catch (e: any) {
    return { success: false, message: e };
  }
}

export async function deleteDevice(
  db: Database,
  own_did: number,
  did: number,
  uid: number | null,
) {
  try {
    await db
      .deleteFrom("devices")
      .where((eb) =>
        eb("did", "=", did).and(eb("did", "=", own_did).or("uid", "=", uid)),
      )
      .executeTakeFirst();

    return { success: true };
  } catch (e: any) {
    return { success: false, message: e };
  }
}

export async function updateUser(
  db: Database,
  uid: number,
  update: {
    display_name?: string;
    avatar_seed?: string;
  },
) {
  try {
    await db
      .updateTable("users")
      .set(update)
      .where((eb) => eb("uid", "=", uid))
      .executeTakeFirst();

    return { success: true };
  } catch (e: any) {
    return { success: false, message: e };
  }
}

export async function getUser(
  db: Database,
  uid: number,
): Promise<
  | {
      success: true;
      message: {
        uid: number;
        display_name: string;
        created_at: number;
        avatar_seed: string;
      };
    }
  | {
      success: false;
      message: any;
    }
> {
  try {
    const user = await db
      .selectFrom("users")
      .select(["uid", "display_name", "avatar_seed", "created_at"])
      .where("uid", "=", uid)
      .executeTakeFirstOrThrow();

    return { success: true, message: user };
  } catch (e: any) {
    return { success: false, message: e };
  }
}

export async function updateDevice(
  db: Database,
  uid: number,
  did: number,
  update: {
    display_name?: string;
    type?: DeviceType;
  },
) {
  try {
    await db
      .updateTable("devices")
      .set(update)
      .where((eb) => eb("did", "=", did).and("uid", "=", uid))
      .executeTakeFirst();

    return { success: true };
  } catch (e: any) {
    return { success: false, message: e };
  }
}

export async function createContactLinkingCode(
  db: Database,
  uid: number,
  did: number,
): Promise<
  | {
      success: true;
      message: { code: string; expires: number; refresh: number };
    }
  | {
      success: false;
      message: any;
    }
> {
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

    await db.deleteFrom("contacts_link_codes").where("uid", "=", uid).execute();

    await db
      .insertInto("contacts_link_codes")
      .values({ code, uid, expires, created_did: Number(did) })
      .returning("code")
      .executeTakeFirst();

    return {
      success: true,
      message: { code, expires, refresh: LINKING_REFRESH_TIME },
    };
  } catch (e: any) {
    return { success: false, message: e };
  }
}

export async function redeemContactLinkingCode(
  db: Database,
  uid: number,
  code: string,
) {
  try {
    const res1 = await db
      .selectFrom("contacts_link_codes")
      .select("uid")
      .where("code", "=", code)
      .where("expires", ">", dayjs().unix())
      .executeTakeFirst();

    if (!res1) return { success: false, message: "Invalid code" };

    const { uid: uid_b } = res1;

    if (uid === uid_b)
      return { success: false, message: "Cannot create contact to self" };

    const res2 = await db
      .selectFrom("contacts")
      .select("cid")
      .where("a", "=", uid)
      .where("b", "=", uid_b)
      .executeTakeFirst();

    if (res2) return { success: false, message: "Contacts already linked" };

    await db
      .insertInto("contacts")
      .values({ a: uid, b: uid_b })
      .returning("cid")
      .executeTakeFirst();

    return { success: true };
  } catch (e: any) {
    return { success: false, message: e };
  }
}

export async function deleteContactLinkingCode(
  db: Database,
  did: number,
  uid: number,
) {
  try {
    await db
      .deleteFrom("contacts_link_codes")
      .where("uid", "=", uid)
      .where("created_did", "=", did)
      .returning("uid")
      .executeTakeFirst();

    return { success: true };
  } catch (e: any) {
    return { success: false, message: e };
  }
}

export async function createDeviceLinkingCode(
  db: Database,
  uid: number,
  did: number,
): Promise<
  | {
      success: true;
      message: { code: string; expires: number; refresh: number };
    }
  | {
      success: false;
      message: any;
    }
> {
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

    await db.deleteFrom("devices_link_codes").where("uid", "=", uid).execute();

    await db
      .insertInto("devices_link_codes")
      .values({ code, uid, expires, created_did: did })
      .returning("code")
      .executeTakeFirst();

    return {
      success: true,
      message: { code, expires, refresh: LINKING_REFRESH_TIME },
    };
  } catch (e: any) {
    return { success: false, message: e };
  }
}

export async function deleteDeviceLinkingCode(
  db: Database,
  did: number,
  uid: number,
) {
  try {
    await db
      .deleteFrom("devices_link_codes")
      .where("uid", "=", uid)
      .where("created_did", "=", did)
      .returning("uid")
      .executeTakeFirst();

    return { success: true };
  } catch (e: any) {
    return { success: false, message: e };
  }
}
