import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";
import { z } from "zod";

import { saveSignedDeviceID } from "$lib/server/crypto";
import { httpContext } from "$lib/server/db";
import { DeviceType } from "$lib/lib/common";

export const POST: RequestHandler = async ({ request, cookies }) => {
  const ctx = await httpContext();

  const schema = z.object({
    display_name: z.string(),
    type: z.nativeEnum(DeviceType),
    encryption_public_key: z.string(),
  });

  const update: {
    display_name: string;
    type: DeviceType;
    encryption_public_key: string;
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
      await saveSignedDeviceID(response.did, cookies, ctx.key);

      return new Response(null, { status: 201 });
    } else {
      error(500, "Failed to create device");
    }
  } catch (e: any) {
    error(500, e);
  }
};
