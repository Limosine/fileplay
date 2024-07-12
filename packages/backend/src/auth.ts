import { getCookie } from "hono/helper/cookie/index.ts";
import { Context } from "hono/mod.ts";

import { AuthenticationIds, MaybePromise } from "./common.ts";
import { getGuestID } from "./guest.ts";
import { Database } from "./kysely.ts";
import { getDeviceID } from "./signing.ts";

// Authentication
export const authenticate = async (
  db: Database,
  key: CryptoKey,
  c: Context
) => {
  const getUser = async () => {
    const signature = getCookie(c, "did_sig");
    const deviceID = getCookie(c, "did");

    if (signature && deviceID) {
      try {
        return await getDeviceID(signature, deviceID, key, db);
      } catch (e) {
        console.warn("Authentication error:", e);
      }
    }

    return { did: undefined, uid: undefined };
  };

  const { did, uid } = await getUser();
  const gid = await getGuestID(getCookie(c, "gid"), getCookie(c, "gid_sig"));

  return {
    device: did,
    user: uid,
    guest: gid,
  };
};

// Authorization
export const authorize = async (
  ids: AuthenticationIds,
  callback: (
    ids: { device: number; user: number } | number
  ) => MaybePromise<void>
) => {
  if (ids.device !== undefined && ids.user !== undefined)
    await callback({ device: ids.device, user: ids.user });
  else if (ids.guest !== undefined) await callback(ids.guest);
  else throw new Error("401");
};

export const authorizeGuest = async (
  ids: AuthenticationIds,
  callback: (guest: number) => MaybePromise<void>
) => {
  if (ids.guest !== undefined) await callback(ids.guest);
  else throw new Error("401");
};

export const authorizeMain = async (
  ids: AuthenticationIds,
  callback: (device: number, user: number) => MaybePromise<void>
) => {
  if (ids.device !== undefined && ids.user !== undefined)
    await callback(ids.device, ids.user);
  else throw new Error("401");
};
