import type { DeviceType } from "$lib/common";
import { error } from "@sveltejs/kit";
import { Kysely, type Generated, type ColumnType } from "kysely";
import { D1Dialect } from "kysely-d1";

type isOnline = ColumnType<boolean, boolean | undefined, boolean>;

interface UsersTable {
  uid: Generated<number>;
  displayName: string;
  isOnline: isOnline;
  avatarSeed: string;
  createdAt: ColumnType<number, undefined, undefined>;
  lastSeenAt: ColumnType<number, undefined, number>;
}

interface DecivesTable {
  did: Generated<number>;
  displayName: string;
  type: DeviceType;
  isOnline: isOnline;
  createdAt: ColumnType<number, undefined, undefined>;
  lastSeenAt: ColumnType<number, undefined, number>;
}

interface DevicesToUsersTable {
  did: number; // indexed, foreign key devices.id
  uid: number; // indexed, foreign key users.id
  createdAt: ColumnType<number, undefined, undefined>;
}

interface ContactsTable {
  cid: Generated<number>;
  a: number; // indexed, foreign key users.id
  b: number; // indexed, foreign key users.id
  createdAt: ColumnType<number, undefined, undefined>;
}

interface DevicesLinkCodesTable {
  code: string; // indexed, primary
  expires: ColumnType<number, number, undefined>;
  created_did: number;
  uid: number; // indexed, foreign key users.id
}

interface ContactsLinkCodesTable {
  code: string; // indexed, primary
  expires: ColumnType<number, number, undefined>;
  created_did: number;
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
