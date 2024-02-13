import type { CookieSerializeOptions } from "cookie";
import { get } from "svelte/store";
import type { Cookies } from "@sveltejs/kit";

import { generateKey, sign, verify } from "$lib/server/signing";

import { guestSecret, guests } from "./stores";

export const loadGuestSecret = async () => {
  let secret = get(guestSecret);
  if (secret === undefined) {
    secret = await generateKey();
    guestSecret.set(secret);
  }
  return secret;
};

const newGuestID = () => {
  let index = get(guests).length;
  if (index === 0) index = 1;

  guests.update((guests) => {
    guests[index] = true;
    return guests;
  });

  return index;
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
  const id = newGuestID().toString();
  const signature = await sign(id, key);
  const cookie_opts: CookieSerializeOptions & { path: string } = {
    path: "/",
    maxAge: 60 * 60 * 24 * 60 * 12 * 10,
  };

  cookies.set("gid", id, cookie_opts);
  cookies.set("gid_sig", signature, cookie_opts);
};
