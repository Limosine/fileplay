import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async (request) => {
  // get all info about the user (requires cookie auth)
};

export const POST: RequestHandler = async (request) => {
  // change user info (requires cookie auth)
};

export const DELETE: RequestHandler = async (request) => {
  // completely remove user and all devices (requires cookie auth)
};
