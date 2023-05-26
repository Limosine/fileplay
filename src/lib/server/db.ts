import { Kysely, type Generated } from "kysely";
import { D1Dialect } from "kysely-d1";

interface UsersTable {
  id: Generated<number>;
  displayName: string;
  isOnline: boolean;
  lastSeen: Date | null;
  avatarSeed: string;
}

interface DecivesTable {
  id: Generated<number>;
  displayName: string;
  publicKey: string;
  isOnline: boolean;
  lastSeen: Date | null;
}

interface DevicesUsersTable {
  did: number; // primary key, indexed
  uid: number; // indexed
}

interface Database {
  users: UsersTable;
  devices: DecivesTable;
  devicesUsers: DevicesUsersTable;
}

export function createKysely(
  platform: App.Platform
): Kysely<Database> | undefined {
  if (!platform.env?.DATABASE) return;
  return new Kysely<Database>({
    dialect: new D1Dialect({ database: platform.env.DATABASE }),
  });
}
