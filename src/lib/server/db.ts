import { ONLINE_STATUS_TIMEOUT } from "$lib/lib/common";
import type { DB, Database } from "$lib/lib/db";
import { error } from "@sveltejs/kit";
import dayjs from "dayjs";
import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";

export function createKysely(platform: App.Platform | undefined): Database {
  if (!platform?.env?.DATABASE) throw error(500, "Database not configured");
  const kys = new Kysely<DB>({
    dialect: new D1Dialect({ database: platform.env.DATABASE }),
  });
  if (!kys) throw error(500, "Database could not be accessed");
  return kys;
}

export async function updateLastSeen(db: Database, uid: number | null, did: number) {
  let res_user: {
    lastSeenAt: number;
  } | undefined;

  if (uid != null) {
    res_user = await db
      .updateTable("users")
      .set({ lastSeenAt: dayjs().unix() })
      .where(({ cmpr }) =>
        cmpr("uid", "=", uid)
      )
      .returning("lastSeenAt")
      .executeTakeFirst();
  }

  const res_device = await db
    .updateTable("devices")
    .set({ lastSeenAt: dayjs().unix() })
    .where(({ cmpr }) =>
      cmpr("did", "=", did)
    )
    .returning("lastSeenAt")
    .executeTakeFirst();

  if (res_user && res_device) return true;
  else return false;
}

// WebSocket server status codes: 0 (Offline | Error), 1 (Online)
// WebSocket client status codes: 0 (Offline), 1 (Online), 2 (Error)
export async function updateOnlineStatus(db: Database, did: number, status: number) {
  const update = { isOnline: status };

  const res = await db
    .updateTable("devices")
    .set(update)
    .where(({ cmpr }) =>
      cmpr("did", "=", did)
    )
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
    .where(({ cmpr }) =>
      cmpr("lastSeenAt", "<", dayjs().unix() - ONLINE_STATUS_TIMEOUT)
    )
    .returning("isOnline")
    .executeTakeFirst();

  if (res) return true;
  else return false;
}