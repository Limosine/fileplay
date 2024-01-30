import {
  numberToUint8Array,
  typedArrayToBuffer,
  uint8ArrayToNumber,
} from "$lib/lib/utils";
import { concatArrays } from "$lib/sharing/common";

import { peer } from "./simple-peer";

let privateKey: CryptoKey;
export let publicKeyJwk: JsonWebKey;

export const setup = async () => {
  if (!privateKey || !publicKeyJwk) {
    generateKey();
  }
};

const increaseCounter = (did: number, current?: number) => {
  let counter = peer().getCounter(did);

  if (current !== undefined) {
    counter = current + 1;
  } else if (counter !== null) {
    counter++;
  } else {
    counter = 1;
  }

  peer().setCounter(did, counter);

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

const getDerivedKey = async (foreignPublicKey: CryptoKey) => {
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
  peer().setKey(did, key);
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
  const key = peer().getKey(did);

  const encrypted = await encryptAes(
    typedArrayToBuffer(array),
    await getDerivedKey(key),
    increaseCounter(did),
  );

  return concatArrays([encrypted.iv, encrypted.data]);
};

export const decryptData = async (array: Uint8Array, did: number) => {
  const key = peer().getKey(did);

  const counter = uint8ArrayToNumber(array.slice(8, 12));
  increaseCounter(did, counter);

  return await decryptAes(
    typedArrayToBuffer(array.slice(12)),
    array.slice(0, 12),
    await getDerivedKey(key),
  );
};
