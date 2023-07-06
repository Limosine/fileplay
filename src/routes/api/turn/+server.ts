import {
  PRIVATE_TURN_PWD,
  PRIVATE_TURN_URL,
  PRIVATE_TURN_USERNAME,
} from "$env/static/private";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ platform, cookies, request }) => {
  const body = {
    turnUrl: PRIVATE_TURN_URL,
    turnPassword: PRIVATE_TURN_PWD,
    turnUsername: PRIVATE_TURN_USERNAME,
  };
  return json(body, { status: 200 });
};