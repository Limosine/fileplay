import type { RequestHandler } from "./$types";

import { getGuestID, setGuestID } from "$lib/trpc/server/lib/guest";

export const POST: RequestHandler = async ({ cookies }) => {
  if ((await getGuestID(cookies.get("gid"), cookies.get("gid_sig"))) !== null) {
    return new Response(null, { status: 200 });
  }

  await setGuestID(cookies);

  return new Response(null, { status: 201 });
};
