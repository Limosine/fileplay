import { json, type RequestHandler } from "@sveltejs/kit";
import { isProfane } from "$lib/server/utils";

export const POST: RequestHandler = async ({request}) => {
  const username: string = (await request.json()).username;
  if (!username) return new Response("Missing username!", { status: 400 });

  return json({ isProfane: isProfane(username) });
};
