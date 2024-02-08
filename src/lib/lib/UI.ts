import { browser } from "$app/environment";
import QRCode from "qrcode";
import { get, writable } from "svelte/store";

import type { IncomingFiletransfer, Request } from "$lib/sharing/common";

import { DeviceType } from "./common";
import {
  type IContact,
  type IDeviceInfo,
  type IDevices,
  type IUser,
} from "./fetchers";

export const current = writable<"Home" | "Contacts" | "Settings">("Home");
export const settings_page = writable<"main" | "devices" | "device">("main");
export const add_mode = writable<"contact" | "device">("contact");

// Setup values:
export const linkingCode = writable("");

// Personal infos:
export const own_did = writable<number>();

export const deviceParams = writable<{
  display_name: string;
  type: string;
}>({
  display_name: "",
  type: "",
});

export const userParams = writable({
  display_name: "",
  avatar_seed: "",
});

export const contacts = writable<IContact[]>([]);

export const devices = writable<IDevices>();

export const deviceInfos = writable<IDeviceInfo[]>();

export const user = writable<IUser>();

// Notifications
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

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
  data: { filetransfer_id: string };
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

export type Notification =
  | NotificationRequest
  | NotificationReceiving
  | NotificationReceived;

export const notifications = writable<Notification[]>([]);

export const addNotification = (
  notification: PartialBy<Notification, "tag">,
) => {
  // replace notifications with the same tag
  if (notification.tag !== undefined) deleteNotification(notification.tag);
  notifications.update((notifications) => {
    if (!("tag" in notification))
      notification.tag = Math.random().toString(36).substring(7);
    notifications.push(notification as Notification);
    return notifications;
  });
};

export const deleteNotification = (tag: string) => {
  notifications.update((notifications) =>
    notifications.filter((n) => n.tag != tag),
  );
};

// Contacts
export const code = writable("");

// Dialogs
export const addContactDialog = writable<HTMLDialogElement>();
export const editDialog = writable<HTMLDialogElement>();
export const notificationDialog = writable<HTMLDialogElement>();
export const qrCodeDialog = writable<HTMLDialogElement>();
export const sendDialog = writable<HTMLDialogElement>();

// Sending dialog
export const contactId = writable<number>();
export const deviceId = writable<number>();

// Edit dialog
export type edit_options =
  | "deviceName"
  | "deviceType"
  | "username"
  | "linkingCode"
  | "avatar";
export const edit_current = writable<edit_options>("deviceName");

export const title = writable("");
export const did = writable<number>();

export const original_value = writable("");

export const openDialog = (
  currentU: edit_options,
  titleU: string,
  original_valueU?: string,
  didU?: number,
) => {
  edit_current.set(currentU);
  title.set(titleU);

  if (didU !== undefined) did.set(didU);
  if (original_valueU !== undefined) {
    original_value.set(original_valueU);

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

// Setup/Settings page:
export const ValueToName = (value: string) => {
  for (const key in DeviceType) {
    // eslint-disable-next-line no-prototype-builtins
    if (DeviceType.hasOwnProperty(key)) {
      // @ts-ignore
      if (DeviceType[key] == value) {
        return key;
      }
    }
  }
};

// Profanity checking:
export const profaneUsername = writable<{ loading: boolean; profane: boolean }>(
  {
    loading: false,
    profane: false,
  },
);

export const updateIsProfaneUsername = async () => {
  if (!browser || !get(userParams).display_name) return;
  profaneUsername.set({ loading: true, profane: get(profaneUsername).profane });
  fetch("/api/checkIsUsernameProfane", {
    method: "POST",
    body: JSON.stringify({
      username: get(userParams).display_name,
    }),
  })
    .then((res) => res.json())
    .then((json: any) => {
      profaneUsername.set({
        loading: get(profaneUsername).loading,
        profane: json.isProfane,
      });
      profaneUsername.set({
        loading: false,
        profane: get(profaneUsername).profane,
      });
    })
    .catch((e) => {
      console.error(e);
      profaneUsername.set({ loading: false, profane: false });
    });
};

// Progress calculation:
export const returnProgress = (
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

// QR Code generation:
export const generateQRCode = async (link: string) => {
  try {
    return await QRCode.toDataURL(link);
  } catch (err: any) {
    throw new Error("Failed to generate QR code:", err);
  }
};
