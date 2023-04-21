import { getAuthenticatedDeviceId } from "$lib/server/auth";
import { error, type Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
  if (
    event.url.pathname.startsWith("/api") &&
    !event.url.pathname.startsWith("/api/signup")
  ) {
    if (!event.platform?.env?.DATABASE) {
      throw error(500, "Database not found");
    }
    const db = event.platform.env.DATABASE;
    const id = await getAuthenticatedDeviceId(db, event.cookies);
    if (!id) {
      return new Response("Not authenticated", { status: 401 });
    }
    event.locals.userId = id;
    return await resolve(event);
  }

  return await resolve(event);
}
