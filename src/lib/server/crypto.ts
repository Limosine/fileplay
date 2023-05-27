import type { Cookies } from "@sveltejs/kit";
import { arrayBufferToHex, hexToArrayBuffer } from "./utils";

export async function saveSignedDeviceID(
  did: string,
  cookies: Cookies,
  key: CryptoKey
): Promise<void> {
  const signature = await sign(did, key);
  cookies.set("did", did);
  cookies.set("did_signature", signature);
}

export async function loadSignedDeviceID(
  cookies: Cookies,
  key: CryptoKey
): Promise<string | undefined> {
  const did = cookies.get("did");
  const signature = cookies.get("did_signature");
  if (!did || !signature) return undefined;
  if (!(await verify(did, signature, key))) return undefined;
  return did;
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
    "HMAC",
    true,
    ["sign", "verify"]
  );
}
