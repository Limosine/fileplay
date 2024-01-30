import dayjs from "dayjs";
import { nanoid } from "nanoid";
import { get } from "svelte/store";
import { TRPCError } from "@trpc/server";
import type { Observer } from "@trpc/server/observable";

import {
  ONLINE_STATUS_TIMEOUT,
  type DeviceType,
  LINKING_EXPIRY_TIME,
  LINKING_REFRESH_TIME,
} from "$lib/lib/common";
import type { Database } from "$lib/lib/db";
import {
  deleteDevice as deleteDeviceDB,
  getDevices as getDevicesDB,
  getUser as getUserDB,
  getContacts as getContactsDB,
  updateOnlineStatus,
} from "$lib/server/db";

import { getEventEmitter } from "./common";
import type { Authorized } from "./context";
import { filetransfers, guests, timers } from "./stores";

export const startTimer = (db: Database, uid: number, did: number) => {
  timers.update((timers) => {
    if (timers[did] !== undefined) clearTimeout(timers[did]);
    timers[did] = setTimeout(async () => {
      await updateOnlineStatus(db, did, 0);
      notifyDevices(db, "contact", uid);
    }, ONLINE_STATUS_TIMEOUT * 1000);
    return timers;
  });
};

export const removeTimer = (did: number) => {
  timers.update((timers) => {
    if (timers[did] !== undefined) {
      clearTimeout(timers[did]);
      delete timers[did];
    }
    return timers;
  });
};

export const notifyOwnDevices = async (
  db: Database,
  event: string,
  uid: number,
) => {
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

    devices.forEach((device) => {
      if (!device.is_online) return;
      const ee = getEventEmitter(device.did);
      ee.emit(event);
    });
  } catch (e: any) {
    console.log("Error:", e);
  }
};

export const notifyDevices = async (
  db: Database,
  type: "device" | "user" | "contact",
  uid: number,
) => {
  const contacts = await getContactsDB(db, uid);
  if (contacts.success) {
    contacts.message.forEach((contact) => {
      contact.devices.forEach((device) => {
        const ee = getEventEmitter(device.did);
        ee.emit("foreignUser");
      });
    });
  }

  if (type == "device") notifyOwnDevices(db, "ownDevice", uid);
  else if (type == "contact") notifyOwnDevices(db, "foreignUser", uid);
  else notifyOwnDevices(db, "ownUser", uid);
};

export async function updateLastSeen(ctx: Authorized) {
  try {
    const res_device = await ctx.database
      .updateTable("devices")
      .set({ last_seen_at: dayjs().unix(), is_online: 1 })
      .where("did", "=", ctx.device)
      .returning(["did", "uid"])
      .executeTakeFirst();

    if (!res_device) throw new TRPCError({ code: "NOT_FOUND" });
  } catch (e: any) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: e });
  }
}

export const getDevices = async (
  emit: Observer<
    {
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
    },
    TRPCError
  >,
  ctx: Authorized,
) => {
  const ee = getEventEmitter(ctx.device);
  ee.removeAllListeners("ownDevice");

  const ownDevice = async () => {
    const devices = await getDevicesDB(ctx.database, ctx.user, ctx.device);
    if (devices.success) {
      emit.next(devices.message);
    }
  };

  // Initial state
  ownDevice();

  // Listener
  ee.on("ownDevice", ownDevice);

  return async () => {
    ee.off("ownDevice", ownDevice);
  };
};

export const deleteDevice = async (ctx: Authorized, did: number) => {
  const result = await deleteDeviceDB(ctx.database, ctx.device, did, ctx.user);
  if (!result.success) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  notifyDevices(ctx.database, "device", ctx.user);
};

export const getUser = async (
  emit: Observer<
    {
      uid: number;
      display_name: string;
      created_at: number;
      avatar_seed: string;
    },
    TRPCError
  >,
  ctx: Authorized,
) => {
  const ee = getEventEmitter(ctx.device);
  ee.removeAllListeners("ownUser");

  const ownUser = async () => {
    const user = await getUserDB(ctx.database, ctx.user);
    if (user.success) {
      emit.next(user.message);
    }
  };

  // Initial state
  ownUser();

  // Listener
  ee.on("ownUser", ownUser);

  return async () => {
    ee.off("ownUser", ownUser);
  };
};

export const getContacts = async (
  emit: Observer<
    {
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
    }[],
    TRPCError
  >,
  ctx: Authorized,
) => {
  const ee = getEventEmitter(ctx.device);
  ee.removeAllListeners("foreignUser");

  const foreignUser = async () => {
    const contacts = await getContactsDB(ctx.database, ctx.user);
    if (contacts.success) {
      emit.next(contacts.message);
    }
  };

  // Initial state
  removeTimer(ctx.device);
  await updateLastSeen(ctx);
  foreignUser();

  // Listener
  ee.on("foreignUser", foreignUser);
  notifyDevices(ctx.database, "contact", ctx.user);

  return async () => {
    await updateOnlineStatus(ctx.database, ctx.device, 0);
    notifyDevices(ctx.database, "contact", ctx.user);
    ee.off("foreignUser", foreignUser);
  };
};

// Contacts
export async function deleteContact(db: Database, uid: number, cid: number) {
  try {
    const result = await db
      .deleteFrom("contacts")
      .where((eb) =>
        eb("cid", "=", cid).and(eb("a", "=", uid).or("b", "=", uid)),
      )
      .returning(["a", "b"])
      .executeTakeFirstOrThrow();

    notifyOwnDevices(db, "foreignUser", result.a);
    notifyOwnDevices(db, "foreignUser", result.b);
  } catch (e: any) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: e });
  }
}

// User
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

    notifyDevices(db, "user", uid);
  } catch (e: any) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: e });
  }
}

// Device
export async function updateDevice(
  ctx: Authorized,
  data: {
    display_name?: string;
    type?: DeviceType;
  },
  didParam?: number,
) {
  try {
    const did = didParam === undefined ? ctx.device : didParam;

    await ctx.database
      .updateTable("devices")
      .set(data)
      .where((eb) => eb("did", "=", did).and("uid", "=", ctx.user))
      .executeTakeFirst();

    notifyDevices(ctx.database, "device", ctx.user);
  } catch (e: any) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: e });
  }
}

export const shareWebRTCData = async (
  ctx: Authorized,
  did: number,
  data: string,
) => {
  if (did >= 0) {
    const contacts = await getContactsDB(ctx.database, ctx.user);
    if (contacts.success) {
      const result = contacts.message.find(
        (contact) =>
          contact.devices.find((device) => device.did === did) !== undefined,
      );
      if (result === undefined) throw new TRPCError({ code: "NOT_FOUND" });
      getEventEmitter(did).emit("webrtc-data", ctx.device, data);
    } else throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  } else {
    const ee = get(guests)[Math.abs(did)];
    if (ee === undefined) throw new TRPCError({ code: "NOT_FOUND" });
    ee.emit("webrtc-data", ctx.device, data);
  }
};

// Guest
export function createTransfer(ctx: Authorized) {
  let uuid = nanoid();
  const insert = () => {
    if (
      get(filetransfers).find((transfer) => transfer.id == uuid) === undefined
    ) {
      filetransfers.set([...get(filetransfers), { id: uuid, did: ctx.device }]);
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
}

// Linking codes
export async function createContactLinkingCode(ctx: Authorized) {
  try {
    let code: string;
    const alphabet = "0123456789ABCDEF";

    do {
      code = "";
      for (let i = 0; i < 6; i++) {
        code += alphabet[Math.floor(Math.random() * alphabet.length)];
      }
    } while (
      await ctx.database
        .selectFrom("contacts_link_codes")
        .select("code")
        .where("code", "=", code)
        .executeTakeFirst()
    );

    const expires = dayjs().add(LINKING_EXPIRY_TIME, "millisecond").unix();

    await ctx.database
      .deleteFrom("contacts_link_codes")
      .where("uid", "=", ctx.user)
      .execute();

    await ctx.database
      .insertInto("contacts_link_codes")
      .values({ code, uid: ctx.user, expires, created_did: ctx.device })
      .returning("code")
      .executeTakeFirst();

    return { code, expires, refresh: LINKING_REFRESH_TIME };
  } catch (e: any) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: e });
  }
}

export async function redeemContactLinkingCode(ctx: Authorized, code: string) {
  try {
    const res1 = await ctx.database
      .selectFrom("contacts_link_codes")
      .select("uid")
      .where("code", "=", code)
      .where("expires", ">", dayjs().unix())
      .executeTakeFirst();

    if (!res1)
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid code" });

    const { uid: uid_b } = res1;

    if (ctx.user === uid_b)
      new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot create contact to self",
      });

    const res2 = await ctx.database
      .selectFrom("contacts")
      .select("cid")
      .where("a", "=", ctx.user)
      .where("b", "=", uid_b)
      .executeTakeFirst();

    if (res2)
      new TRPCError({
        code: "BAD_REQUEST",
        message: "Contacts already linked",
      });

    await ctx.database
      .insertInto("contacts")
      .values({ a: ctx.user, b: uid_b })
      .returning("cid")
      .executeTakeFirst();

    notifyDevices(ctx.database, "contact", ctx.user);
  } catch (e: any) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: e });
  }
}

export async function deleteContactLinkingCode(ctx: Authorized) {
  try {
    await ctx.database
      .deleteFrom("contacts_link_codes")
      .where("uid", "=", ctx.user)
      .where("created_did", "=", ctx.device)
      .returning("uid")
      .executeTakeFirst();
  } catch (e: any) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: e });
  }
}

export async function createDeviceLinkingCode(ctx: Authorized) {
  try {
    let code: string;
    const alphabet = "0123456789ABCDEF";

    do {
      code = "";
      for (let i = 0; i < 6; i++) {
        code += alphabet[Math.floor(Math.random() * alphabet.length)];
      }
    } while (
      await ctx.database
        .selectFrom("devices_link_codes")
        .select("code")
        .where("code", "=", code)
        .executeTakeFirst()
    );

    const expires = dayjs().add(LINKING_EXPIRY_TIME, "millisecond").unix();

    await ctx.database
      .deleteFrom("devices_link_codes")
      .where("uid", "=", ctx.user)
      .execute();

    await ctx.database
      .insertInto("devices_link_codes")
      .values({ code, uid: ctx.user, expires, created_did: ctx.device })
      .returning("code")
      .executeTakeFirst();

    return { code, expires, refresh: LINKING_REFRESH_TIME };
  } catch (e: any) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: e });
  }
}

export async function deleteDeviceLinkingCode(ctx: Authorized) {
  try {
    await ctx.database
      .deleteFrom("devices_link_codes")
      .where("uid", "=", ctx.user)
      .where("created_did", "=", ctx.device)
      .returning("uid")
      .executeTakeFirst();
  } catch (e: any) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: e });
  }
}
