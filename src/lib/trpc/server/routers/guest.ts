import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { z } from "zod";

import { getTurnCredentials, getWebRTCData } from "../lib/common";
import { shareWebRTCData } from "../lib/guest";
import { guest, router } from "../main";

export const guestRouter = () =>
  router({
    sendHeartbeat: guest.mutation(() => {
      return;
    }),

    getTurnCredentials: guest.query(async (opts) => {
      return getTurnCredentials(
        "guest" + opts.ctx.guest,
        opts.ctx.coturnSecret,
      );
    }),

    getWebRTCData: guest.subscription((opts) => {
      return observable<
        {
          from: number;
          data:
            | { type: "webrtc"; data: Uint8Array }
            | { type: "signal"; data: string };
        },
        TRPCError
      >((emit) => {
        getWebRTCData(emit, opts.ctx.guest * -1);
      });
    }),

    shareWebRTCData: guest
      .input(
        z.object({
          did: z.number(),
          guestTransfer: z.string(),
          data: z
            .object({
              type: z.enum(["webrtc"]),
              data: z.any(),
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
        await shareWebRTCData(opts.ctx, opts.input);
      }),
  });
