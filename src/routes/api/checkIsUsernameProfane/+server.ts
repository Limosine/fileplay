import { json, type RequestHandler } from "@sveltejs/kit";
import { isProfane } from "$lib/server/utils";

export const GET: RequestHandler = async ({ url }) => {
  const username = url.searchParams.get("username");
  if (!username) return new Response("Missing username!", { status: 400 });

  const bool = isProfane(username);
  return json({ bool });
};
