import type { DeviceType } from "$lib/common";
import type { Kysely, Generated, ColumnType } from "kysely";

interface UsersTable {
  uid: Generated<number>;
  displayName: string;
  avatarSeed: string;
  createdAt: ColumnType<number, undefined, undefined>;
  lastSeenAt: ColumnType<number, undefined, number>;
}

interface DevicesTable {
  did: Generated<number>;
  uid: number | null; // indexed, foreign key users.id
  linkedAt: number | null;
  displayName: string;
  type: DeviceType;
  createdAt: ColumnType<number, undefined, undefined>;
  lastSeenAt: ColumnType<number, undefined, number>;
  websocketId: string | null;
  lastUsedConnection: "websocket" | "push" | null;
  pushSubscription: string | null;
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

interface SharingTable {
  sid: Generated<number>;
  did: number; // indexed, foreign key devices.id
  uid: number; // indexed, foreign key contacts.id
  expires: ColumnType<number, number, undefined>;
}

interface keepAliveCodesTable {
  code: string; // indexed, primary
  did: number; // foreign key devices.id
}

export interface DB {
  users: UsersTable;
  devices: DevicesTable;
  contacts: ContactsTable;
  devicesLinkCodes: DevicesLinkCodesTable;
  contactsLinkCodes: ContactsLinkCodesTable;
  sharing: SharingTable;
  keepAliveCodes: keepAliveCodesTable;
}

export type Database = Kysely<DB>;
