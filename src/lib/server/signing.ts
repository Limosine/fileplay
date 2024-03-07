import type { CookieSerializeOptions } from "cookie";
import { error, type Cookies } from "@sveltejs/kit";

import type { Database } from "$lib/lib/db";
import { arrayBufferToHex, hexToArrayBuffer } from "$lib/lib/utils";

import { getUID } from "./db";

export const setDeviceID = async (
  did: number,
  cookies: Cookies,
  key: CryptoKey,
) => {
  const id = did.toString();
  const signature = await sign(id, key);
  const cookie_opts: CookieSerializeOptions = {
    path: "/",
    maxAge: 60 * 60 * 24 * 60 * 12 * 10,
  };
  // @ts-ignore
  cookies.set("did", id, cookie_opts);
  // @ts-ignore
  cookies.set("did_sig", signature, cookie_opts);
};

export async function getDeviceID(
  signature: string,
  did_s: string,
  key: CryptoKey,
  db: Database,
) {
  if (!did_s || !signature) throw new Error("Not authenticated");
  if (!(await verify(did_s, signature, key)))
    throw new Error("Wrong authentication signature");

  const did = parseInt(did_s);
  const uid = await getUID(db, did);

  if (!uid.success) throw new Error(uid.message);
  else return { did, uid: uid.message };
}

export const sign = async (
  data: string,
  key: CryptoKey,
  output: BufferEncoding = "hex",
) => {
  const dataArray = new TextEncoder().encode(data);
  const buffer = await crypto.subtle.sign("HMAC", key, dataArray);

  if (output == "hex") return arrayBufferToHex(buffer);
  else return Buffer.from(buffer).toString(output);
};

export const verify = (data: string, signature: string, key: CryptoKey) => {
  const dataArray = new TextEncoder().encode(data);
  const signatureBuffer = hexToArrayBuffer(signature);
  return crypto.subtle.verify("HMAC", key, signatureBuffer, dataArray);
};

export const loadKey = (key: string, hash = "SHA-256") => {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    {
      name: "HMAC",
      hash,
    },
    false,
    ["sign", "verify"],
  );
};

export const generateKey = (hash = "SHA-256") => {
  return crypto.subtle.generateKey(
    {
      name: "HMAC",
      hash: { name: hash },
    },
    false,
    ["sign", "verify"],
  );
};
