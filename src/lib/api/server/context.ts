import cookie from "cookie";
import type { IncomingMessage } from "http";

import type { Database } from "$lib/lib/db";
import { getDeviceID } from "$lib/server/signing";
import { type AuthenticationIds } from "$lib/api/common";

import { getGuestID } from "./guest";

const getCookie = (req: IncomingMessage, name: string) => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return;
  const cookies = cookie.parse(cookieHeader);
  return cookies[name];
};

// Authentication
export const authenticate = async (
  db: Database,
  key: CryptoKey,
  req: IncomingMessage,
) => {
  const getUser = async () => {
    if (req.headers.cookie !== undefined) {
      const signature = getCookie(req, "did_sig");
      const deviceID = getCookie(req, "did");

      if (signature && deviceID) {
        try {
          return await getDeviceID(signature, deviceID, key, db);
        } catch (e: any) {
          undefined;
        }
      }
    }

    return { did: null, uid: null };
  };

  const getGuest = async () => {
    if (req.headers.cookie !== undefined) {
      return await getGuestID(getCookie(req, "gid"), getCookie(req, "gid_sig"));
    }

    return null;
  };

  const { did, uid } = await getUser();
  const gid = await getGuest();

  return {
    device: did,
    user: uid,
    guest: gid,
  };
};

// Authorization
export const authorize = async (
  ids: AuthenticationIds,
  callback: (ids: { device: number; user: number } | number) => any,
) => {
  if (ids.device !== null && ids.user !== null)
    await callback({ device: ids.device, user: ids.user });
  else if (ids.guest !== null) await callback(ids.guest);
  else throw new Error("401");
};

export const authorizeGuest = async (
  ids: AuthenticationIds,
  callback: (guest: number) => any,
) => {
  if (ids.guest !== null) await callback(ids.guest);
  else throw new Error("401");
};

export const authorizeMain = async (
  ids: AuthenticationIds,
  callback: (device: number, user: number) => any,
) => {
  if (ids.device !== null && ids.user !== null)
    await callback(ids.device, ids.user);
  else throw new Error("401");
};
