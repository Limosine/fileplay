import { createUrqlClient } from "$lib/server/db";
import type { RequestHandler } from "@sveltejs/kit";
import {json} from '@sveltejs/kit'

export const GET: RequestHandler = async (request) => {
  const db = createUrqlClient();
  db.executeMutation()
}
