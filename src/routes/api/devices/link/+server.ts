import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";
import dayjs from "dayjs";
import { z } from "zod";

import { httpAuthorized } from "$lib/server/db";
import { notifyDevices, sendMessage } from "$lib/api/server/main";

export const POST: RequestHandler = async ({ request, cookies }) => {
  const ctx = await httpAuthorized(cookies, false);

  const schema = z.object({
    code: z.string(),
  });

  const update = schema.safeParse(await request.json());

  if (!update.success) error(422, "Wrong data type");

  const code = update.data.code.toUpperCase().replaceAll("O", "0");

  try {
    const response1 = await ctx.database
      .selectFrom("devices_link_codes")
      .select(["uid", "created_did"])
      .where("code", "=", code)
      .where("expires", ">", dayjs().unix())
      .executeTakeFirst();

    if (!response1) error(404, "Invalid code");

    await ctx.database
      .deleteFrom("devices_link_codes")
      .where((eb) =>
        eb.or([eb("code", "=", code), eb("expires", "<=", dayjs().unix())]),
      )
      .execute();

    await ctx.database
      .updateTable("devices")
      .set({ uid: response1.uid, linked_at: dayjs().unix() })
      .where("did", "=", ctx.device)
      .returning("did")
      .executeTakeFirst();

    sendMessage(response1.created_did, {
      type: "deviceCodeRedeemed",
    });
    if (typeof ctx.user === "number")
      notifyDevices(ctx.database, "device", ctx.user);
    return new Response(null, { status: 200 });
  } catch (e: any) {
    error(500, e);
  }
};
