import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";
import { z } from "zod";

import { DeviceType } from "$lib/lib/common";
import { httpContext } from "$lib/server/db";
import { setDeviceID } from "$lib/server/signing";
import { loadGuestSecret } from "$lib/websocket/server/guest";

export const POST: RequestHandler = async ({ request, cookies }) => {
  await loadGuestSecret();

  const ctx = await httpContext();

  const schema = z.object({
    display_name: z.string(),
    type: z.nativeEnum(DeviceType),
  });

  const update: {
    display_name: string;
    type: DeviceType;
  } = await request.json();

  if (!schema.safeParse(update).success) {
    error(422, "Wrong data type");
  }

  try {
    const response = await ctx.database
      .insertInto("devices")
      .values(update)
      .returning("did")
      .executeTakeFirst();

    if (response) {
      await setDeviceID(response.did, cookies, ctx.key);

      return new Response(null, { status: 201 });
    } else {
      error(500, "Failed to create device");
    }
  } catch (e: any) {
    error(500, e);
  }
};
