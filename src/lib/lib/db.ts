import type { Kysely, Generated, ColumnType } from "kysely";
import type { DeviceType } from "$lib/lib/common";

interface UsersTable {
  uid: Generated<number>;
  display_name: string;
  avatar_seed: string;
  created_at: ColumnType<number, undefined, undefined>;
}

interface DevicesTable {
  did: Generated<number>;
  uid: number | null; // indexed, foreign key users.uid
  linked_at: number | null;
  display_name: string;
  type: DeviceType;
  created_at: ColumnType<number, undefined, undefined>;
}

interface ContactsTable {
  cid: Generated<number>;
  a: number; // indexed, foreign key users.uid
  b: number; // indexed, foreign key users.uid
  created_at: ColumnType<number, undefined, undefined>;
}

interface DevicesLinkCodesTable {
  code: Generated<string>; // indexed, primary
  expires: ColumnType<number, number, undefined>;
  created_did: number;
  uid: number; // indexed, foreign key users.uid
}

interface ContactsLinkCodesTable {
  code: string; // indexed, primary
  expires: ColumnType<number, number, undefined>;
  created_did: number;
  uid: number; // indexed, foreign key users.uid
}

export interface DB {
  users: UsersTable;
  devices: DevicesTable;
  contacts: ContactsTable;
  devices_link_codes: DevicesLinkCodesTable;
  contacts_link_codes: ContactsLinkCodesTable;
}

export type Database = Kysely<DB>;
