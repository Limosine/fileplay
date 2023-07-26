import { writable } from "svelte/store";
import { DeviceType } from "./common";
import { deviceParams, userParams } from "./stores/Dialogs";

export const current = writable<"Home" | "Contacts" | "Settings">("Home");
export const settings_page = writable<"main" | "devices">("main");

// Edit dialog
export type edit_options = "deviceName" | "deviceType" | "username" | "linkingCode" | "avatar";

export const edit_current = writable<edit_options>("deviceName");
export const title = writable("");
export const original_value = writable("");
export const did = writable<number>();
export const linkingCode = writable("");

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