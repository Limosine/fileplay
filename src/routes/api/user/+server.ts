import type { RequestHandler } from "./$types";

import { httpAuthorized } from "$lib/server/db";
import { notifyDevices } from "$lib/api/server/main";

export const DELETE: RequestHandler = async ({ cookies }) => {
  const ctx = await httpAuthorized(cookies);

  try {
    await ctx.database.transaction().execute(async (trx) => {
      await ctx.database
        .deleteFrom("contacts")
        .where((eb) => eb.or([eb("a", "=", ctx.user), eb("b", "=", ctx.user)]))
        .execute();

      await ctx.database
        .deleteFrom("group_members")
        .where("uid", "=", ctx.user)
        .execute();

      await ctx.database
        .deleteFrom("group_requests")
        .where("uid", "=", ctx.user)
        .execute();

      await notifyDevices(
        ctx.database,
        ctx.user,
        {},
        { contacts: true, groups: true, group_devices: true },
      );

      await ctx.database
        .deleteFrom("users")
        .where("users.uid", "=", ctx.user)
        .execute();
    });

    cookies.delete("did_sig", { path: "/" });
    cookies.delete("did", { path: "/" });
    return new Response(null, { status: 200 });
  } catch (e: any) {
    return new Response(e, { status: 500 });
  }
};
