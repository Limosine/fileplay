import type { SchemaObject, NodeProperty } from "neode";

export default {
  id: {
    type: "uuid",
    primary: true,
  },
  name: {
    type: "string",
  },
  avatarSeed: {
    type: "string",
  },
  contacts: {
    type: "relationships",
    target: "User",
    relationship: "CONTACT",
    direction: "direction_both",
    properties: {
      "added": "datetime"
    }
  },
  devices: {
    type: "relationships",
    target: "Device",
    relationship: "LINKED",
    direction: "direction_both",
    properties: {
      "added": "datetime"
    }
  }
} satisfies SchemaObject;
