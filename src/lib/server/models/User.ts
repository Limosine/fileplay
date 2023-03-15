import type { SchemaObject } from "neode";

export default {
  uuid: {
    primary: true,
    type: "uuid",
  },
  key: {
    type: "string",
  },
  name: {
    type: "string",
  },
  avatar_seed: {
    type: "string",
  },
  is_subscibed: {
    type: "boolean",
  },
  subscription_id: {
    type: "string",
  },
  last_seen: {
    type: "datetime",
  },
  contacts_list: {
    type: "relationship",
    target: "Contacts",
    relationship: "CONTACTS_LIST",
    direction: "out",
  }
} satisfies SchemaObject;
