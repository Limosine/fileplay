import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { z } from "zod";

import { getWebRTCData } from "../lib/common";
import { shareWebRTCData } from "../lib/guest";
import { guest, router } from "../main";

export const guestRouter = () => router({
  sendHeartbeat: guest.mutation(() => {
    return;
  }),

  getWebRTCData: guest.subscription((opts) => {
    return observable<{ from: number; data: string }, TRPCError>((emit) => {
      getWebRTCData(emit, opts.ctx.guest * -1);
    });
  }),

  shareWebRTCData: guest
    .input(
      z.object({
        did: z.number(),
        guestTransfer: z.string(),
        data: z.string(), // SignalData as JSON
      }),
    )
    .query(async (opts) => {
      await shareWebRTCData(opts.ctx, opts.input);
    }),
});
