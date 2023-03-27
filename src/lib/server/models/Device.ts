import type { SchemaObject } from "neode";

export default {
  id: {
    type: "uuid",
    primary: true,
  },
  publicKey: {  // rsa public key for encrypting files sent to this device
    type: "string",
  },
  authHash: {   // hash of a secret stored on the client
    type: "string",
  },
  authSalt: {   // salt used to hash the secret
    type: "string",
  },
  user: {     // user that this device is linked to
    type: "relationship",
    target: "User",
    relationship: "LINKED",
    direction: "direction_both",
  },
  isOnline: {   // is the device currently online
    type: "boolean",
  },
  lastSeen: {   // last time the device was seen
    type: "datetime",
  },
  webPushEndpoint: {  // endpoint for web push notifications
    type: "string",
  },
  webPushP256DH: {    // p256dh for web push notification encryption
    type: "string",
  },
  webPushNoCSRF: {    // CSRF prevention token for web push notification encryption
    type: "string",
  }
} satisfies SchemaObject;
