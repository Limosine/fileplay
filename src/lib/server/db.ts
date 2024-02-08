import dayjs from "dayjs";
import { Kysely, sql, PostgresDialect } from "kysely";
import pkg from "pg";
import { error, type Cookies } from "@sveltejs/kit";

import { env } from "$env/dynamic/private";
import { ONLINE_STATUS_TIMEOUT } from "$lib/lib/common";
import type { DB, Database } from "$lib/lib/db";

import { loadKey, getDeviceID } from "./signing";

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
export const httpAuthorized = async (cookies: Cookies, user = true) => {
  const db = createKysely();
  if (env.COOKIE_SIGNING_SECRET === undefined)
    throw new Error("Please define a cookie signing secret.");
  const key = await loadKey(env.COOKIE_SIGNING_SECRET);
  const signature = cookies.get("did_sig");
  const deviceID = cookies.get("did");

  if (db.success) {
    if (signature && deviceID) {
      const signed = await getDeviceID(signature, deviceID, key, db.message);

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
};

export const httpContext = async () => {
  const db = createKysely();
  if (env.COOKIE_SIGNING_SECRET === undefined)
    throw new Error("Please define a cookie signing secret.");
  const key = await loadKey(env.COOKIE_SIGNING_SECRET);

  if (db.success) {
    return { key, database: db.message };
  } else {
    error(500, db.message);
  }
};

// WebSocket server status codes: 0 (Offline | Error), 1 (Online)
// WebSocket client status codes: 0 (Offline), 1 (Online), 2 (Error)
export const updateOnlineStatus = async (
  db: Database,
  did: number,
  status: number,
) => {
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
};

export const correctOnlineStatus = async (db: Database) => {
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
};

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

export const getUID = async (db: Database, did: number) => {
  try {
    const device = await db
      .selectFrom("devices")
      .select(["did", "uid"])
      .where("did", "=", did)
      .executeTakeFirstOrThrow();

    return { success: true, message: device.uid };
  } catch (e: any) {
    return { success: true, message: e };
  }
};

export const getDevices = async (db: Database, uid: number, did: number) => {
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
    return { success: true, message: e };
  }
};

export const deleteDevice = async (
  db: Database,
  own_did: number,
  did: number,
  uid: number | null,
) => {
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
};

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
