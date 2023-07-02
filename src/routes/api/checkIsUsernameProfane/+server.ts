import { json, type RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async ({ request }) => {
  const username: string = ((await request.json()) as any).username;
  if (!username) return new Response("Missing username!", { status: 400 });
  const res = await fetch(
    `https://www.purgomalum.com/service/containsprofanity?text=${username}`
  );
  return json({ isProfane: (await res.text()) === "true" });
};
