import { Context } from "hono/mod.ts";
import { setCookie } from "hono/helper/cookie/index.ts";

import { cookieOptions } from "./common.ts";
import { sign, verify } from "./signing.ts";
import { guestSecret, guests } from "./values.ts";

const newGuestID = () => {
  let index = guests.length;
  if (index === 0) index = 1;

  guests[index] = true;

  return index;
};

export const getGuestID = async (id?: string, signature?: string) => {
  const key = await guestSecret();

  if (id !== undefined && signature !== undefined) {
    if (await verify(id, signature, key)) {
      return parseInt(id);
    }
  }
};

export const setGuestID = async (c: Context) => {
  const key = await guestSecret();
  const id = newGuestID().toString();
  const signature = await sign(id, key);

  setCookie(c, "gid", id, cookieOptions);
  setCookie(c, "gid_sig", signature, cookieOptions);
};
