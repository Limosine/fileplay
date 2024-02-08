import Filter from "bad-words";

export const isProfane = (s: string) => {
  return new Filter().isProfane(s);
};

export const stringToArrayBuffer = (str: string) => {
  return new TextEncoder().encode(str).buffer;
};

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

export const blobToArrayBuffer = (blob: Blob) => {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject("Conversion: Wrong type");
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsArrayBuffer(blob);
  });
};

export const typedArrayToBuffer = (array: Uint8Array) => {
  return array.buffer.slice(
    array.byteOffset,
    array.byteLength + array.byteOffset,
  );
};

export const numberToUint8Array = (number: number, length = 4) => {
  const array = new Uint8Array(length);

  for (let i = 0; i < length; i++) {
    array[i] = number % 256;
    number = Math.floor(number / 256);
  }
  if (number % 256 !== 0) throw new Error("Conversion: Number to high.");

  return array;
};

export const uint8ArrayToNumber = (array: Uint8Array) => {
  let number = 0;

  for (let i = array.length - 1; i >= 0; i--) {
    number = number * 256 + array[i];
  }

  return number;
};
