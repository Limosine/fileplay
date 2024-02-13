import cookie from "cookie";
import type { IncomingMessage } from "http";
import type { WebSocket } from "ws";

import type { Database } from "$lib/lib/db";
import { getDeviceID } from "$lib/server/signing";
import { sendMessage, type AuthenticationIds } from "$lib/websocket/common";

import { getGuestID } from "./guest";

const getCookie = (req: IncomingMessage, name: string) => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return;
  const cookies = cookie.parse(cookieHeader);
  return cookies[name];
};

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
        const info = await getDeviceID(signature, deviceID, key, db);
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

export const authorize = (
  client: WebSocket,
  ids: AuthenticationIds,
  callback: (ids: { device: number; user: number } | number) => any,
) => {
  if (ids.device !== null && ids.user !== null) {
    callback({ device: ids.device, user: ids.user });
  } else {
    if (ids.guest !== null) callback(ids.guest);
    else sendMessage(client, "error", 401);
  }
};

export const authorizeGuest = (
  client: WebSocket,
  ids: AuthenticationIds,
  callback: (guest: number) => any,
) => {
  if (ids.guest !== null) callback(ids.guest);
  else sendMessage(client, "error", 401);
};

export const authorizeMain = (
  client: WebSocket,
  ids: AuthenticationIds,
  callback: (device: number, user: number) => any,
) => {
  if (ids.device !== null && ids.user !== null) callback(ids.device, ids.user);
  else sendMessage(client, "error", 401);
};
