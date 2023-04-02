import { db } from "$lib/server/db";

export async function GET() {
  let contacts = db.getDummyContacts(100, 0, 100);
  return new Response(JSON.stringify(contacts), { status: 200 });
}

