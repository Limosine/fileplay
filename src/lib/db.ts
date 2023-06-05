import type { DeviceType } from "$lib/common";
import type { Kysely, Generated, ColumnType } from "kysely";

interface UsersTable {
  uid: Generated<number>;
  displayName: string;
  avatarSeed: string;
  createdAt: ColumnType<number, undefined, undefined>;
  lastSeenAt: ColumnType<number, undefined, number>;
}

interface DecivesTable {
  did: Generated<number>;
  uid: number | null; // indexed, foreign key users.id
  linkedAt: number | null;
  displayName: string;
  type: DeviceType;
  createdAt: ColumnType<number, undefined, undefined>;
  lastSeenAt: ColumnType<number, undefined, number>;
  peerJsId: string | null;
  encryptionPublicKey: string;
  pushSubscription: string | null; // foreign key pushSubcriptions.pid
}

interface ContactsTable {
  cid: Generated<number>;
  a: number; // indexed, foreign key users.id
  b: number; // indexed, foreign key users.id
  createdAt: ColumnType<number, undefined, undefined>;
}

interface DevicesLinkCodesTable {
  code: Generated<string>; // indexed, primary
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

export interface DB {
  users: UsersTable;
  devices: DecivesTable;
  contacts: ContactsTable;
  devicesLinkCodes: DevicesLinkCodesTable;
  contactsLinkCodes: ContactsLinkCodesTable;
}

export type Database = Kysely<DB>;
