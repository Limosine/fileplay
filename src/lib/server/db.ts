import Neode from "neode";
import { NEO4J_URL, NEO4J_USERNAME, NEO4J_PASSWORD } from "$env/static/private";
import User from '$lib/server/models/User'
import Device from '$lib/server/models/Device'
import { v4 as uuidv4 } from 'uuid'

export function createNeode(): Neode {
  const neode = new Neode(NEO4J_URL, NEO4J_USERNAME, NEO4J_PASSWORD);
  neode.with({
    User,
    Device
  })
  return neode;
}

export const db = {
  getDummyContacts: () => {
    return generateContacts(100, 5);
  }
}

async function makeid(length: number) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

const generateContacts = async (count: number, length: number): Promise<Contact[]> => {
  let contacts: Contact[] = [];
  for (let i = 0; i < count; i++) {
    contacts.push({ name: await makeid(length), id: uuidv4() });
  }
  return contacts;
}
