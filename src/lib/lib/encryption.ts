import {
  numberToUint8Array,
  typedArrayToBuffer,
  uint8ArrayToNumber,
} from "$lib/lib/utils";
import {
  concatArrays,
} from "$lib/sharing/common";

let privateKey: CryptoKey;
export let publicKeyJwk: JsonWebKey;

// key in counter array: ECDH PublicKey
const counters: { key: CryptoKey; did: number; data: number }[] = [];

export const setup = async () => {
  if (!privateKey || !publicKeyJwk) {
    generateKey();
  }
};

const increaseCounter = (key: CryptoKey, did: number, current?: number) => {
  const index = counters.findIndex((c) => c.key == key);

  if (index !== -1) {
    if (current !== undefined) {
      if (current < counters[index].data)
        console.warn("Encryption: Counter too low");
      counters[index].data = current + 1;
      return counters[index].data;
    } else {
      counters[index].data += 1;
      return counters[index].data;
    }
  } else {
    counters.push({
      key,
      did,
      data: 1,
    });

    return 1;
  }
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
  const index = counters.findIndex((c) => c.did === did);

  if (index !== -1) {
    counters[index].key = key;
  } else {
    counters.push({
      did,
      key,
      data: 0,
    });
  }
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

  console.log(`Encryption: Counter ${counter}`);

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
  const info = counters.find((c) => c.did === did);

  if (info === undefined) throw new Error("Encryption: No key found");

  const encrypted = await encryptAes(
    typedArrayToBuffer(array),
    await getDerivedKey(info.key),
    increaseCounter(info.key, did),
  );

  return concatArrays([encrypted.iv, encrypted.data]);
};

export const decryptData = async (array: Uint8Array, did: number) => {
  const info = counters.find((c) => c.did === did);

  if (info === undefined) throw new Error("Encryption: No key found");

  const counter = uint8ArrayToNumber(array.slice(8, 12));
  increaseCounter(info.key, did, counter);

  return await decryptAes(
    typedArrayToBuffer(array.slice(12)),
    array.slice(0, 12),
    await getDerivedKey(info.key),
  );
};
