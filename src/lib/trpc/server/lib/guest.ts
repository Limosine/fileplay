import type { CookieSerializeOptions } from "cookie";
import dayjs from "dayjs";
import EventEmitter from "events";
import { get } from "svelte/store";
import type { Cookies } from "@sveltejs/kit";
import { TRPCError } from "@trpc/server";

import { ONLINE_STATUS_TIMEOUT } from "$lib/lib/common";
import { generateKey, sign, verify } from "$lib/server/signing";

import { getEventEmitter } from "./common";
import type { Guest } from "./context";
import { filetransfers, guestSecret, guests } from "./stores";

export const loadGuestSecret = async () => {
  let secret = get(guestSecret);
  if (secret === undefined) {
    secret = await generateKey();
    guestSecret.set(secret);
  }
  return secret;
};

const getNewGuestID = () => {
  const index = get(guests).length + 1;

  guests.update((guests) => {
    guests[index] = new EventEmitter();
    return guests;
  });

  return index;
};

export async function getGuestID(id?: string, signature?: string) {
  const key = await loadGuestSecret();

  if (id !== undefined && signature !== undefined) {
    if (await verify(id, signature, key)) {
      return parseInt(id);
    }
  }

  return null;
}

export async function setGuestID(cookies: Cookies) {
  const key = await loadGuestSecret();
  const id = getNewGuestID().toString();
  const signature = await sign(id, key);
  const cookie_opts: CookieSerializeOptions = {
    path: "/",
    maxAge: 60 * 60 * 24 * 60 * 12 * 10,
  };

  // @ts-ignore
  cookies.set("gid", id, cookie_opts);
  // @ts-ignore
  cookies.set("gid_sig", signature, cookie_opts);
}

export const shareWebRTCData = async (
  ctx: Guest,
  message: {
    did: number;
    guestTransfer: string;
    data: string;
  },
) => {
  try {
    const device = await ctx.database
      .selectFrom("devices")
      .select(["is_online"])
      .where((eb) =>
        eb("did", "=", message.did)
          .and("is_online", "=", 1)
          .and("last_seen_at", ">", dayjs().unix() - ONLINE_STATUS_TIMEOUT),
      )
      .executeTakeFirst();

    const transfer = get(filetransfers).find(
      (transfer) =>
        transfer.id == message.guestTransfer && transfer.did === message.did,
    );

    if (device !== undefined && transfer !== undefined) {
      getEventEmitter(message.did).emit(
        "webrtc-data",
        ctx.guest * -1,
        message.data,
      );
    } else {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
  } catch (e: any) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: e });
  }
};
