import { generateKey } from "./signing.ts";

// Secret (changed on every restart)
let guestSecretValue: CryptoKey;
export const guestSecret = async () => {
  if (guestSecretValue === undefined) guestSecretValue = await generateKey();
  return guestSecretValue;
};

export const guests: true[] = [];

type Filetransfers = { id: string; did: number }[];
export let filetransfers: Filetransfers = [];
export const setFiletransfers = (f: Filetransfers) => (filetransfers = f);
