import { error, type Cookies } from "@sveltejs/kit";
import { arrayBufferToHex, hexToArrayBuffer } from "./utils";
import type { CookieSerializeOptions } from "cookie";
import type { Database } from "$lib/db";
import dayjs from "dayjs";

export async function saveSignedDeviceID(
  did: number,
  cookies: Cookies,
  key: CryptoKey
): Promise<void> {
  const id = did.toString();
  const signature = await sign(id, key);
  const cookie_opts: CookieSerializeOptions = {
    path: "/",
    maxAge: 60 * 60 * 24 * 60 * 12 * 10,
  };
  cookies.set("did", id, cookie_opts);
  cookies.set("did_sig", signature, cookie_opts);
}

export async function loadSignedDeviceID(
  cookies: Cookies,
  key: CryptoKey,
  db: Database
): Promise<{ did: number; uid: number | null }> {
  const did_s = cookies.get("did");
  const signature = cookies.get("did_sig");
  if (!did_s || !signature) throw error(401, "Not authenticated");
  if (!(await verify(did_s, signature, key)))
    throw error(401, "Wrong authentication signature");
  const did_i = parseInt(did_s);
  const now = dayjs().unix();
  const res1 = await db
    .updateTable("devices")
    .set({ lastSeenAt: now })
    .where("did", "=", did_i)
    .returning(["did", "uid"])
    .executeTakeFirst();
  if (!res1) throw error(401, "Device not found");
  const res2 = await db
    .updateTable("users")
    .set({ lastSeenAt: now })
    .where("uid", "=", res1.uid)
    .returning("uid")
    .executeTakeFirst();

  return { did: res1.did, uid: res2?.uid ?? null };
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
