import { pem2jwk, jwk2pem } from "pem-jwk";

// Generate RSA key pair
export async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
      hash: { name: "SHA-256" },
    },
    true,
    ["encrypt", "decrypt"]
  );

  return keyPair;
}

// Convert CryptoKey to PEM format
export async function convertKeyToPEM(
  key: CryptoKey,
  isPrivate: boolean
): Promise<string> {
  const exportedKey = await crypto.subtle.exportKey(
    isPrivate ? "pkcs8" : "spki",
    key
  );
  // const exportedKeyBuffer = new Uint8Array(exportedKey);
  // const exportedKeyBase64 = btoa(
  //   String.fromCharCode.apply(null, [...exportedKeyBuffer])
  // );

  let pemHeader = isPrivate ? "PRIVATE KEY" : "PUBLIC KEY";
  // let pemContents = exportedKeyBase64.replace(/(.{64})/g, "$1\n");

  // return `-----BEGIN ${pemHeader}-----${pemContents}-----END ${pemHeader}-----`;
  let body: string | undefined = window.btoa(
    String.fromCharCode(...new Uint8Array(exportedKey))
  );
  body = body.match(/.{1,64}/g)?.join("\n");
  if (body)
    return `-----BEGIN ${pemHeader}-----\n${body}\n-----END ${pemHeader}-----`;
  return "";
}

// Extract a single key from PEM format
// export async function extractKeyFromPEM(
//   pem: string,
//   isPrivate: boolean
// ): Promise<CryptoKey> {
//   const pemContents = pem
//     .replace("-----BEGIN PUBLIC KEY-----", "")
//     .replace("-----END PUBLIC KEY-----", "")
//     .replace("-----BEGIN PRIVATE KEY-----", "")
//     .replace("-----END PRIVATE KEY-----", "")
//     .trim();

//   const binaryString = atob(pemContents);
//   const binaryData = new Uint8Array(binaryString.length);
//   for (let i = 0; i < binaryString.length; i++) {
//     binaryData[i] = binaryString.charCodeAt(i);
//   }

//   const keyUsage: KeyUsage[] = isPrivate ? ["unwrapKey"] : ["wrapKey"];

//   const algorithm: RsaHashedKeyGenParams = {
//     name: "RSA-OAEP",
//     modulusLength: 2048,
//     publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // Exponent value of 65537
//     hash: { name: "SHA-256" },
//   };

//   const key = await crypto.subtle.importKey(
//     isPrivate ? "pkcs8" : "spki",
//     binaryData,
//     algorithm,
//     true,
//     keyUsage
//   );

//   return key;
// }

export async function extractKeyFromPEM(
  pem: string,
  isPrivate: boolean
): Promise<CryptoKey> {
  const promise = new Promise<CryptoKey>((resolve, reject) => {
    const pemContents = pem
      .replace("-----BEGIN PUBLIC KEY-----", "")
      .replace("-----END PUBLIC KEY-----", "")
      .replace("-----BEGIN PRIVATE KEY-----", "")
      .replace("-----END PRIVATE KEY-----", "")
      .replace(/\r?\n|\r/g, "")
      .trim();

    const binaryString = atob(pemContents);
    const binaryData = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      binaryData[i] = binaryString.charCodeAt(i);
    }
    const algorithm: RsaHashedImportParams = {
      name: "RSA-OAEP",
      hash: { name: "SHA-256" },
    };

    crypto.subtle
      .importKey(
        isPrivate ? "pkcs8" : "spki",
        binaryData,
        algorithm,
        true,
        isPrivate ? ["decrypt"] : ["encrypt"]
      )
      .then((val) => {
        resolve(val);
      })
      .catch((err) => {
        reject(err);
      });
  });
  return promise;
}

// Encryption function
/**
 *
 * @param file
 * @param publicKey
 * @returns An encrypted file blob
 */
// Encrypt a file in chunks using RSA-OAEP algorithm
// Encrypt a file in chunks using RSA-OAEP algorithm
export async function encryptFile(
  file: File,
  publicKey: CryptoKey
): Promise<Blob> {
  const chunkSize = 8 * 8; // Adjust chunk size as needed
  const totalChunks = Math.ceil(file.size / chunkSize);

  const encryptedChunks = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min((i + 1) * chunkSize, file.size);
    const chunk = file.slice(start, end);

    const fileBuffer = await readArrayBuffer(chunk);

    const encryptedData = await crypto.subtle.encrypt(
      {
        name: "RSA-OAEP",
      },
      publicKey,
      fileBuffer
    );

    encryptedChunks.push(encryptedData);
  }

  const encryptedDataSize = encryptedChunks.reduce(
    (totalSize, chunk) => totalSize + chunk.byteLength,
    0
  );
  const encryptedData = new Uint8Array(encryptedDataSize);

  let offset = 0;
  for (const chunk of encryptedChunks) {
    const chunkData = new Uint8Array(chunk);
    encryptedData.set(chunkData, offset);
    offset += chunkData.byteLength;
  }

  return new Blob([encryptedData]);
}

// Decryption function
/**
 *
 * @param arrayBuffer
 * @param privateKey
 * @returns Returns a download link for the corresponding file
 */
// Decrypt a file in chunks using RSA-OAEP algorithm
export async function decryptFile(
  blob: Blob,
  privateKey: CryptoKey
): Promise<Blob> {
  const chunkSize = 8 * 8; // Chunk size should match the one used during encryption

  const encryptedChunks = [];

  const reader = new FileReader();
  const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });

  let offset = 0;
  while (offset < arrayBuffer.byteLength) {
    const chunkData = arrayBuffer.slice(offset, offset + chunkSize);
    encryptedChunks.push(chunkData);
    offset += chunkSize;
  }
  const decryptedChunks = [];

  for (const chunk of encryptedChunks) {
    console.log(chunk);
    const decryptedData = crypto.subtle
      .decrypt(
        {
          name: "RSA-OAEP",
        },
        privateKey,
        chunk
      )
      .then((val) => {
        return val;
      })
      .catch(reason => console.log(reason));

    decryptedChunks.push(decryptedData);
  }

  const decryptedDataSize = decryptedChunks.reduce(
    (totalSize, chunk) => totalSize + chunk.byteLength,
    0
  );
  const decryptedData = new Uint8Array(decryptedDataSize);

  offset = 0;
  for (const chunk of decryptedChunks) {
    const chunkData = new Uint8Array(chunk);
    decryptedData.set(chunkData, offset);
    offset += chunkData.byteLength;
  }

  return new Blob([decryptedData]);
}

function readArrayBuffer(file: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read file as ArrayBuffer."));
      }
    };

    reader.onerror = () => {
      reject(new Error("Error occurred while reading the file."));
    };

    reader.readAsArrayBuffer(file);
  });
}
