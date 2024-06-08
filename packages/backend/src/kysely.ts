import type { Generated, ColumnType, Kysely } from "kysely";

import { DeviceType } from "../../common/common.ts";

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
  push_subscription: string | null;
  salt: string;
}

interface DevicesLinkCodesTable {
  code: Generated<string>; // indexed, primary
  expires: ColumnType<number, number, undefined>;
  created_did: number;
  uid: number; // indexed, foreign key users.uid
}

interface ContactsTable {
  cid: Generated<number>;
  a: number; // indexed, foreign key users.uid
  b: number; // indexed, foreign key users.uid
  created_at: ColumnType<number, undefined, undefined>;
}

interface ContactsLinkCodesTable {
  code: string; // indexed, primary
  expires: ColumnType<number, number, undefined>;
  created_did: number;
  uid: number; // indexed, foreign key users.uid
}

interface GroupsTable {
  gid: Generated<number>;
  oid: number;
  name: string;
  created_at: ColumnType<number, undefined, undefined>;
}

interface GroupMembersTable {
  mid: Generated<number>;
  gid: number;
  uid: number;
  joined_at: ColumnType<number, undefined, undefined>;
}

interface GroupRequestsTable {
  rid: Generated<number>;
  gid: number;
  uid: number;
  created_at: ColumnType<number, undefined, undefined>;
}

export interface DB {
  users: UsersTable;
  devices: DevicesTable;
  contacts: ContactsTable;
  devices_link_codes: DevicesLinkCodesTable;
  contacts_link_codes: ContactsLinkCodesTable;
  groups: GroupsTable;
  group_members: GroupMembersTable;
  group_requests: GroupRequestsTable;
}

export type Database = Kysely<DB>;
