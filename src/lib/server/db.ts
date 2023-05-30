import type { DeviceType } from "$lib/common";
import { error } from "@sveltejs/kit";
import { Kysely, type Generated, type ColumnType } from "kysely";
import { D1Dialect } from "kysely-d1";

type isOnline = ColumnType<boolean, boolean | undefined, boolean>;

interface UsersTable {
  id: Generated<number>;
  displayName: string;
  isOnline: isOnline;
  avatarSeed: string;
}

interface DecivesTable {
  id: Generated<number>;
  displayName: string;
  type: DeviceType;
  isOnline: isOnline;
}

interface DevicesToUsersTable {
  did: number; // indexed, foreign key devices.id
  uid: number; // indexed, foreign key users.id
}

interface ContactsTable {
  a: number; // indexed, foreign key users.id
  b: number; // indexed, foreign key users.id
}

interface DevicesLinkCodesTable {
  code: string; // indexed, primary
  expires: Date;
  uid: number; // indexed, foreign key users.id
}

interface ContactsLinkCodesTable {
  code: string; // indexed, primary
  expires: Date;
  uid: number; // indexed, foreign key users.id
}

interface Database {
  users: UsersTable;
  devices: DecivesTable;
  devicesToUsers: DevicesToUsersTable;
  contacts: ContactsTable;
  devicesLinkCodes: DevicesLinkCodesTable;
  contactsLinkCodes: ContactsLinkCodesTable;
}

export function createKysely(
  platform: App.Platform | undefined
): Kysely<Database> {
  if (!platform?.env?.DATABASE) throw error(500, "Database not configured");
  const kys = new Kysely<Database>({
    dialect: new D1Dialect({ database: platform.env.DATABASE }),
  });
  if (!kys) throw error(500, "Database could not be accessed");
  return kys;
}
