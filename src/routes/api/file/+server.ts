import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";
import { z } from "zod";

import { httpAuthorized } from "$lib/server/db";
import { addFile, deleteFile, getFile } from "$lib/trpc/server/lib/common";

export const GET: RequestHandler = async ({ request }) => {
  const schema = z.object({
    id: z.string(),
    password: z.string(),
  });

  const data = schema.safeParse(await request.json());

  if (!data.success) {
    error(422, "Wrong data type");
  }

  const file = getFile(data.data.id, data.data.password);

  if (file !== null) {
    return new Response(file, { status: 200 });
  } else {
    error(404, "File not found");
  }
};

export const POST: RequestHandler = async ({ cookies, request }) => {
  const ctx = await httpAuthorized(cookies);

  const schema = z.object({
    data: z.any(),
  });

  const data = schema.safeParse(Object.fromEntries(await request.formData()));

  if (!data.success) {
    error(422, "Wrong data type");
  }

  // @ts-ignore
  const properties = addFile(ctx.device, ctx.user, data.data);

  return new Response(JSON.stringify(properties), { status: 201 });
};

export const DELETE: RequestHandler = async ({ cookies, request }) => {
  const ctx = await httpAuthorized(cookies);

  const schema = z.object({
    mode: z
      .enum(["one"])
      .or(z.enum(["device"]))
      .or(z.enum(["user"])),
    id: z.string().optional(),
  });

  const data = schema.safeParse(await request.json());

  if (!data.success) {
    error(422, "Wrong data type");
  }

  // @ts-ignore
  deleteFile(ctx.device, ctx.user, data.data.mode, data.data.id);

  return new Response(null, { status: 200 });
};
