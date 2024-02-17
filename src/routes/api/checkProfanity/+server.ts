import { json, type RequestHandler } from "@sveltejs/kit";

import { isProfane } from "$lib/lib/utils";

export const POST: RequestHandler = async ({ request }) => {
  const username: string = ((await request.json()) as any).username;
  if (!username) return new Response("Missing username!", { status: 400 });
  const res = await isProfane(username);
  return json(res);
};
