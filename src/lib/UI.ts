import { writable } from "svelte/store";
import { DeviceType } from "./common";
import type { MaybePromise } from "@sveltejs/kit";
import type { IContact, IDeviceInfos, IDevices, IUser } from "./personal";

export const current = writable<"Home" | "Contacts" | "Settings">("Home");
export const settings_page = writable<"main" | "devices">("main");

// Setup values:
export const linkingCode = writable("");

// Personal infos:
export const own_did = writable<number>();

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

export const deviceInfos = writable<Promise<IDeviceInfos>>();
export const deviceInfos_loaded = writable(false);

export const user = writable<Promise<IUser>>();
export const user_loaded = writable(false);

// Edit dialog
export type edit_options = "deviceName" | "deviceType" | "username" | "linkingCode" | "avatar";
export const edit_current = writable<edit_options>("deviceName");

export const title = writable("");
export const did = writable<number>();

export const original_value = writable("");

export const openDialog = (currentU: edit_options, titleU: string, original_valueU?: string, didU?: number) => {
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
  for (var key in DeviceType) {
    if (DeviceType.hasOwnProperty(key)) {
      // @ts-ignore
      if (DeviceType[key] == value) {
        return key;
      }
    }
  }
};