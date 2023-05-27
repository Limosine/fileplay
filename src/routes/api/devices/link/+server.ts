import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async (request) => {
  // returns an advertisement code that can be redeemed to link a device to the connected user (requires cookie auth)
}

export const POST: RequestHandler = async (request) => {
  // link a device to the user's account by redeeming an advertisement code (requires cookie auth)
}

export const DELETE: RequestHandler = async (request) => {
  // revoke the current advertisement code (also happens after 5 minutes, code is refreshed after 3) (requires cookie auth)
}
