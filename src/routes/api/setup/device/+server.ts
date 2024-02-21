import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";
import { z } from "zod";

import { DeviceType } from "$lib/lib/common";
import { httpContext } from "$lib/server/db";
import { setDeviceID } from "$lib/server/signing";

export const POST: RequestHandler = async ({ request, cookies }) => {
  const ctx = await httpContext();

  const schema = z.object({
    display_name: z.string(),
    type: z.nativeEnum(DeviceType),
  });

  console.log(request);

  const update = schema.safeParse(await request.json());

  if (!update.success) error(422, "Wrong data type");

  try {
    const response = await ctx.database
      .insertInto("devices")
      .values(update.data)
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
