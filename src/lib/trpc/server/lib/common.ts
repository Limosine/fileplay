import EventEmitter from "events";
import { nanoid } from "nanoid";
import { get } from "svelte/store";
import type { TRPCError } from "@trpc/server";
import type { Observer } from "@trpc/server/observable";

import { sign } from "$lib/server/signing";

import { connections, files, guests } from "./stores";

export const getEventEmitter = (did: number) => {
  if (did < 0) {
    if (get(guests)[Math.abs(did)] === undefined) {
      guests.update((guests) => {
        guests[Math.abs(did)] = new EventEmitter();
        return guests;
      });
    }
    return get(guests)[Math.abs(did)];
  } else {
    if (get(connections)[did] === undefined) {
      connections.update((connections) => {
        connections[did] = new EventEmitter();
        return connections;
      });
    }
    return get(connections)[did];
  }
};

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
  const ee = getEventEmitter(deviceID);
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

export const getFile = (id: string, password: string) => {
  const file = get(files).find((file) => file.id == id && file.password == password);

  if (file === undefined) return null;
  else return file.data;
};

export const addFile = (did: number, uid: number, file: Uint8Array) => {
  function generateUUID(uuid?: string) {
    if (
      uuid === undefined ||
      get(files).findIndex((file) => file.id == uuid) !== -1
    ) {
      uuid = nanoid();
      return generateUUID(uuid);
    } else {
      return uuid;
    }
  }

  const uuid = generateUUID();
  const password = nanoid();

  files.update((files) => {
    files.push({
      id: uuid,
      did,
      uid,
      password: nanoid(),
      data: file,
    });

    return files;
  });

  setTimeout(() => {
    files.update((files) => {
      files = files.filter(
        (file) => file.id !== uuid || file.password !== password,
      );

      return files;
    });
  }, 3600000);

  return { id: uuid, password };
};

export const deleteFile = (
  did: number,
  uid: number,
  mode: "one" | "device" | "user",
  id?: string,
) => {
  files.update((files) => {
    if (mode == "one" && id !== undefined)
      files = files.filter((file) => file.did !== did || file.id !== id);
    else if (mode == "device") files = files.filter((file) => file.did !== did);
    else if (mode == "user") files = files.filter((file) => file.uid !== uid);

    return files;
  });
};
