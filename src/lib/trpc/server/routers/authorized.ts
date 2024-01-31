import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { z } from "zod";

import { DeviceType } from "$lib/lib/common";

import {
  createContactLinkingCode,
  createDeviceLinkingCode,
  createTransfer,
  deleteContact,
  deleteContactLinkingCode,
  deleteDevice,
  deleteDeviceLinkingCode,
  getContacts,
  getDevices,
  getUser,
  redeemContactLinkingCode,
  shareWebRTCData,
  startTimer,
  updateDevice,
  updateLastSeen,
  updateUser,
} from "../lib/authorized";
import { getWebRTCData } from "../lib/common";
import { authorized, router } from "../main";

export const authorizedRouter = () =>
  router({
    sendHeartbeat: authorized.mutation(async ({ ctx }) => {
      startTimer(ctx.database, ctx.user, ctx.device);
      await updateLastSeen(ctx);
    }),

    shareWebRTCData: authorized
      .input(
        z.object({
          did: z.number(),
          data: z
            .object({
              type: z.enum(["webrtc"]),
              data: z.instanceof(Uint8Array),
            })
            .or(
              z.object({
                type: z.enum(["signal"]),
                data: z.string(), // SignalData as JSON
              }),
            ),
        }),
      )
      .query(async (opts) => {
        await shareWebRTCData(opts.ctx, opts.input.did, opts.input.data);
      }),

    getWebRTCData: authorized.subscription((opts) => {
      return observable<
        {
          from: number;
          data:
            | { type: "webrtc"; data: Uint8Array }
            | { type: "signal"; data: string };
        },
        TRPCError
      >((emit) => {
        getWebRTCData(emit, opts.ctx.device);
      });
    }),

    createTransfer: authorized.mutation((opts) => {
      return createTransfer(opts.ctx);
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
      .mutation(async (opts) => {
        await updateDevice(opts.ctx, opts.input.update, opts.input.did);
      }),

    deleteDevice: authorized.input(z.number()).mutation(async (opts) => {
      await deleteDevice(opts.ctx, opts.input);
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
        await deleteContact(ctx.database, ctx.user, message);
      }),

    updateUser: authorized
      .input(
        z.object({
          display_name: z.string().optional(),
          avatar_seed: z.string().optional(),
        }),
      )
      .mutation(async ({ input: message, ctx }) => {
        await updateUser(ctx.database, ctx.user, message);
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
      return await createContactLinkingCode(ctx);
    }),

    redeemContactCode: authorized
      .input(z.string())
      .mutation(async ({ input: message, ctx }) => {
        await redeemContactLinkingCode(ctx, message);
      }),

    deleteContactCode: authorized.mutation(async ({ ctx }) => {
      return await deleteContactLinkingCode(ctx);
    }),

    getDeviceCode: authorized.query(async ({ ctx }) => {
      return await createDeviceLinkingCode(ctx);
    }),

    deleteDeviceCode: authorized.mutation(async ({ ctx }) => {
      await deleteDeviceLinkingCode(ctx);
    }),
  });
