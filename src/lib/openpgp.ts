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

  privateKey_armored = privateKey;
  publicKey_armored = publicKey;
  revocationCertificate_top = revocationCertificate;

  convertPrivateKey();

  localStorage.setItem("encryptionPrivateKey", privateKey_armored);
  localStorage.setItem("encryptionPublicKey", publicKey_armored);
  localStorage.setItem("encryptionRevocationCertificate", revocationCertificate_top);
}

async function convertPrivateKey(){
  privateKey_object = await openpgp.readPrivateKey({ armoredKey: privateKey_armored });
}

export async function encryptFile(files: FileList, publicKeys_armored: string[]) {
  const publicKeys = await Promise.all(publicKeys_armored.map(armoredKey => openpgp.readKey({ armoredKey })));

  const filePromises = Array.from(files).map((file) => {
    return new Promise<openpgp.WebStream<string>>((resolve, reject) => {
      const reader = new FileReader;
      reader.onload = async () => {
        try {
          console.log(reader.result)
          if (reader.result instanceof ArrayBuffer) {
            console.log(true);
            const encrypted = await openpgp.encrypt({
              message: await openpgp.createMessage({ binary: new Uint8Array(reader.result), format: "binary" }),
              encryptionKeys: publicKeys
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
      reader.readAsArrayBuffer(file);
    });
  });

  const encrypted_files = await Promise.all(filePromises);

  return encrypted_files;
}

export async function encryptFileWithPassword(files: FileList, password: string) {
  const filePromises = Array.from(files).map((file) => {
    return new Promise<openpgp.WebStream<string>>((resolve, reject) => {
      const reader = new FileReader;
      reader.onload = async () => {
        try {
          console.log(reader.result)
          if (reader.result instanceof ArrayBuffer) {
            console.log(true);
            const encrypted = await openpgp.encrypt({
              message: await openpgp.createMessage({ binary: new Uint8Array(reader.result), format: "binary" }),
              passwords: [password]
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
      reader.readAsArrayBuffer(file);
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
        decryptionKeys: privateKey_object,
        format: "binary"
      });
  
      resolve(decrypted);
    });
  });

  const decrypted_files = await Promise.all(filePromises);

  return decrypted_files;
}

export async function decryptFileWithPassword(encrypted_files: openpgp.WebStream<string>[], password: string) {
  const filePromises = Array.from(encrypted_files).map((file) => {
    return new Promise<openpgp.MaybeStream<openpgp.Data>> (async (resolve, reject) => {
      const message = await openpgp.readMessage({
        armoredMessage: file
      });

      const { data: decrypted } = await openpgp.decrypt({
        message,
        passwords: [password],
        format: "binary"
      });
  
      resolve(decrypted);
    });
  });

  const decrypted_files = await Promise.all(filePromises);

  return decrypted_files;
}

export const setup = () => {
  if (!privateKey_object || !privateKey_armored || !publicKey_armored || !revocationCertificate_top) {
    const privateKey = localStorage.getItem("encryptionPrivateKey");
    const publicKey = localStorage.getItem("encryptionPublicKey");
    const revocationCertificate = localStorage.getItem("encryptionRevocationCertificate");

    if (privateKey && publicKey && revocationCertificate) {
      privateKey_armored = privateKey;
      publicKey_armored = publicKey;
      revocationCertificate_top = revocationCertificate;
      convertPrivateKey();
    } else {
      generateKey();
    }
  }
}