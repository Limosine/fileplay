import type { RequestHandler } from "./$types";
import dayjs from "dayjs";
import { error } from "@sveltejs/kit";
import { z } from "zod";

import { httpAuthorized } from "$lib/server/db";
import { isProfane } from "$lib/lib/utils";

export const POST: RequestHandler = async ({ cookies, request }) => {
  // create a new user, link to current device (requires cookie auth)
  const ctx = await httpAuthorized(cookies, false);
  if (ctx.user !== null) error(403, "Device already linked to user");

  const schema = z.object({
    display_name: z.string(),
    avatar_seed: z.string(),
  });

  const update: {
    display_name: string;
    avatar_seed: string;
  } = await request.json();

  if (!schema.safeParse(update).success) {
    error(422, "Wrong data type");
  }

  if (await isProfane(update.display_name))
    error(418, "Display name is profane");

  try {
    const response = await ctx.database
      .insertInto("users")
      .values(update)
      .returning("uid")
      .executeTakeFirst();

    if (!response) error(500, "Failed to create user");

    await ctx.database
      .updateTable("devices")
      .set({ uid: response.uid, linked_at: dayjs().unix() })
      .where("did", "=", ctx.device)
      .returning("did")
      .executeTakeFirstOrThrow();

    return new Response(null, { status: 201 });
  } catch (e: any) {
    error(500, e);
  }
};
