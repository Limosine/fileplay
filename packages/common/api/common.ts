import { z } from "zod";

import { DeviceType } from "../common.ts";

// Helpers

function type<T extends string>(...t: [T, ...T[]]) {
  return z.enum(t);
}

// Types

// Messages from server

export const user = z.object({
  type: type("user"),
  data: z.object({
    uid: z.number(),
    display_name: z.string(),
    created_at: z.number(),
    avatar_seed: z.string(),
  }),
});

export const devices = z.object({
  type: type("devices"),
  data: z.object({
    self: z.object({
      did: z.number(),
      display_name: z.string(),
      type: z.nativeEnum(DeviceType),
      created_at: z.number(),
    }),
    others: z.array(
      z.object({
        did: z.number(),
        display_name: z.string(),
        type: z.nativeEnum(DeviceType),
        created_at: z.number(),
        online: z.boolean(),
      })
    ),
  }),
});

export const contacts = z.object({
  type: type("contacts"),
  data: z.array(
    z.object({
      uid: z.number(),
      display_name: z.string(),
      avatar_seed: z.string(),
      linked_at: z.number(),
      devices: z.array(
        z.object({
          did: z.number(),
          type: z.string(),
          display_name: z.string(),
        })
      ),
    })
  ),
});

export const groups = z.object({
  type: type("groups"),
  data: z.array(
    z.object({
      gid: z.number(),
      oid: z.number(),
      name: z.string(),
      created_at: z.number(),
      members: z.array(
        z.object({
          uid: z.number(),
          joined_at: z.number(),
          display_name: z.string(),
          avatar_seed: z.string(),
        })
      ),
      requests: z.array(
        z.object({
          uid: z.number(),
          created_at: z.number(),
          display_name: z.string(),
          avatar_seed: z.string(),
        })
      ),
    })
  ),
});

export const groupDevices = z.object({
  type: type("group_devices"),
  data: z.array(
    z.object({
      gid: z.number(),
      did: z.number(),
      type: z.string(),
      display_name: z.string(),
    })
  ),
});

const webRTCData = z.object({
  type: type("webRTCData"),
  data: z.object({
    from: z.number(),
    data: z
      .object({
        type: type("webrtc"),
        data: z.instanceof(Uint8Array),
      })
      .or(
        z.object({
          type: type("signal"),
          data: z.string(),
        })
      ),
  }),
});

const closeConnection = z.object({
  type: type("closeConnection"),
  data: z.number(),
});

const filetransfer = z.object({
  type: type("filetransfer"),
  data: z.string(),
});

const linkingCode = z.object({
  type: type("contactLinkingCode", "deviceLinkingCode"),
  data: z.object({
    code: z.string(),
    expires: z.number(),
    refresh: z.number(),
  }),
});

const codeRedeemed = z.object({
  type: type("contactCodeRedeemed", "deviceCodeRedeemed"),
});

const turnCredentials = z.object({
  type: type("turnCredentials"),
  data: z.object({
    username: z.string(),
    password: z.string(),
  }),
});

const error = z.object({
  type: type("error"),
  data: z.unknown(),
});

// Messages from client

const requestsWithoutData = z.object({
  type: type(
    "getInfos",
    "getTurnCredentials",
    "deleteTransfer",
    "deleteContactCode",
    "createDeviceCode",
    "deleteDeviceCode"
  ),
});

const createTransfer = z.object({
  type: type("createTransfer"),
});

const createContactCode = z.object({
  type: type("createContactCode"),
});

const createDeviceCode = z.object({
  type: type("createDeviceCode"),
});

const getTurnCredentials = z.object({
  type: type("getTurnCredentials"),
});

const share = z.object({
  type: type("share"),
  data: z.object({
    did: z.number(),
    data: webRTCData.shape.data.shape.data,
  }),
});

const shareFromGuest = z.object({
  type: type("shareFromGuest"),
  data: z.object({
    did: z.number(),
    data: webRTCData.shape.data.shape.data,
    guestTransfer: z.string(),
  }),
});

const sendNotifications = z.object({
  type: type("sendNotifications"),
  data: z.object({
    type: type("group", "contact", "devices"),
    ids: z.array(z.number()),
    nid: z.string(),
    files: z.array(z.string()),
  }),
});

const updateDevice = z.object({
  type: type("updateDevice"),
  data: z.object({
    did: z.number().optional(),
    update: z.object({
      display_name: z.string().optional(),
      type: z.nativeEnum(DeviceType).optional(),
      push_subscription: z.string().optional(),
    }),
  }),
});

const deleteDevice = z.object({
  type: type("deleteDevice"),
  data: z.number().optional(),
});

const updateUser = z.object({
  type: type("updateUser"),
  data: z.object({
    display_name: z.string().optional(),
    type: z.string().optional(),
    avatar_seed: z.string().optional(),
  }),
});

const deleteContact = z.object({
  type: type("deleteContact"),
  data: z.number(),
});

const redeemContactCode = z.object({
  type: type("redeemContactCode"),
  data: z.string(),
});

const createGroup = z.object({
  type: type("createGroup"),
  data: z.object({
    name: z.string(),
    members: z.array(z.number()),
  }),
});

const createGroupRequest = z.object({
  type: type("createGroupRequest"),
  data: z.object({
    gid: z.number(),
    uIds: z.array(z.number()),
  }),
});

const acceptGroupRequest = z.object({
  type: type("acceptGroupRequest"),
  data: z.number(), // Group id
});

const deleteGroupMember = z.object({
  type: type("deleteGroupMember"),
  data: z.object({
    gid: z.number(),
    deletion: z.number().optional(),
  }),
});

const messageFromClientSchemaWithoutId = z.union([
  createTransfer, // With response
  createContactCode,
  createDeviceCode,
  getTurnCredentials,
  requestsWithoutData, // Without response
  share,
  shareFromGuest,
  sendNotifications,
  updateDevice,
  deleteDevice,
  updateUser,
  deleteContact,
  redeemContactCode,
  createGroup,
  createGroupRequest,
  acceptGroupRequest,
  deleteGroupMember,
]);

export const messageFromClientSchema = messageFromClientSchemaWithoutId.and(
  z.object({
    id: z.number(),
  })
);

export type MessageFromClient = z.infer<
  typeof messageFromClientSchemaWithoutId
>;

const messageFromServerSchemaWithoutId = z.union([
  filetransfer, // With request
  linkingCode,
  turnCredentials,
  user, // Without request
  devices,
  contacts,
  groups,
  groupDevices,
  webRTCData,
  closeConnection,
  codeRedeemed,
  error,
]);

export const messageFromServerSchema = messageFromServerSchemaWithoutId.and(
  z.object({
    id: z.number(),
  })
);

export type MessageFromServer = z.infer<typeof messageFromServerSchema>;

export type ResponseMap<T> =
    T extends z.infer<typeof createTransfer> ? Promise<z.infer<typeof filetransfer>["data"]> :
    T extends z.infer<typeof createContactCode> ? Promise<z.infer<typeof linkingCode>["data"]> :
    T extends z.infer<typeof createDeviceCode> ? Promise<z.infer<typeof linkingCode>["data"]> :
    T extends z.infer<typeof getTurnCredentials> ? Promise<z.infer<typeof turnCredentials>["data"]> :
    undefined;
