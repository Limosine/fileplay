import Filter from "bad-words";

export function isProfane(s: string): boolean {
  return new Filter().isProfane(s);
}

export function hexToArrayBuffer(hex: string): ArrayBuffer {
  const octets = hex.match(/.{2}/g);
  if (!octets) throw new Error("Invalid hex string");
  return new Uint8Array(
    octets.map((o) => parseInt(o, 16))
  ).buffer;
}

export function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
