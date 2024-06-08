import dayjs from "dayjs";
import { nanoid } from "nanoid";

import type { Database } from "./kysely.ts";
import {
  getContacts as getContactsDB,
  getDevices as getDevicesDB,
  getGroupMemberDevices as getGroupMemberDevicesDB,
} from "./db.ts";
import { sign } from "./signing.ts";
import { filetransfers, setFiletransfers } from "./values.ts";
import {
  filterOnlineDevices,
  markOnlineDevices,
  notifyDevices,
  sendMessage,
} from "./ws.ts";

import {
  DeviceType,
  LINKING_EXPIRY_TIME,
  LINKING_REFRESH_TIME,
} from "../../common/common.ts";

// Contacts
export const getContacts = async (db: Database, uid: number) => {
  const result = await getContactsDB(db, uid);
  if (!result.success) throw new Error("500");

  for (let i = 0; i < result.message.length; i++) {
    result.message[i].devices = filterOnlineDevices(result.message[i].devices);
  }

  return result.message;
};

export const deleteContact = async (
  db: Database,
  ownUid: number,
  uid: number
) => {
  try {
    const result = await db
      .deleteFrom("contacts")
      .where((eb) =>
        eb.or([
          eb.and([eb("a", "=", ownUid), eb("b", "=", uid)]),
          eb.and([eb("a", "=", uid), eb("b", "=", ownUid)]),
        ])
      )
      .returning(["a", "b"])
      .executeTakeFirstOrThrow();

    notifyDevices(db, result.a, { contacts: true }, {});
    notifyDevices(db, result.b, { contacts: true }, {});
  } catch (e) {
    console.log("Error 500: ", e);
    throw new Error("500");
  }
};

// Groups
export const getGroupMemberDevices = async (db: Database, uid: number) => {
  const result = await getGroupMemberDevicesDB(db, uid);
  if (!result.success) throw new Error("500");

  const devices = filterOnlineDevices(result.message);

  return devices;
};

export const createGroup = async (
  db: Database,
  uid: number,
  name: string,
  members: number[]
) => {
  try {
    const gid = await db.transaction().execute(async (trx) => {
      const gid = (
        await trx
          .insertInto("groups")
          .values({ oid: uid, name })
          .returning("gid")
          .executeTakeFirstOrThrow()
      ).gid;

      await trx
        .insertInto("group_members")
        .values({ gid, uid })
        .returning("gid")
        .executeTakeFirst();

      for (const member of [...new Set(members)]) {
        if (member === uid) continue;

        await trx
          .insertInto("group_requests")
          .values({ gid, uid: member })
          .returning("gid")
          .executeTakeFirst();
      }

      return gid;
    });

    notifyDevices(
      db,
      uid,
      { groups: gid, group_devices: gid },
      { groups: gid, group_devices: gid }
    );
  } catch (e) {
    console.log("Error 500: ", e);
    throw new Error("500");
  }
};

export const createGroupRequest = async (
  db: Database,
  gid: number,
  oid: number,
  uIds: number[]
) => {
  try {
    await db.transaction().execute(async (trx) => {
      await trx
        .selectFrom("groups")
        .where((eb) => eb.and([eb("gid", "=", gid), eb("oid", "=", oid)]))
        .executeTakeFirstOrThrow();

      const members = (
        await trx
          .selectFrom("group_members")
          .select("uid")
          .where("gid", "=", gid)
          .execute()
      ).concat(
        await trx
          .selectFrom("group_requests")
          .select("uid")
          .where("gid", "=", gid)
          .execute()
      );

      for (const user of uIds) {
        if (oid === user) throw new Error("Unable to join own group");

        if (members.some((m) => m.uid === user))
          throw new Error("Already member of group");
      }

      for (const user of uIds) {
        await trx
          .insertInto("group_requests")
          .values({ gid, uid: user })
          .executeTakeFirst();
      }
    });

    notifyDevices(db, oid, { groups: gid }, { groups: gid });
  } catch (e) {
    console.log("Error 500: ", e);
    throw new Error("500");
  }
};

export const deleteGroupMember = async (
  db: Database,
  gid: number,
  uid: number,
  deletion?: number
) => {
  try {
    await db.transaction().execute(async (trx) => {
      const owner = (
        await trx
          .selectFrom("groups")
          .select("oid")
          .where("gid", "=", gid)
          .executeTakeFirstOrThrow()
      ).oid;

      if (deletion !== undefined && owner !== uid)
        throw new Error("401 Unauthorized");

      if (owner === uid && deletion === undefined) {
        const members = await trx
          .selectFrom("group_members")
          .select("uid")
          .execute();

        await trx.deleteFrom("groups").where("gid", "=", gid).execute();

        for (const member of members) {
          notifyDevices(
            db,
            member.uid,
            { groups: gid, group_devices: gid },
            {}
          );
        }
      } else {
        await trx
          .deleteFrom("group_requests")
          .where((eb) =>
            eb.and([
              eb("gid", "=", gid),
              eb("uid", "=", deletion === undefined ? uid : deletion),
            ])
          )
          .returning("uid")
          .executeTakeFirst();

        await trx
          .deleteFrom("group_members")
          .where((eb) =>
            eb.and([
              eb("gid", "=", gid),
              eb("uid", "=", deletion === undefined ? uid : deletion),
            ])
          )
          .executeTakeFirst();

        if (deletion === undefined) {
          const members = await trx
            .selectFrom("group_members")
            .select("uid")
            .execute();

          members.push({ uid });

          for (const member of members) {
            notifyDevices(
              db,
              member.uid,
              { groups: gid, group_devices: gid },
              {}
            );
          }
        } else {
          notifyDevices(
            db,
            uid,
            { groups: gid, group_devices: gid },
            { groups: gid, group_devices: gid }
          );
        }
      }
    });
  } catch (e) {
    console.log("Error 500: ", e);
    throw new Error("500");
  }
};

export const redeemGroupRequest = async (
  db: Database,
  gid: number,
  uid: number
) => {
  try {
    await db.transaction().execute(async (trx) => {
      await trx
        .deleteFrom("group_requests")
        .where((eb) => eb.and([eb("gid", "=", gid), eb("uid", "=", uid)]))
        .executeTakeFirstOrThrow();

      await trx
        .insertInto("group_members")
        .values({ gid, uid })
        .executeTakeFirst();
    });

    notifyDevices(
      db,
      uid,
      { groups: gid, group_devices: gid },
      { groups: gid, group_devices: gid }
    );
  } catch (e) {
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
  }
) => {
  try {
    await db
      .updateTable("users")
      .set(update)
      .where((eb) => eb("uid", "=", uid))
      .executeTakeFirst();

    notifyDevices(
      db,
      uid,
      { user: true, groups: true },
      { contacts: true, groups: true }
    );
  } catch (e) {
    console.log("Error 500: ", e);
    throw new Error("500");
  }
};

// Device
export const getDevices = async (db: Database, uid: number, did: number) => {
  const result = await getDevicesDB(db, uid, did);
  if (!result.success) throw new Error("500");

  return {
    ...result.message,
    others: markOnlineDevices(result.message.others),
  };
};

export const updateDevice = async (
  db: Database,
  device: number,
  user: number,
  data: {
    display_name?: string;
    type?: DeviceType;
    push_subscription?: string;
  },
  didParam?: number
) => {
  try {
    const did = didParam === undefined ? device : didParam;

    await db
      .updateTable("devices")
      .set(data)
      .where((eb) => eb("did", "=", did).and("uid", "=", user))
      .executeTakeFirst();

    notifyDevices(
      db,
      user,
      { devices: true },
      { contacts: true, group_devices: true }
    );
  } catch (e) {
    console.log("Error 500: ", e);
    throw new Error("500");
  }
};

// Guest
export const createTransfer = (device: number) => {
  let uuid = nanoid();
  const insert = () => {
    if (filetransfers.find((transfer) => transfer.id == uuid) === undefined) {
      filetransfers.push({ id: uuid, did: device });
      setTimeout(() => {
        setFiletransfers(
          filetransfers.filter((transfer) => transfer.id != uuid)
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
  setFiletransfers(filetransfers.filter((transfer) => transfer.did !== device));
};

// Turn credentials
export const getTurnCredentials = async (key: CryptoKey) => {
  const username = (Math.ceil(Date.now() / 1000) + 12 * 3600).toString(); // 12 hours
  const password = await sign(username, key, "base64");

  return { username, password };
};

// Linking codes
export const createContactLinkingCode = async (
  db: Database,
  device: number,
  user: number
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
  } catch (e) {
    console.log("Error 500: ", e);
    throw new Error("500");
  }
};

export const redeemContactLinkingCode = async (
  db: Database,
  user: number,
  code: string
) => {
  try {
    const res1 = await db
      .selectFrom("contacts_link_codes")
      .select(["uid", "created_did"])
      .where((eb) =>
        eb.and([eb("code", "=", code), eb("expires", ">", dayjs().unix())])
      )
      .executeTakeFirst();

    if (!res1) throw new Error("400 Invalid code");

    const { uid: uid_b } = res1;

    if (user === uid_b) throw new Error("400 Cannot create contact to self");

    const res2 = await db
      .selectFrom("contacts")
      .where((eb) => eb.and([eb("a", "=", user), eb("b", "=", uid_b)]))
      .executeTakeFirst();

    if (res2 !== undefined) throw new Error("400 Contacts already linked");

    await db
      .deleteFrom("contacts_link_codes")
      .where((eb) =>
        eb.or([eb("code", "=", code), eb("expires", "<=", dayjs().unix())])
      )
      .execute();

    await db
      .insertInto("contacts")
      .values({ a: user, b: uid_b })
      .executeTakeFirst();

    sendMessage(res1.created_did, {
      type: "contactCodeRedeemed",
    });

    notifyDevices(db, user, { contacts: true }, {});
    notifyDevices(db, uid_b, { contacts: true }, {});
  } catch (e) {
    console.log("Error:", e);
    throw new Error("500");
  }
};

export const deleteContactLinkingCode = async (
  db: Database,
  device: number,
  user: number
) => {
  try {
    await db
      .deleteFrom("contacts_link_codes")
      .where((eb) =>
        eb.and([eb("uid", "=", user), eb("created_did", "=", device)])
      )
      .execute();
  } catch (e) {
    console.log("Error:", e);
    throw new Error("500");
  }
};

export const createDeviceLinkingCode = async (
  db: Database,
  device: number,
  user: number
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
  } catch (e) {
    console.log("Error:", e);
    throw new Error("500");
  }
};

export const deleteDeviceLinkingCode = async (
  db: Database,
  device: number,
  user: number
) => {
  try {
    await db
      .deleteFrom("devices_link_codes")
      .where((eb) =>
        eb.or([
          eb.and([eb("uid", "=", user), eb("created_did", "=", device)]),
          eb("expires", "<=", dayjs().unix()),
        ])
      )
      .execute();
  } catch (e) {
    console.log("Error:", e);
    throw new Error("500");
  }
};
