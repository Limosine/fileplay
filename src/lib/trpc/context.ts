import cookie from "cookie";
import type { IncomingMessage } from "http";
import { TRPCError, type inferAsyncReturnType } from "@trpc/server";
import type { CreateHTTPContextOptions } from "@trpc/server/adapters/standalone";
import type { CreateWSSContextFnOptions } from "@trpc/server/adapters/ws";

import { env } from "$env/dynamic/private";
import type { Database } from "$lib/lib/db";
import { loadKey, loadSignedDeviceID } from "$lib/server/crypto";
import { createKysely } from "$lib/server/db";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function createContext(
  opts: CreateHTTPContextOptions | CreateWSSContextFnOptions,
) {
  const getCookies = (req: IncomingMessage) => {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return {};
    return cookie.parse(cookieHeader);
  };

  const getCookie = (req: IncomingMessage, name: string) => {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return;
    const cookies = cookie.parse(cookieHeader);
    return cookies[name];
  };

  const db = createKysely();
  if (!db.success) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  if (env.COOKIE_SIGNING_SECRET === undefined)
    throw new Error("Please define a cookie signing secret.");
  const key = await loadKey(env.COOKIE_SIGNING_SECRET);

  const getUser = async () => {
    if (opts.req.headers.cookie !== undefined) {
      const signature = getCookie(opts.req, "did_sig");
      const deviceID = getCookie(opts.req, "did");

      if (db.success && signature && deviceID) {
        const info = await loadSignedDeviceID(
          signature,
          deviceID,
          key,
          db.message,
        );
        if (info.success) {
          return {
            did: info.message.did,
            uid: info.message.uid,
          };
        }
      }
    }

    return { did: null, uid: null };
  };

  const { did, uid } = await getUser();

  return {
    getCookies,
    getCookie,
    key,
    database: db.message,
    device: did,
    user: uid,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;

export type Authorized = {
  getCookies: (req: IncomingMessage) => Record<string, string>;
  getCookie: (req: IncomingMessage, name: string) => string | undefined;
  key: CryptoKey;
  database: Database;
  device: number;
  user: number;
};

export type Guest = {
  getCookies: (req: IncomingMessage) => Record<string, string>;
  getCookie: (req: IncomingMessage, name: string) => string | undefined;
  key: CryptoKey;
  database: Database;
  guestID: number;
};
