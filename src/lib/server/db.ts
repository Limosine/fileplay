import Neode from "neode";
import { NEO4J_URL, NEO4J_USER, NEO4J_PASSWORD } from "$env/static/private";
import User from '$lib/server/models/User'
import Contacts from '$lib/server/models/Contacts'

export function createNeode(): Neode {
  const neode = new Neode(NEO4J_URL, NEO4J_USER, NEO4J_PASSWORD);
  neode.with({
    User,
    Contacts
  })
  return neode;
}
