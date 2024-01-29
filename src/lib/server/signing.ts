import type { CookieSerializeOptions } from "cookie";
import { error, type Cookies } from "@sveltejs/kit";

import type { Database } from "$lib/lib/db";
import { arrayBufferToHex, hexToArrayBuffer } from "$lib/lib/utils";

import { getUID } from "./db";

export async function setDeviceID(
  did: number,
  cookies: Cookies,
  key: CryptoKey,
) {
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
}

export async function getDeviceID(
  signature: string,
  did_s: string,
  key: CryptoKey,
  db: Database,
): Promise<
  | {
      success: true;
      message: {
        did: number;
        uid: number | null;
      };
    }
  | {
      success: false;
      message: any;
    }
> {
  if (!did_s || !signature) error(401, "Not authenticated");
  if (!(await verify(did_s, signature, key)))
    error(401, "Wrong authentication signature");

  const did = parseInt(did_s);
  const uid = await getUID(db, did);

  if (uid.success) {
    return { success: true, message: { did, uid: uid.message } };
  } else {
    return { success: false, message: uid.message };
  }
}

export async function sign(data: string, key: CryptoKey) {
  const dataArray = new TextEncoder().encode(data);
  return arrayBufferToHex(await crypto.subtle.sign("HMAC", key, dataArray));
}

export async function verify(data: string, signature: string, key: CryptoKey) {
  const dataArray = new TextEncoder().encode(data);
  const signatureBuffer = hexToArrayBuffer(signature);
  return crypto.subtle.verify("HMAC", key, signatureBuffer, dataArray);
}

export function loadKey(key: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign", "verify"],
  );
}

export function generateKey() {
  return crypto.subtle.generateKey(
    {
      name: "HMAC",
      hash: { name: "SHA-256" },
    },
    false,
    ["sign", "verify"],
  );
}
