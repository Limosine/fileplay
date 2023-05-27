import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async (request) => {
  // get all contacts of this account (requires cookie auth)
}

export const DELETE: RequestHandler = async (request) => {
  // delete a contact on both sides (requires cookie auth)
  // device id in query params
}
