import { EventEmitter } from "events";
import { nanoid } from "nanoid";
import { get, writable } from "svelte/store";
import { TRPCError, initTRPC } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { z } from "zod";

import { DeviceType } from "$lib/lib/common";
import {
  createContactLinkingCode,
  createDeviceLinkingCode,
  deleteContact,
  deleteContactLinkingCode,
  deleteDevice,
  deleteDeviceLinkingCode,
  getContacts as getContactsDB,
  redeemContactLinkingCode,
  updateDevice,
  updateLastSeen,
  updateUser,
} from "$lib/server/db";
import type { Context } from "$lib/trpc/context";

import {
  getDevices,
  getUser,
  getContacts,
  notifyDevices,
  getEventEmitter,
  notifyOwnDevices,
  startTimer,
  getWebRTCData,
  shareFromGuest,
} from "./procedures";

export const connections = writable<EventEmitter[]>([]);
export const guests = writable<EventEmitter[]>([]);
export const filetransfers = writable<{ id: string; did: number }[]>([]);
export const timers = writable<NodeJS.Timeout[]>([]);

export const t = initTRPC.context<Context>().create();

export const open = t.procedure;

export const authorized = open.use(async (opts) => {
  const { ctx } = opts;
  if (!ctx.user || !ctx.device) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return opts.next({
    ctx: {
      device: ctx.device,
      user: ctx.user,
    },
  });
});

export const guest = open.use(async (opts) => {
  let index: number;
  if (get(guests).length == 0) {
    index = 1;
  } else {
    index = get(guests).length;
  }

  guests.update((guests) => {
    guests[index] = new EventEmitter();
    return guests;
  });
  setTimeout(() => {
    guests.update((guests) => {
      const ee = guests[index];
      ee?.removeAllListeners();
      delete guests[index];
      return guests;
    });
  }, 3600000);

  return opts.next({
    ctx: {
      device: undefined,
      user: undefined,
      guestID: index,
    },
  });
});

export const router = t.router({
  sendHeartbeat: authorized.mutation(async ({ ctx }) => {
    startTimer(ctx.database, ctx.user, ctx.device);
    const result = await updateLastSeen(ctx.database, ctx.device);
    if (!result.success) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return;
  }),

  sendGuestHeartbeat: guest.mutation(() => {
    return;
  }),

  shareWebRTCData: authorized
    .input(
      z.object({
        did: z.number(),
        data: z.string(), // SignalData as JSON
      }),
    )
    .query(async ({ input: message, ctx }) => {
      console.log("Sharing from did " + ctx.device + " to did " + message.did);

      if (message.did >= 0) {
        const contacts = await getContactsDB(ctx.database, ctx.user);
        if (contacts.success) {
          const result = contacts.message.find(
            (contact) =>
              contact.devices.find((device) => device.did === message.did) !==
              undefined,
          );
          if (result === undefined) throw new TRPCError({ code: "NOT_FOUND" });
          getEventEmitter(message.did).emit(
            "webrtc-data",
            ctx.device,
            message.data,
          );
        } else throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      } else {
        const ee = get(guests)[Math.abs(message.did)];
        if (ee === undefined) throw new TRPCError({ code: "NOT_FOUND" });
        ee.emit("webrtc-data", ctx.device, message.data);
      }
    }),

  getWebRTCData: authorized.subscription((opts) => {
    return observable<{ from: number; data: string }, TRPCError>((emit) => {
      getWebRTCData(emit, opts.ctx.device);
    });
  }),

  getFromGuest: guest
    .input(
      z.object({
        did: z.number(),
        guestTransfer: z.string(),
        data: z.string(), // SignalData as JSON
      }),
    )
    .subscription(({ input: message, ctx }) => {
      console.log("Sharing from did " + ctx.guestID + " to did " + message.did);

      return observable<{ from: number; data: string }, TRPCError>((emit) => {
        shareFromGuest(emit, ctx, message);
      });
    }),

  createTransfer: authorized.mutation(({ ctx }) => {
    let uuid = nanoid();
    const insert = () => {
      if (
        get(filetransfers).find((transfer) => transfer.id == uuid) === undefined
      )
        filetransfers.set([
          ...get(filetransfers),
          { id: uuid, did: ctx.device },
        ]);
      else {
        uuid = nanoid();
        insert();
      }
    };

    insert();

    return { success: true, message: uuid };
  }),

  updateDevice: authorized
    .input(
      z.object({
        did: z.number().optional(),
        update: z.object({
          display_name: z.string().optional(),
          type: z.nativeEnum(DeviceType).optional(),
        }),
      }),
    )
    .mutation(async ({ input: message, ctx }) => {
      let did: number;
      if (message.did) did = message.did;
      else did = ctx.device;
      const result = await updateDevice(
        ctx.database,
        ctx.user,
        did,
        message.update,
      );
      if (!result.success)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      notifyDevices(ctx.database, "device", ctx.user);
      return;
    }),

  deleteDevice: authorized
    .input(z.number())
    .mutation(async ({ input: message, ctx }) => {
      const result = await deleteDevice(
        ctx.database,
        ctx.device,
        message,
        ctx.user,
      );
      if (!result.success)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      notifyDevices(ctx.database, "device", ctx.user);
      return;
    }),

  getDevices: authorized.subscription((opts) => {
    return observable<
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
    >((emit) => {
      getDevices(emit, opts.ctx);
    });
  }),

  getContacts: authorized.subscription((opts) => {
    return observable<
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
    >((emit) => {
      getContacts(emit, opts.ctx);
    });
  }),

  deleteContact: authorized
    .input(z.number())
    .mutation(async ({ input: message, ctx }) => {
      const result = await deleteContact(ctx.database, ctx.user, message);
      if (!result.success)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      result.message.forEach((uid) => {
        notifyOwnDevices(ctx.database, "foreignUser", uid);
      });
      return;
    }),

  updateUser: authorized
    .input(
      z.object({
        display_name: z.string().optional(),
        avatar_seed: z.string().optional(),
      }),
    )
    .mutation(async ({ input: message, ctx }) => {
      const result = await updateUser(ctx.database, ctx.user, message);
      if (!result.success)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      notifyDevices(ctx.database, "user", ctx.user);
      return;
    }),

  getUser: authorized.subscription((opts) => {
    return observable<
      {
        uid: number;
        display_name: string;
        created_at: number;
        avatar_seed: string;
      },
      TRPCError
    >((emit) => {
      getUser(emit, opts.ctx);
    });
  }),

  getContactCode: authorized.query(async ({ ctx }) => {
    const code = await createContactLinkingCode(
      ctx.database,
      ctx.user,
      ctx.device,
    );
    if (!code.success) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return code.message;
  }),

  redeemContactCode: authorized
    .input(z.string())
    .mutation(async ({ input: message, ctx }) => {
      const code = await redeemContactLinkingCode(
        ctx.database,
        ctx.user,
        message,
      );
      if (!code.success) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      notifyDevices(ctx.database, "contact", ctx.user);
      return;
    }),

  deleteContactCode: authorized.mutation(async ({ ctx }) => {
    const code = await deleteContactLinkingCode(
      ctx.database,
      ctx.device,
      ctx.user,
    );
    if (!code.success) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return;
  }),

  getDeviceCode: authorized.query(async ({ ctx }) => {
    const code = await createDeviceLinkingCode(
      ctx.database,
      ctx.user,
      ctx.device,
    );
    if (!code.success) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return code.message;
  }),

  deleteDeviceCode: authorized.mutation(async ({ ctx }) => {
    const code = await deleteDeviceLinkingCode(
      ctx.database,
      ctx.device,
      ctx.user,
    );
    if (!code.success) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return;
  }),
});

export type Router = typeof router;
