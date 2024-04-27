import { Kysely, PostgresDialect } from "kysely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
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
      pool: new Pool({
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
export async function httpAuthorized(
  cookies: Cookies,
  user?: true,
): Promise<{
  key: CryptoKey;
  database: Database;
  device: number;
  user: number;
}>;
export async function httpAuthorized(
  cookies: Cookies,
  user: false,
): Promise<{
  key: CryptoKey;
  database: Database;
  device: number;
  user: number | null;
}>;
export async function httpAuthorized(cookies: Cookies, user = true) {
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
}

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
    const contacts_a = await db
      .selectFrom("contacts")
      .innerJoin("users", "contacts.a", "users.uid")
      .select((eb) => [
        "contacts.a as uid",
        "users.display_name",
        "users.avatar_seed",
        "contacts.created_at as linked_at",
        jsonArrayFrom(
          eb
            .selectFrom("devices")
            .select(["did", "type", "display_name"])
            .whereRef("uid", "=", "contacts.a"),
        ).as("devices"),
      ])
      .where("contacts.b", "=", uid)
      .orderBy("display_name")
      .execute();

    const contacts_b = await db
      .selectFrom("contacts")
      .innerJoin("users", "contacts.b", "users.uid")
      .select((eb) => [
        "contacts.b as uid",
        "users.display_name",
        "users.avatar_seed",
        "contacts.created_at as linked_at",
        jsonArrayFrom(
          eb
            .selectFrom("devices")
            .select(["did", "type", "display_name"])
            .whereRef("uid", "=", "contacts.b"),
        ).as("devices"),
      ])
      .where("contacts.a", "=", uid)
      .orderBy("display_name")
      .execute();

    return { success: true, message: contacts_a.concat(contacts_b) };
  } catch (e: any) {
    return { success: false, message: e };
  }
}

export async function getGroupMembers(
  db: Database,
  uid: number,
  gIds: number[],
): Promise<
  | {
      success: true;
      message: {
        mid: number;
        uid: number;
      }[];
    }
  | {
      success: false;
      message: any;
    }
> {
  try {
    if (gIds.length < 1) throw new Error("500");

    for (const gid of gIds) {
      await db
        .selectFrom("group_members")
        .where((eb) => eb.and([eb("gid", "=", gid), eb("uid", "=", uid)]))
        .executeTakeFirstOrThrow();
    }

    return {
      success: true,
      message: await db
        .selectFrom("group_members")
        .select(["mid", "uid"])
        .where("gid", "in", gIds)
        .execute(),
    };
  } catch (e: any) {
    return { success: false, message: e };
  }
}

export async function getGroups(
  db: Database,
  uid: number,
): Promise<
  | {
      success: true;
      message: {
        gid: number;
        oid: number;
        name: string;
        created_at: number;
        members: {
          uid: number;
          joined_at: number;
          display_name: string;
          avatar_seed: string;
        }[];
        requests: {
          uid: number;
          created_at: number;
          display_name: string;
          avatar_seed: string;
        }[];
      }[];
    }
  | {
      success: false;
      message: any;
    }
> {
  try {
    const memberships = (
      await db
        .selectFrom("group_members")
        .select("gid")
        .where("uid", "=", uid)
        .execute()
    ).map((m) => m.gid);

    memberships.push(
      ...(
        await db
          .selectFrom("group_requests")
          .select("gid")
          .where("uid", "=", uid)
          .execute()
      ).map((m) => m.gid),
    );

    return {
      success: true,
      message:
        memberships.length < 1
          ? []
          : await db
              .selectFrom("groups")
              .select((eb) => [
                "gid",
                "oid",
                "name",
                "created_at",
                jsonArrayFrom(
                  eb
                    .selectFrom("group_members")
                    .innerJoin("users", "group_members.uid", "users.uid")
                    .select([
                      "group_members.uid",
                      "joined_at",
                      "users.display_name",
                      "users.avatar_seed",
                    ])
                    .whereRef("gid", "=", "groups.gid"),
                ).as("members"),
                jsonArrayFrom(
                  eb
                    .selectFrom("group_requests")
                    .innerJoin("users", "group_requests.uid", "users.uid")
                    .select([
                      "group_requests.uid",
                      "group_requests.created_at",
                      "users.display_name",
                      "users.avatar_seed",
                    ])
                    .whereRef("gid", "=", "groups.gid"),
                ).as("requests"),
              ])
              .where("gid", "in", memberships)
              .execute(),
    };
  } catch (e: any) {
    return { success: false, message: e };
  }
}

export async function getGroupMemberDevices(
  db: Database,
  uid: number,
): Promise<
  | {
      success: true;
      message: {
        gid: number;
        display_name: string;
        did: number;
        type: DeviceType;
      }[];
    }
  | {
      success: false;
      message: any;
    }
> {
  try {
    const memberships = (
      await db
        .selectFrom("group_members")
        .select("gid")
        .where("uid", "=", uid)
        .execute()
    ).map((m) => m.gid);

    return {
      success: true,
      message:
        memberships.length < 1
          ? []
          : await db
              .selectFrom("devices")
              .innerJoin("group_members", "devices.uid", "group_members.uid")
              .select(["group_members.gid", "did", "type", "display_name"])
              .where("group_members.gid", "in", memberships)
              .execute(),
    };
  } catch (e: any) {
    return { success: false, message: e };
  }
}

export const getUid = async (
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
