export function bufferToB64(buffer: Buffer) {
  return buffer.toString("base64");
}

export function B64ToBuffer(b64: string) {
  return Buffer.from(b64, "base64");
}
