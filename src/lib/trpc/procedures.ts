import { EventEmitter } from "events";
import { get } from "svelte/store";
import { TRPCError } from "@trpc/server";
import type { Observer } from "@trpc/server/observable";

import { ONLINE_STATUS_TIMEOUT, type DeviceType } from "$lib/lib/common";
import type { Database } from "$lib/lib/db";
import {
  getDevices as getDevicesDB,
  getUser as getUserDB,
  getContacts as getContactsDB,
  updateOnlineStatus,
  getAllDevices,
  updateLastSeen,
  checkOnlineStatus,
} from "$lib/server/db";

import type { Authorized, Guest } from "./context";
import { connections, guests, timers } from "./router";

export const getEventEmitter = (did: number) => {
  if (did < 0) {
    if (get(guests)[Math.abs(did)] === undefined) {
      guests.update((guests) => {
        guests[Math.abs(did)] = new EventEmitter();
        return guests;
      });
    }
    return get(guests)[Math.abs(did)];
  } else {
    if (get(connections)[did] === undefined) {
      connections.update((connections) => {
        connections[did] = new EventEmitter();
        return connections;
      });
    }
    return get(connections)[did];
  }
};

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
  const devices = await getAllDevices(db, uid);
  if (devices.success) {
    devices.message.forEach((device) => {
      if (!device.is_online) return;
      const ee = getEventEmitter(device.did);
      ee.emit(event);
    });
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
        encryption_public_key: string;
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
  await updateLastSeen(ctx.database, ctx.device);
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

export const getWebRTCData = async (
  emit: Observer<{ from: number; data: string }, TRPCError>,
  deviceID: number,
) => {
  const ee = getEventEmitter(deviceID);
  ee.removeAllListeners("webrtc-data");

  const data = async (from: number, data: string) => {
    emit.next({ from, data });
  };

  // Listener
  ee.on("webrtc-data", data);

  return async () => {
    ee.off("webrtc-data", data);
  };
};

export const shareFromGuest = async (
  emit: Observer<
    {
      from: number;
      data: string;
    },
    TRPCError
  >,
  ctx: Guest,
  message: {
    did: number;
    guestTransfer: string;
    data: string;
  },
) => {
  const online = await checkOnlineStatus(ctx.database, message.did);

  if (online.success) {
    getWebRTCData(emit, ctx.guestID * -1);
    getEventEmitter(message.did).emit(
      "webrtc-data",
      ctx.guestID * -1,
      message.data,
    );
  } else {
    emit.error(new TRPCError({ code: "NOT_FOUND" }));
  }
};
