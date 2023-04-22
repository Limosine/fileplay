import {
  genSecretB64,
  hashB64,
} from "$lib/server/auth";
import { v4 as uuidv4 } from "uuid";
import { neode } from "$lib/server/db";
import { error, type RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async ({
  request,
  locals,
  cookies,
}) => {
  if (locals.userId) {
    throw error(400, "Already logged in");
  }
  const deviceId = uuidv4();
  const deviceAuth = genSecretB64();
  const deviceAuthHash = await hashB64(deviceAuth);

  const device = await neode.create("Device", {
    id: deviceId,
    authHash: deviceAuthHash,
  });

  cookies.set("id", deviceId);
  cookies.set("auth", deviceAuth);

  return new Response("OK", {
    status: 200,
  });
};
