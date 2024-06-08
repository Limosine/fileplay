import { encodeBase64 } from "@std/encoding";
import { Context } from "hono/mod.ts";
import { setCookie } from "hono/helper/cookie/index.ts";

import { arrayBufferToHex, cookieOptions, hexToArrayBuffer } from "./common.ts";
import { getSalt, getUid } from "./db.ts";
import { Database } from "./kysely.ts";

export const setDeviceID = async (
  did: number,
  salt: string,
  c: Context,
  key: CryptoKey
) => {
  const signature = await sign(did + salt, key);

  setCookie(c, "did", did.toString(), cookieOptions);
  setCookie(c, "did_sig", signature, cookieOptions);
};

export const getDeviceID = async (
  signature: string,
  did_s: string,
  key: CryptoKey,
  db: Database
) => {
  const did = parseInt(did_s);
  const salt = await getSalt(db, did);

  if (!salt.success || !did_s || !signature)
    throw new Error("Not authenticated");
  if (!(await verify(did_s + salt.message, signature, key)))
    throw new Error("Wrong authentication signature");

  const uid = await getUid(db, did);

  if (!uid.success) throw new Error(String(uid.message));
  else return { did, uid: uid.message };
};

export const sign = async (
  data: string,
  key: CryptoKey,
  output: "hex" | "base64" = "hex"
) => {
  const dataArray = new TextEncoder().encode(data);
  const buffer = await crypto.subtle.sign("HMAC", key, dataArray);

  if (output == "hex") return arrayBufferToHex(buffer);
  else return encodeBase64(buffer);
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
    ["sign", "verify"]
  );
};

export const generateKey = (hash = "SHA-256") => {
  return crypto.subtle.generateKey(
    {
      name: "HMAC",
      hash: { name: hash },
    },
    false,
    ["sign", "verify"]
  );
};
