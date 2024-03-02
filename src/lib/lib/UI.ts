import { browser } from "$app/environment";
import { page } from "$app/stores";
import { pushState } from "$app/navigation";
import { get, writable } from "svelte/store";

import { apiClient } from "$lib/api/client";
import type { IncomingFiletransfer, Request } from "$lib/sharing/common";

import { type IContact, type IDevices, type IUser } from "./fetchers";
import type { PartialBy } from "./utils";

// Navigation
export const path = writable<Routes>({
  main: "home",
});

// Service worker
export const registration = writable<ServiceWorkerRegistration>();

// Setup
export const linkingCode = writable("");
export const profaneUsername = writable({
  loading: false,
  profane: false,
});

// Input
export const input = writable<HTMLInputElement>();
export const rawFiles = writable<FileList>();
export const files = writable<
  {
    id: string;
    file: File;
    bigChunks?: Blob[];
    smallChunks?: Uint8Array[][];
  }[]
>([]);

// Personal infos
export const own_did = writable<number>();

export const deviceParams = writable({
  display_name: "",
  type: "",
});

export const userParams = writable({
  display_name: "",
  avatar_seed: "",
});

export const contacts = writable<IContact[]>([]);
export const devices = writable<IDevices>();
export const user = writable<IUser>();

// Dialogs
export const addDialog = writable<HTMLDialogElement>();
export const editDialog = writable<HTMLDialogElement>();
export const notificationDialog = writable<HTMLDialogElement>();
export const qrCodeDialog = writable<HTMLDialogElement>();
export const requestDialog = writable<HTMLDialogElement>();
export const sendDialog = writable<HTMLDialogElement>();
export const privacyDialog = writable<HTMLDialogElement>();

// Dialog properties
export const addProperties = writable<{
  mode: "contact" | "device";
  redeem: boolean;
  code: string;
}>({
  mode: "contact",
  redeem: true,
  code: "",
});

export const sendProperties = writable<{
  cid?: number;
}>({});

export const editProperties = writable<{
  mode?: EditOptions;
  title: string;
  did?: number;
  originalValue: string;
}>({
  title: "",
  originalValue: "",
});

// Notifications
export const notifications = writable<Notification[]>([]);

// Functions

export const addNotification = (
  notification: PartialBy<Notification, "tag">,
) => {
  if (notification.tag !== undefined) deleteNotification(notification.tag);

  notifications.update((notifications) => {
    if (!("tag" in notification))
      notification.tag = Math.random().toString(36).substring(7);
    notifications.push(notification as Notification);
    return notifications;
  });

  if (!get(notificationDialog).open) ui("#dialog-notifications");
};

export const deleteNotification = (tag: string) => {
  notifications.update((notifications) =>
    notifications.filter((n) => n.tag != tag),
  );
};

export const openDialog = (
  currentU: EditOptions,
  titleU: string,
  original_valueU?: string,
  didU?: number,
) => {
  editProperties.update((properties) => {
    properties.mode = currentU;
    properties.title = titleU;

    if (didU !== undefined) properties.did = didU;

    if (original_valueU !== undefined)
      properties.originalValue = original_valueU;

    return properties;
  });

  if (original_valueU !== undefined) {
    switch (currentU) {
      case "username":
        userParams.update((user) => {
          user.display_name = original_valueU;
          return user;
        });
        break;
      case "avatar":
        userParams.update((user) => {
          user.avatar_seed = original_valueU;
          return user;
        });
        break;
      case "deviceName":
        deviceParams.update((device) => {
          device.display_name = original_valueU;
          return device;
        });
        break;
      case "deviceType":
        deviceParams.update((device) => {
          device.type = original_valueU;
          return device;
        });
        break;
    }
  }

  ui("#dialog-edit");
};

export const checkProfanity = async () => {
  if (!browser || !get(userParams).display_name) return;
  profaneUsername.update((username) => {
    username.loading = true;
    return username;
  });
  try {
    const profane = await apiClient("http").checkProfanity(
      get(userParams).display_name,
    );
    profaneUsername.set({
      loading: false,
      profane: profane,
    });
  } catch (e: any) {
    console.warn(e);
    profaneUsername.set({ loading: false, profane: false });
  }
};

export const getProgress = (
  filetransfer_id: string,
  filetransfers: IncomingFiletransfer[],
) => {
  const filetransfer = filetransfers.find(
    (filetransfer) => filetransfer.id === filetransfer_id,
  );

  if (filetransfer !== undefined) {
    let received_chunks = 0;
    let total_chunks = 0;

    filetransfer.files.forEach((file) => {
      received_chunks = received_chunks + file.chunks.length;
      total_chunks = total_chunks + file.chunks_length;
    });

    const progress = received_chunks / total_chunks;

    return progress;
  } else {
    return 0;
  }
};

export const getPath = (pathU: string, pathStore?: string): Routes => {
  if (pathU.charAt(0) == "/") pathU = pathU.slice(1);

  const params = pathU.split("/");

  if (params.length <= 0 || params[0] == "") return { main: "home" };

  let object:
    | undefined
    | {
        main: "home" | "contacts" | "settings";
        sub?: "devices";
      } = undefined;

  if (params[0] == "contacts" || params[0] == "home")
    object = { main: params[0] };

  if (params[0] == "settings") {
    object = { main: "settings" };

    if (params.length > 1) {
      object.sub = "devices";
    }
  }

  if (object === undefined) {
    path.set({ main: "home" });
    return { main: "home" };
  } else {
    path.set(object);
    return object;
  }
};

export const changePath = async (route: Routes) => {
  let url: string;
  if (route.main == "home") {
    url = "/";
  } else if (route.main === "settings") {
    url = "/" + route.main + (route.sub !== undefined ? "/" + route.sub : "");
  } else {
    url = "/" + route.main;
  }

  pushState(url, get(page).state);
  path.set(route);
};

// Types & Interfaces

export type Routes = RoutesTop | RouteSettings;

export interface RoutesTop {
  main: "home" | "contacts";
}

export interface RouteSettings {
  main: "settings";
  sub?: "devices";
}

export type Notification =
  | NotificationRequest
  | NotificationReceiving
  | NotificationReceived;

export interface NotificationRequest {
  title: "File request";
  tag: string;
  body: string;
  data: {
    did: number;
    filetransfer_id: string;
    files: Request["files"];
  };
}

export interface NotificationReceiving {
  title: "Receiving file(s)";
  tag: string;
  body: string;
  data: { did: number; filetransfer_id: string };
}

export interface NotificationReceived {
  title: "File received";
  tag: string;
  body: string;
  data: {
    filename: string;
    url: string;
  };
}

export type EditOptions =
  | "deviceName"
  | "deviceType"
  | "username"
  | "linkingCode"
  | "avatar";
