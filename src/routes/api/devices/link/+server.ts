import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";
import dayjs from "dayjs";
import { z } from "zod";

import { httpAuthorized } from "$lib/server/db";
import { notifyDevices } from "$lib/websocket/server/lib/authorized";

export const POST: RequestHandler = async ({ request, cookies }) => {
  const ctx = await httpAuthorized(cookies, false);

  const schema = z.object({
    code: z.string(),
  });

  const update: {
    code: string;
  } = await request.json();

  if (!schema.safeParse(update).success) {
    error(422, "Wrong data type");
  }

  const code = update.code.toUpperCase().replaceAll("O", "0");

  try {
    const response1 = await ctx.database
      .selectFrom("devices_link_codes")
      .select("uid")
      .where("code", "=", code)
      .where("expires", ">", dayjs().unix())
      .executeTakeFirst();

    if (!response1) error(404, "Invalid code");

    await ctx.database
      .updateTable("devices")
      .set({ uid: response1.uid, linked_at: dayjs().unix() })
      .where("did", "=", ctx.device)
      .returning("did")
      .executeTakeFirst();

    if (typeof ctx.user === "number")
      notifyDevices(ctx.database, "device", ctx.user);
    return new Response(null, { status: 200 });
  } catch (e: any) {
    error(500, e);
  }
};
