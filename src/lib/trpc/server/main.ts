import { authorizedRouter } from "./routers/authorized";
import { guestRouter } from "./routers/guest";
import { initTRPC } from "@trpc/server";
import type { Context } from "./lib/context";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const open = t.procedure;

export const mainRouter = router({
  authorized: authorizedRouter,
  guest: guestRouter,
});

export type Router = typeof mainRouter;
