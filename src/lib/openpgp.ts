import * as openpgp from 'openpgp';

let privateKey_object: openpgp.PrivateKey;
let privateKey_armored: string;
export let publicKey_armored: string;
let revocationCertificate_top: string;

export async function generateKey() {
  const { privateKey, publicKey, revocationCertificate } = await openpgp.generateKey({
    type: 'ecc',
    curve: 'curve25519',
    userIDs: [{ name: 'Jon Smith'}], // displayName
  });

  privateKey_object = await openpgp.readPrivateKey({ armoredKey: privateKey });

  privateKey_armored = privateKey;
  publicKey_armored = publicKey;
  revocationCertificate_top = revocationCertificate;

  localStorage.setItem("encryptionPrivateKey", privateKey_armored);
}

export async function encryptFile(files: FileList, publicKey_armored: string) {
  const publicKey = await openpgp.readKey({ armoredKey: publicKey_armored });

  const filePromises = Array.from(files).map((file) => {
    return new Promise<openpgp.WebStream<string>>((resolve, reject) => {
      const reader = new FileReader;
      reader.onload = async () => {
        try {
          if (typeof reader.result === "string") {
            const encrypted = await openpgp.encrypt({
              message: await openpgp.createMessage({ text: reader.result }),
              encryptionKeys: publicKey
            });

            resolve(encrypted);
          }
        } catch(err) {
          reject(err);
        }
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsText(file);
    });
  });

  const encrypted_files = await Promise.all(filePromises);

  return encrypted_files;
}

export async function decryptFile(encrypted_files: openpgp.WebStream<string>[]) {
  const filePromises = Array.from(encrypted_files).map((file) => {
    return new Promise<openpgp.MaybeStream<openpgp.Data>> (async (resolve, reject) => {
      const message = await openpgp.readMessage({
        armoredMessage: file
      });

      const { data: decrypted } = await openpgp.decrypt({
        message,
        decryptionKeys: privateKey_object
      });
  
      resolve(decrypted);
    });
  });

  const decrypted_files = await Promise.all(filePromises);

  return decrypted_files;
}

export const setup = () => {
  if (!privateKey_object || !privateKey_armored || !publicKey_armored || !revocationCertificate_top) {
    generateKey();
  }
}