import type { SchemaObject } from "neode";

export default {
  id: {
    type: "uuid",
    primary: true,
  },
  authHash: {
    type: "string",
    required: true,
  },
  isOnline: {
    type: "boolean",
    default: false,
  },
  lastSeen: {
    type: "datetime",
    default: () => new Date(),
  },
  webPushEndpoint: "string",
  webPushP256DH: "string",
  user: {
    type: "relationship",
    relationship: "HAS_USER",
    target: "User",
    direction: "out",
    eager: true,
    cascade: "detach",
  },
} satisfies SchemaObject;
