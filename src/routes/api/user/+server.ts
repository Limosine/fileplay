import type { RequestHandler } from "./$types";

import { httpAuthorized } from "$lib/server/db";
import { notifyDevices } from "$lib/websocket/server/main";

export const DELETE: RequestHandler = async ({ cookies }) => {
  const ctx = await httpAuthorized(cookies);

  try {
    await ctx.database
      .deleteFrom("devices")
      .where("devices.uid", "=", ctx.user)
      .execute();

    await ctx.database
      .deleteFrom("users")
      .where("uid", "=", ctx.user)
      .execute();

    if (typeof ctx.user === "number")
      notifyDevices(ctx.database, "user", ctx.user);
    cookies.delete("did_sig", { path: "/" });
    cookies.delete("did", { path: "/" });
    return new Response(null, { status: 200 });
  } catch (e: any) {
    return new Response(e, { status: 500 });
  }
};
