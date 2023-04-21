import {
  genSecretB64,
  hashB64,
} from "$lib/server/auth";
import { error, type RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async ({
  request,
  locals,
  cookies,
  platform,
}) => {
  const json = await request.json();
  if (locals.userId) {
    throw error(400, "Already logged in");
  }
  if (!platform?.env?.DATABASE) {
    throw error(500, "Database not found");
  }
  const db = platform.env.DATABASE;
  const deviceId = genSecretB64();
  const deviceAuth = genSecretB64();
  const deviceAuthHash = await hashB64(deviceAuth);

  const res = await db
    .prepare("INSERT INTO Device (id, userId, authHash) VALUES (?1, ?2, ?3)")
    .bind(deviceId, json.userId, deviceAuthHash)
    .run();

  if (res.changes !== 1) {
    throw error(500, "Failed to create device");
  }

  cookies.set("id", deviceId);
  cookies.set("auth", deviceAuth);

  return new Response("OK", {
    status: 200,
  });
};
