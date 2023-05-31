import { error, type Cookies } from "@sveltejs/kit";
import { arrayBufferToHex, hexToArrayBuffer } from "./utils";
import type { CookieSerializeOptions } from "cookie";

export async function saveSignedDeviceID(
  did: number,
  cookies: Cookies,
  key: CryptoKey
): Promise<void> {
  const id = did.toString();
  const signature = await sign(id, key);
  const cookie_opts: CookieSerializeOptions = {
    path: "/",
  };
  cookies.set("did", id, cookie_opts);
  cookies.set("did_sig", signature, cookie_opts);
}

export async function loadSignedDeviceID(
  cookies: Cookies,
  key: CryptoKey
): Promise<number> {
  const did = cookies.get("did");
  const signature = cookies.get("did_sig");
  if (!did || !signature) throw error(401, "Not authenticated");
  if (!(await verify(did, signature, key)))
    throw error(401, "Wrong authentication signature");
  return parseInt(did);
}

export async function sign(data: string, key: CryptoKey): Promise<string> {
  const dataBuffer = new TextEncoder().encode(data);
  return arrayBufferToHex(await crypto.subtle.sign("HMAC", key, dataBuffer));
}

export async function verify(
  data: string,
  signature: string,
  key: CryptoKey
): Promise<boolean> {
  const dataBuffer = new TextEncoder().encode(data);
  const signatureBuffer = hexToArrayBuffer(signature);
  return crypto.subtle.verify("HMAC", key, signatureBuffer, dataBuffer);
}

export async function loadKey(key: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"]
  );
}
