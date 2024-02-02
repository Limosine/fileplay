import type { TRPCError } from "@trpc/server";
import type { Observer } from "@trpc/server/observable";

import { sign } from "$lib/server/signing";

import { events } from "./events";

export const getTurnCredentials = async (user: string, key: CryptoKey) => {
  const unixTimeStamp = Math.ceil(Date.now() / 1000) + 12 * 3600; // 12 hours

  const username = [unixTimeStamp, user].join(":");
  const password = await sign(username, key, "base64");

  return {
    username,
    password,
  };
};

export const getWebRTCData = async (
  emit: Observer<
    {
      from: number;
      data:
        | { type: "webrtc"; data: Uint8Array }
        | { type: "signal"; data: string };
    },
    TRPCError
  >,
  deviceID: number,
) => {
  const ee = events().getEventEmitter(deviceID);
  ee.removeAllListeners("webrtc-data");

  const data = async (
    from: number,
    data:
      | { type: "webrtc"; data: Uint8Array }
      | { type: "signal"; data: string },
  ) => {
    emit.next({ from, data });
  };

  // Listener
  ee.on("webrtc-data", data);

  return async () => {
    ee.off("webrtc-data", data);
  };
};
