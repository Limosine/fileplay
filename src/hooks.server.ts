import { getAuthenticatedDeviceId } from "$lib/server/auth";
import type { Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
  if (
    event.url.pathname.startsWith("/api") &&
    !event.url.pathname.startsWith("/api/signup")
  ) {
    const id = await getAuthenticatedDeviceId(event.cookies);
    if (!id) {
      return new Response("Not authenticated", { status: 401 });
    }
    event.locals.userId = id;
    return await resolve(event);
  }

  return await resolve(event);
};
