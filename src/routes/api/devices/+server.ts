import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";

import { deleteDevice, httpAuthorized } from "$lib/server/db";
import { notifyDevices } from "$lib/trpc/server/lib/authorized";

export const DELETE: RequestHandler = async ({ cookies, url }) => {
  const ctx = await httpAuthorized(cookies, false);

  const did_s = url.searchParams.get("did");
  let did: number;
  if (did_s) did = parseInt(did_s);
  else did = ctx.device;

  if (isNaN(did)) error(422, "Wrong data type");

  try {
    await deleteDevice(ctx.database, ctx.device, did, ctx.user);
  } catch (e: any) {
    error(500, e);
  }

  if (typeof ctx.user === "number")
    notifyDevices(ctx.database, "device", ctx.user);
  return new Response(null, { status: 200 });
};
