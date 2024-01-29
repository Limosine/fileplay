import { TRPCError, initTRPC } from "@trpc/server";

import type { Context } from "./lib/context";
import { authorizedRouter } from "./routers/authorized";
import { guestRouter } from "./routers/guest";

const t = initTRPC.context<Context>().create();

export const router = t.router;

export const open = t.procedure;
export const guest = open.use((opts) => {
  const guestID = opts.ctx.guest;

  if (!guestID) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return opts.next({
    ctx: {
      device: undefined,
      user: undefined,
      guest: guestID,
    },
  });
});
export const authorized = open.use((opts) => {
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

export const mainRouter = router({
  authorized: authorizedRouter(),
  guest: guestRouter(),
});

export type Router = typeof mainRouter;
