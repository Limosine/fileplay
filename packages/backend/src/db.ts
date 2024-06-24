import { Context, HTTPException } from "hono/mod.ts";
import { getCookie } from "hono/helper/cookie/index.ts";
import { Kysely } from "kysely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { PostgresJSDialect } from "kysely-postgres-js";
import postgres from "postgres";

import { DB, Database } from "./kysely.ts";
import { loadKey, getDeviceID } from "./signing.ts";

import { DeviceType } from "../../common/common.ts";
import { constants } from "../main.ts";

export const createConstants = async () => {
  const postgresPath = Deno.env.get("POSTGRES_PATH");
  const signingSecret = Deno.env.get("COOKIE_SIGNING_SECRET");
  const authSecret = Deno.env.get("COTURN_AUTH_SECRET");

  if (postgresPath === undefined)
    throw new Error("Please define a postgres path.");
  if (signingSecret === undefined)
    throw new Error("Please define a cookie signing secret.");
  if (authSecret === undefined)
    throw new Error("Please define a coturn auth secret.");

  const kys = new Kysely<DB>({
    dialect: new PostgresJSDialect({
      postgres: postgres(postgresPath),
    }),
  });
  if (!kys) throw new Error("Failed to access database");

  return {
    db: kys,
    cookieKey: await loadKey(signingSecret),
    turnKey: await loadKey(authSecret, "SHA-1"),
  };
};

/* If the user parameter is true, an error is thrown if the uid doesn't exist
 */
export async function httpAuthorized(
  c: Context,
  user?: true
): Promise<{
  key: CryptoKey;
  database: Database;
  device: number;
  user: number;
}>;
export async function httpAuthorized(
  c: Context,
  user: false
): Promise<{
  key: CryptoKey;
  database: Database;
  device: number;
  user: number | undefined;
}>;
export async function httpAuthorized(c: Context, user = true) {
  const signature = getCookie(c, "did_sig");
  const deviceID = getCookie(c, "did");

  if (signature && deviceID) {
    const signed = await getDeviceID(
      signature,
      deviceID,
      constants.cookieKey,
      constants.db
    ).catch((e) => {
      throw new HTTPException(401, { message: e });
    });

    if (user && !signed.uid)
      throw new HTTPException(401, {
        message: "No user associated with this device",
      });

    return {
      key: constants.cookieKey,
      database: constants.db,
      device: signed.did,
      user: signed.uid,
    };
  } else {
    throw new HTTPException(401, { message: "Missing cookies" });
  }
}

export const httpContext = () => {
  return { key: constants.cookieKey, database: constants.db };
};

export async function getContacts(
  db: Database,
  uid: number
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
      message: unknown;
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
            .whereRef("uid", "=", "contacts.a")
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
            .whereRef("uid", "=", "contacts.b")
        ).as("devices"),
      ])
      .where("contacts.a", "=", uid)
      .orderBy("display_name")
      .execute();

    return { success: true, message: contacts_a.concat(contacts_b) };
  } catch (e) {
    return { success: false, message: e };
  }
}

export async function getGroupMembers(
  db: Database,
  uid: number,
  gIds: number[]
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
      message: unknown;
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
  } catch (e) {
    return { success: false, message: e };
  }
}

export async function getGroups(
  db: Database,
  uid: number
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
      message: unknown;
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
      ).map((m) => m.gid)
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
                    .whereRef("gid", "=", "groups.gid")
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
                    .whereRef("gid", "=", "groups.gid")
                ).as("requests"),
              ])
              .where("gid", "in", memberships)
              .execute(),
    };
  } catch (e) {
    return { success: false, message: e };
  }
}

export async function getGroupMemberDevices(
  db: Database,
  uid: number
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
      message: unknown;
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
  } catch (e) {
    return { success: false, message: e };
  }
}

export const getSalt = async (
  db: Database,
  did: number
): Promise<
  | {
      success: true;
      message: string;
    }
  | {
      success: false;
      message: unknown;
    }
> => {
  try {
    const device = await db
      .selectFrom("devices")
      .select("salt")
      .where("did", "=", did)
      .executeTakeFirstOrThrow();

    return {
      success: true,
      message: device.salt,
    };
  } catch (e) {
    return { success: false, message: e };
  }
};

export const getUid = async (
  db: Database,
  did: number
): Promise<
  | {
      success: true;
      message: number | undefined;
    }
  | {
      success: false;
      message: unknown;
    }
> => {
  try {
    const device = await db
      .selectFrom("devices")
      .select(["did", "uid"])
      .where("did", "=", did)
      .executeTakeFirstOrThrow();

    return {
      success: true,
      message: device.uid === null ? undefined : device.uid,
    };
  } catch (e) {
    return { success: false, message: e };
  }
};

export const getDevices = async (
  db: Database,
  uid: number,
  did: number
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
      message: unknown;
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
  } catch (e) {
    return { success: false, message: e };
  }
};

export const deleteDevice = async (
  db: Database,
  own_did: number,
  did: number,
  uid: number | undefined
) => {
  try {
    await db
      .deleteFrom("devices")
      .where((eb) =>
        eb("did", "=", did).and(
          eb("did", "=", own_did).or("uid", "=", uid === undefined ? null : uid)
        )
      )
      .executeTakeFirst();

    return { success: true };
  } catch (e) {
    return { success: false, message: e };
  }
};

export async function getUser(
  db: Database,
  uid: number
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
      message: unknown;
    }
> {
  try {
    const user = await db
      .selectFrom("users")
      .select(["uid", "display_name", "avatar_seed", "created_at"])
      .where("uid", "=", uid)
      .executeTakeFirstOrThrow();

    return { success: true, message: user };
  } catch (e) {
    return { success: false, message: e };
  }
}

export function getInfos(db: Database):
  | Promise<{
      success: true;
      message: {
        users: number;
        devices: number;
      };
    }>
  | {
      success: false;
      message: unknown;
    } {
  try {
    return db.transaction().execute(async (trx) => {
      const users = await trx.selectFrom("users").select("uid").execute();
      const devices = await trx.selectFrom("devices").select("did").execute();

      return {
        success: true,
        message: {
          users: users.length,
          devices: devices.length,
        },
      };
    });
  } catch (e) {
    return { success: false, message: e };
  }
}
