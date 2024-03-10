import { Kysely, sql, PostgresDialect } from "kysely";
import pkg from "pg";
import { error, type Cookies } from "@sveltejs/kit";

import { env } from "$env/dynamic/private";
import { env as envPublic } from "$env/dynamic/public";
import { DeviceType } from "$lib/lib/common";
import type { DB, Database } from "$lib/lib/db";

import { loadKey, getDeviceID } from "./signing";

const { Pool } = pkg;

export const createConstants = async () => {
  const kys = new Kysely<DB>({
    dialect: new PostgresDialect({
      pool: async () =>
        new Pool({
          database:
            envPublic.PUBLIC_HOSTNAME == "dev.fileplay.me"
              ? "fileplay-dev"
              : "fileplay",
          user: "fileplay",
          password: "fileplay",
          host: "127.0.0.1",
        }),
    }),
  });
  if (!kys) throw new Error("Failed to access database");

  if (env.COOKIE_SIGNING_SECRET === undefined)
    throw new Error("Please define a cookie signing secret.");
  if (env.COTURN_AUTH_SECRET === undefined)
    throw new Error("Please define a coturn auth secret.");

  return {
    db: kys,
    cookieKey: await loadKey(env.COOKIE_SIGNING_SECRET),
    turnKey: await loadKey(env.COTURN_AUTH_SECRET, "SHA-1"),
  };
};

/* If the user parameter is true, an error is thrown if the uid doesn't exist
 */
export const httpAuthorized = async (cookies: Cookies, user = true) => {
  const cts = await createConstants();

  const signature = cookies.get("did_sig");
  const deviceID = cookies.get("did");

  if (signature && deviceID) {
    const signed = await getDeviceID(
      signature,
      deviceID,
      cts.cookieKey,
      cts.db,
    ).catch((e) => error(401, e));

    if (user && !signed.uid) error(401, "No user associated with this device");

    return {
      key: cts.cookieKey,
      database: cts.db,
      device: signed.did,
      user: signed.uid,
    };
  } else {
    error(401, "Missing cookies");
  }
};

export const httpContext = async () => {
  const cts = await createConstants();
  return { key: cts.cookieKey, database: cts.db };
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
    }>`SELECT cid, devices.did, devices.type, devices.display_name FROM (SELECT contacts.cid, users.uid FROM contacts JOIN users ON users.uid = contacts.a WHERE contacts.b = ${uid} UNION SELECT contacts.cid, users.uid FROM contacts JOIN users ON users.uid = contacts.b WHERE contacts.a = ${uid}) AS U JOIN devices ON U.uid = devices.uid ORDER BY devices.display_name`.execute(
      db,
    );

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

export const getUID = async (
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
> => {
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
};

export const getDevices = async (
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
        };
        others: {
          did: number;
          display_name: string;
          type: DeviceType;
          created_at: number;
        }[];
      };
    }
  | {
      success: false;
      message: any;
    }
> => {
  try {
    const d_self = await db
      .selectFrom("devices")
      .select(["did", "type", "display_name", "created_at"])
      .where("did", "=", did)
      .executeTakeFirstOrThrow();

    const d_others = await db
      .selectFrom("devices")
      .select(["did", "type", "display_name", "created_at"])
      .where((eb) => eb("did", "!=", did).and("uid", "=", uid))
      .orderBy("display_name")
      .execute();

    return { success: true, message: { self: d_self, others: d_others } };
  } catch (e: any) {
    return { success: false, message: e };
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
