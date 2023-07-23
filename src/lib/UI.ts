import { writable } from "svelte/store";
import { DeviceType } from "./common";

export const current = writable<"Home" | "Contacts" | "Settings">("Home");

// Edit dialog
export type edit_options = "deviceName" | "deviceType" | "username" | "linkingCode" | "avatar";

export const edit_current = writable<edit_options>("deviceName");
export const title = writable("");
export const linkingCode = writable("");

export const openDialog = (currentU: edit_options, titleU: string) => {
  edit_current.set(currentU);
  title.set(titleU);
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