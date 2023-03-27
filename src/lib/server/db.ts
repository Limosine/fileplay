import Neode from "neode";
import { NEO4J_URL, NEO4J_USERNAME, NEO4J_PASSWORD } from "$env/static/private";
import User from '$lib/server/models/User'
import Device from '$lib/server/models/Device'

export function createNeode(): Neode {
  const neode = new Neode(NEO4J_URL, NEO4J_USERNAME, NEO4J_PASSWORD);
  neode.with({
    User,
    Device
  })
  return neode;
}
