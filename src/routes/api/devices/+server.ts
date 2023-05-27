import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async (request) => {
  // get all devices linked to this account (requires cookie auth)
}

export const POST: RequestHandler = async (request) => {
  // change device info (requires cookie auth)
  // device id in query params
}

export const DELETE: RequestHandler = async (request) => {
  // delete a device (requires cookie auth)
  // device id in query params
}
