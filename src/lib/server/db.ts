import { Kysely, type Generated, type ColumnType } from "kysely";
import { D1Dialect } from "kysely-d1";

type isOnline = ColumnType<boolean, boolean | undefined, boolean>;

interface UsersTable {
  id: Generated<number>;
  displayName: string;
  isOnline: isOnline;
  avatarSeed: string;
}

export enum DeviceType {
  Desktop = "desktop",
  Laptop = "laptop",
  Phone = "phone",
  Tablet = "tablet",
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

interface Database {
  users: UsersTable;
  devices: DecivesTable;
  devicesToUsers: DevicesToUsersTable;
  ContactsTable: ContactsTable;
}

export function createKysely(
  platform: App.Platform | undefined
): Kysely<Database> | undefined {
  if (!platform?.env?.DATABASE) return;
  return new Kysely<Database>({
    dialect: new D1Dialect({ database: platform.env.DATABASE }),
  });
}
