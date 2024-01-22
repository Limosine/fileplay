import { get } from "svelte/store";

import {
  numberToUint8Array,
  typedArrayToBuffer,
  uint8ArrayToNumber,
} from "$lib/lib/utils";
import { concatArrays } from "$lib/sharing/common";

import { connections } from "./simple-peer";

let privateKey: CryptoKey;
export let publicKeyJwk: JsonWebKey;

export const setup = async () => {
  if (!privateKey || !publicKeyJwk) {
    generateKey();
  }
};

const increaseCounter = (key: CryptoKey, did: number, current?: number) => {
  const info = get(connections)[did];
  const counter =
    current !== undefined
      ? current + 1
      : info.encryption !== undefined
        ? info.encryption.counter + 1
        : 1;

  if (info !== undefined) {
    connections.update((connections) => {
      connections[did].encryption = {
        key: info.encryption !== undefined ? info.encryption.key : key,
        counter,
      };
      return connections;
    });
  } else throw new Error("Encryption: No connection to this device");

  return counter;
};

const importKey = (key: JsonWebKey, publicKey: boolean) => {
  return crypto.subtle.importKey(
    "jwk",
    key,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    publicKey ? [] : ["deriveKey"],
  );
};

const generateKey = async () => {
  const key = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"],
  );

  privateKey = key.privateKey;
  publicKeyJwk = await crypto.subtle.exportKey("jwk", key.publicKey);
};

export const getDerivedKey = async (foreignPublicKey: CryptoKey) => {
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: foreignPublicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

export const updateKey = async (did: number, jsonKey: JsonWebKey) => {
  const key = await importKey(jsonKey, true);
  const info = get(connections)[did];

  if (info !== undefined) {
    connections.update((connections) => {
      connections[did].encryption = {
        key,
        counter: info.encryption !== undefined ? info.encryption.counter : 0,
      };
      return connections;
    });
  } else throw new Error("Encryption: No connection to this device");

  get(connections)[did].events.dispatchEvent(new Event("encrypted"));
};

const encryptAes = async (
  data: ArrayBuffer,
  key: CryptoKey,
  counter: number,
) => {
  const random = crypto.getRandomValues(new Uint8Array(8));
  const counterArray = numberToUint8Array(counter);

  const iv = new Uint8Array(random.length + counterArray.length);
  iv.set(random);
  iv.set(counterArray, random.length);

  return {
    data: new Uint8Array(
      await crypto.subtle.encrypt(
        { name: "AES-GCM", iv, additionalData: typedArrayToBuffer(iv) },
        key,
        data,
      ),
    ),
    iv,
  };
};

const decryptAes = async (
  data: ArrayBuffer,
  iv: Uint8Array,
  key: CryptoKey,
) => {
  return new Uint8Array(
    await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: typedArrayToBuffer(iv),
      },
      key,
      data,
    ),
  );
};

export const encryptData = async (array: Uint8Array, did: number) => {
  const info = get(connections)[did];

  if (info === undefined)
    throw new Error("Encryption: No connection to this device");
  if (info.encryption === undefined)
    throw new Error("Encryption: No key found");

  const encrypted = await encryptAes(
    typedArrayToBuffer(array),
    await getDerivedKey(info.encryption.key),
    increaseCounter(info.encryption.key, did),
  );

  return concatArrays([encrypted.iv, encrypted.data]);
};

export const decryptData = async (array: Uint8Array, did: number) => {
  const info = get(connections)[did];

  if (info === undefined)
    throw new Error("Encryption: No connection to this device");
  if (info.encryption === undefined)
    throw new Error("Encryption: No key found");

  const counter = uint8ArrayToNumber(array.slice(8, 12));
  increaseCounter(info.encryption.key, did, counter);

  return await decryptAes(
    typedArrayToBuffer(array.slice(12)),
    array.slice(0, 12),
    await getDerivedKey(info.encryption.key),
  );
};
