import type { SchemaObject } from "neode";

export default {
  // relationship to all outside contacts
  entries: {
    type: "relationship",
    relationship: "ENTRY",
    target: "Contacts",
    direction: "out",
    properties: {
      known_as: "uuid",
    },
  },
  // relationship to users using these contacts
  used_by: {
    type: "relationship",
    relationship: "USED_BY",
    target: "User",
    direction: "out",
  },
} satisfies SchemaObject;
