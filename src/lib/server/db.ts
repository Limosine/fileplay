import { DeviceType, ONLINE_STATUS_TIMEOUT } from "$lib/lib/common";
import type { DB, Database } from "$lib/lib/db";
import { error } from "@sveltejs/kit";
import dayjs from "dayjs";
import { Kysely, sql } from "kysely";
import { D1Dialect } from "kysely-d1";

export function createKysely(platform: App.Platform | undefined): Database {
  if (!platform?.env?.DATABASE) error(500, "Database not configured");
  const kys = new Kysely<DB>({
    dialect: new D1Dialect({ database: platform.env.DATABASE }),
  });
  if (!kys) error(500, "Database could not be accessed");
  return kys;
}

export async function updateLastSeen(db: Database, did: number) {
  const res_device = await db
    .updateTable("devices")
    .set({ lastSeenAt: dayjs().unix(), isOnline: 1 })
    .where("did", "=", did)
    .returning(["did", "uid"])
    .executeTakeFirst();

  if (!res_device) error(401, "Device not found");

  if (res_device.uid != null) {
    await db
      .updateTable("users")
      .set({ lastSeenAt: dayjs().unix(), isOnline: 1 })
      .where("uid", "=", res_device.uid)
      .returning("uid")
      .executeTakeFirst();
  }

  return { did: res_device.did, uid: res_device.uid };
}

// WebSocket server status codes: 0 (Offline | Error), 1 (Online)
// WebSocket client status codes: 0 (Offline), 1 (Online), 2 (Error)
export async function updateOnlineStatus(
  db: Database,
  did: number,
  status: number,
) {
  const update = { isOnline: status };

  const res = await db
    .updateTable("devices")
    .set(update)
    .where("did", "=", did)
    .returning("isOnline")
    .executeTakeFirst();

  if (res) return true;
  else return false;
}

export async function correctOnlineStatus(db: Database) {
  const offline = { isOnline: 0 };

  const res = await db
    .updateTable("devices")
    .set(offline)
    .where("lastSeenAt", "<", dayjs().unix() - ONLINE_STATUS_TIMEOUT)
    .returning("isOnline")
    .executeTakeFirst();

  if (res) return true;
  else return false;
}

export async function getDeviceInfos(db: Database, uid: number) {
  try {
    (BigInt.prototype as any).toJSON = function () {
      return this.toString();
    };

    const devices = await sql<
      {
        cid: number;
        did: number;
        type: string;
        displayName: string;
        webRTCOffer: string;
        webRTCAnswer: string;
        encryptionPublicKey: string;
      }[]
    >`SELECT "cid", "devices"."did", "devices"."type", "devices"."displayName", "devices"."webRTCOffer", "devices"."webRTCAnswer", "devices"."encryptionPublicKey" FROM (SELECT "contacts"."cid", "users"."uid" FROM "contacts" INNER JOIN "users" ON "users"."uid" = "contacts"."a" WHERE "contacts"."b" = ${uid} UNION SELECT "contacts"."cid", "users"."uid" FROM "contacts" INNER JOIN "users" ON "users"."uid" = "contacts"."b" WHERE "contacts"."a" = ${uid}) AS U INNER JOIN "devices" ON "U".uid = "devices"."uid" WHERE "devices"."isOnline" = 1 AND "devices"."lastSeenAt" > ${
      dayjs().unix() - ONLINE_STATUS_TIMEOUT
    } ORDER BY "devices"."displayName"`.execute(db);

    return { success: true, response: devices.rows };
  } catch (e: any) {
    return { success: false, response: e };
  }
}

export async function getContacts(db: Database, uid: number) {
  try {
    const contacts = await db
      .selectFrom("contacts")
      .innerJoin("users", "contacts.a", "users.uid")
      .select([
        "contacts.cid",
        "users.displayName",
        "users.avatarSeed",
        "contacts.createdAt as linkedAt",
        "users.lastSeenAt",
      ])
      .where("contacts.b", "=", uid)
      .union(
        db
          .selectFrom("contacts")
          .innerJoin("users", "contacts.b", "users.uid")
          .select([
            "contacts.cid",
            "users.displayName",
            "users.avatarSeed",
            "contacts.createdAt as linkedAt",
            "users.lastSeenAt",
          ])
          .where("contacts.a", "=", uid),
      )
      .orderBy("displayName")
      .execute();

    return { success: true, response: contacts };
  } catch (e: any) {
    return { success: false, response: e };
  }
}

export async function getDevices(db: Database, uid: number, did: number) {
  try {
    const d_self = await db
      .selectFrom("devices")
      .select(["did", "type", "displayName", "createdAt", "lastSeenAt"])
      .where("did", "=", did)
      .executeTakeFirstOrThrow();

    const d_others = await db
      .selectFrom("devices")
      .select(["did", "type", "displayName", "createdAt", "lastSeenAt"])
      .where((eb) => eb("did", "!=", did).and("uid", "=", uid))
      .orderBy("displayName")
      .execute();

    return { success: true, response: { self: d_self, others: d_others } };
  } catch (e: any) {
    return { success: false, response: e };
  }
}

export async function getUser(db: Database, uid: number) {
  try {
    const user = await db
      .selectFrom("users")
      .select(["uid", "displayName", "avatarSeed", "createdAt", "lastSeenAt"])
      .where("uid", "=", uid)
      .executeTakeFirstOrThrow();

    return { success: true, response: user };
  } catch (e: any) {
    return { success: false, response: e };
  }
}

export async function updateDevice(
  db: Database,
  uid: number,
  did: number,
  update: {
    displayName?: string,
    type?: DeviceType,
    webRTCOffer?: string,
    webRTCAnswer?: string,
  }) {
  try {
    await db
      .updateTable("devices")
      .set(update)
      .where((eb) =>
        eb("did", "=", did).and("uid", "=", uid),
      )
      .returning("did")
      .executeTakeFirst();

    return { success: true };
  } catch (e: any) {
    return { success: false, response: e };
  }
}
