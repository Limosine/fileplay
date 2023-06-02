import * as CryptoJS from "crypto-js";

// Generate RSA key pair
async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
  
  return keyPair;
}

// Convert Key to PEM format
function exportKeyToPem(key: CryptoKey) {
  return crypto.subtle.exportKey("spki", key).then((spki) => {
    const exportedKey = String.fromCharCode.apply(null, [
      ...new Uint8Array(spki),
    ]);
    const exportedPEM = `-----BEGIN PUBLIC KEY-----\n${exportedKey}\n-----END PUBLIC KEY-----\n`;
    return exportedPEM;
  });
}

// Encryption function
/**
 *
 * @param file
 * @param publicKey
 * @returns An encrypted file blob
 */
async function encryptFile(file: File, publicKey: CryptoKey) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e: ProgressEvent<FileReader>) => {
      const fileContent = e.target?.result as ArrayBuffer;

      // Convert the file content to a Uint8Array
      const fileData = new Uint8Array(fileContent);

      // Generate a random encryption key
      const encryptionKey = new Uint8Array(32);
      crypto.getRandomValues(encryptionKey);

      // Encrypt the file content using AES with the encryption key
      const encryptedData = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: crypto.getRandomValues(new Uint8Array(12)) },
        publicKey,
        fileData
      );

      // Create a Blob with the encrypted data
      // const encryptedBlob = new Blob([encryptedData], {
      //   type: "application/octet-stream",
      // });
      resolve(encryptedData);
    };

    reader.onerror = (e) => {
      reject(new Error("Failed to read the file."));
    };

    reader.readAsArrayBuffer(file);
  });
}

// Decryption function
/**
 * 
 * @param arrayBuffer 
 * @param privateKey 
 * @returns Returns a download link for the corresponding file
 */
async function decryptFile(arrayBuffer: ArrayBuffer, privateKey: CryptoKey) {
  return new Promise<string>(async (resolve, reject) => {
    const encryptedData = new Uint8Array(arrayBuffer);

    // Decrypt the file content using AES with the encryption key
    const decryptedData = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: crypto.getRandomValues(new Uint8Array(12)) },
      privateKey,
      encryptedData
    );

    // Create a Blob for the decrypted data
    const decryptedBlob = new Blob([decryptedData], {
      type: "application/octet-stream",
    });
    const link = URL.createObjectURL(decryptedBlob);

    resolve(link);
  });
}
