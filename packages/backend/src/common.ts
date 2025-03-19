import { WSContext } from "@hono/hono/ws";
import { CookieOptions } from "@hono/hono/utils/cookie";

// Utils

export type MaybePromise<T> = T | Promise<T>;

export const hexToArrayBuffer = (hex: string) => {
  const octets = hex.match(/.{2}/g);
  if (!octets) throw new Error("Conversion: Invalid hex string");
  return new Uint8Array(octets.map((o) => parseInt(o, 16))).buffer;
};

export const arrayBufferToHex = (buffer: ArrayBuffer) => {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

export const isEmpty = (obj: object) => {
  for (const prop in obj) {
    if (Object.hasOwn(obj, prop)) {
      return false;
    }
  }

  return true;
};

export const isProfane = async (s: string) => {
  return new (await import("bad-words")).Filter().isProfane(s);
};

export const cookieOptions: Readonly<CookieOptions> = Object.freeze({
  httpOnly: true,
  secure: true,
  sameSite: "Lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 400, // Cookies Max-Age SHOULD NOT be greater than 400 days in duration.
});

// Specific types

export interface EWSContext extends WSContext {
  isAlive: boolean;
  device?: number;
  user?: number;
  guest?: number;
  guestTransfer?: string;
}

export interface AuthenticationIds {
  device?: number;
  user?: number;
  guest?: number;
}
