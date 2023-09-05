import { get, writable } from "svelte/store";
import { DeviceType } from "./common";
import type { MaybePromise } from "@sveltejs/kit";
import type { IContact, IDeviceInfo, IDevices, IUser } from "./fetchers";
import { browser } from "$app/environment";

export const current = writable<"Home" | "Contacts" | "Settings">("Home");
export const settings_page = writable<"main" | "devices">("main");

// Setup values:
export const linkingCode = writable("");

// Personal infos:
export const own_did = writable<MaybePromise<number>>();

export const deviceParams = writable({
  displayName: "",
  type: "",
  encryptionPublicKey: "",
});

export const userParams = writable({
  displayName: "",
  avatarSeed: "",
});

export const contacts = writable<MaybePromise<IContact[]>>([]);

export const devices = writable<IDevices>();
export const devices_loaded = writable(false);

export const deviceInfos = writable<MaybePromise<IDeviceInfo[]>>();
export const deviceInfos_loaded = writable(false);

export const user = writable<MaybePromise<IUser>>();
export const user_loaded = writable(false);

// Notifications
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

interface NotificationAction {
  action: string;
  title: string;
}

export interface INotification {
  actions?: NotificationAction[];
  title: string;
  body?: string;
  data?: any;
  tag: string;
}
export const notifications = writable<INotification[]>([]);

export const addNotification = (
  notification: PartialBy<INotification, "tag">,
) => {
  // replace notifications with the same tag
  if ("tag" in notification && notification.tag)
    deleteNotification(notification.tag);
  notifications.update((notifications) => {
    if (!("tag" in notification))
      notification.tag = Math.random().toString(36).substring(7);
    notifications.push(notification as INotification);
    return notifications;
  });
};

export const deleteNotification = (tag: string) => {
  notifications.update((notifications) =>
    notifications.filter((n) => n.tag != tag),
  );
};

// Contacts
export const codehostname = writable("");

// Dialogs
export const addContactDialog = writable<HTMLDialogElement>();
export const editDialog = writable<HTMLDialogElement>();
export const notificationDialog = writable<HTMLDialogElement>();

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
          user.displayName = original_valueU;
          return user;
        });
        break;
      case "avatar":
        userParams.update((user) => {
          user.avatarSeed = original_valueU;
          return user;
        });
        break;
      case "deviceName":
        deviceParams.update((device) => {
          device.displayName = original_valueU;
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

export function updateIsProfaneUsername() {
  if (!browser || !get(userParams).displayName) return;
  profaneUsername.set({ loading: true, profane: get(profaneUsername).profane });
  fetch("/api/checkIsUsernameProfane", {
    method: "POST",
    body: JSON.stringify({
      username: get(userParams).displayName,
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
}

// Progress calculation:
export const returnProgress = (
  filetransfer_id: string,
  filetransfers: IIncomingFiletransfer[],
) => {
  const filetransfer = filetransfers.find(
    (filetransfer) => filetransfer.filetransfer_id === filetransfer_id,
  );

  if (filetransfer !== undefined) {
    let received_chunks = 0;
    let total_chunks = 0;

    filetransfer.files.forEach((file) => {
      received_chunks = received_chunks + file.chunks.length;
      total_chunks = total_chunks + file.chunk_number;
    });

    const progress = received_chunks / total_chunks;

    return progress;
  } else {
    return 0;
  }
};
