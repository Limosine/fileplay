import type { SchemaObject } from "neode";
import { nanoid } from "nanoid";

export default {
  id: {
    type: "uuid",
    primary: true,
  },
  name: {
    type: "string",
    required: true,
  },
  lastSeen: {
    type: "datetime",
    default: () => new Date(),
  },
  avatarSeed: {
    type: "string",
    default: () => nanoid(6),
  },
  isOnline: {
    type: 'boolean',
    default: false,
  },
  contacts: {
    type: "relationships",
    relationship: "CONTACT",
    target: "User",
    direction: "out",
    eager: false,
    cascade: "detach",
    properties: {
      added: "datetime",
    },
  },
  devices: {
    type: "relationships",
    relationship: "HAS_DEVICE",
    target: "Device",
    direction: "out",
    eager: false,
    cascade: "delete",
    properties: {
      added: "datetime",
    },
  },
} satisfies SchemaObject;

