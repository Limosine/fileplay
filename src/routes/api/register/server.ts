import type { Handle } from "@sveltejs/kit";

export const POST: Handle = async ({ request, resolve }) => {
  const body = await request.json();
  const { username, password } = body;
};
