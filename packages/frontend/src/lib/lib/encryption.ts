import { get } from "svelte/store";

import { numberToUint8Array, typedArrayToBuffer } from "$lib/lib/utils";
import { concatUint8Arrays } from "$lib/sharing/common";

import { peer } from "./p2p";

let privateKey: CryptoKey;
export let publicKeyJwk: JsonWebKey;

export const setup = async () => {
  if ("subtle" in crypto && (!privateKey || !publicKeyJwk)) {
    await generateKey();
  }
};

export const importKey = (key: JsonWebKey, publicKey: boolean) => {
  return crypto.subtle.importKey(
    "jwk",
    key,
    { name: "ECDH", namedCurve: "P-256" },
    true,
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

const encryptAes = async (
  data: ArrayBuffer,
  key: CryptoKey,
  counter: number,
  id: 0 | 1,
) => {
  const random = crypto.getRandomValues(new Uint8Array(7));
  const idArray = numberToUint8Array(id, 1);
  const counterArray = numberToUint8Array(counter);

  const iv = new Uint8Array(
    random.length + idArray.length + counterArray.length,
  );
  iv.set(random);
  iv.set(idArray, random.length);
  iv.set(counterArray, random.length + idArray.length);

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
  const key = get(peer).getKey(did);

  const encrypted = await encryptAes(
    typedArrayToBuffer(array),
    await getDerivedKey(key.data),
    get(peer).increaseCounter(did),
    key.id,
  );

  return concatUint8Arrays([encrypted.iv, encrypted.data]);
};

export const decryptData = async (array: Uint8Array, did: number) => {
  const key = get(peer).getKey(did);

  return await decryptAes(
    typedArrayToBuffer(array.slice(12)),
    array.slice(0, 12),
    await getDerivedKey(key.data),
  );
};
