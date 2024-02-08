import type { CookieSerializeOptions } from "cookie";
import { get } from "svelte/store";
import type { Cookies } from "@sveltejs/kit";

import { generateKey, sign, verify } from "$lib/server/signing";

import { events } from "./events";
import { guestSecret } from "./stores";

export const loadGuestSecret = async () => {
  let secret = get(guestSecret);
  if (secret === undefined) {
    secret = await generateKey();
    guestSecret.set(secret);
  }
  return secret;
};

export const getGuestID = async (id?: string, signature?: string) => {
  const key = await loadGuestSecret();

  if (id !== undefined && signature !== undefined) {
    if (await verify(id, signature, key)) {
      return parseInt(id);
    }
  }

  return null;
};

export const setGuestID = async (cookies: Cookies) => {
  const key = await loadGuestSecret();
  const id = events().newGuestID().toString();
  const signature = await sign(id, key);
  const cookie_opts: CookieSerializeOptions = {
    path: "/",
    maxAge: 60 * 60 * 24 * 60 * 12 * 10,
  };

  // @ts-ignore
  cookies.set("gid", id, cookie_opts);
  // @ts-ignore
  cookies.set("gid_sig", signature, cookie_opts);
};
