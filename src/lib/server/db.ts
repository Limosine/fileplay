import Neode from "neode";
import { NEO4J_URL, NEO4J_USER, NEO4J_PASSWORD } from "$env/static/private";
import User from "$lib/server/models/User";
import Device from "$lib/server/models/Device";

export const neode = new Neode(NEO4J_URL, NEO4J_USER, NEO4J_PASSWORD).with({
  User,
  Device,
});
