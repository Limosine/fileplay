import { page } from "$app/stores";
import { get } from "svelte/store";

import type {
  Contacts,
  Devices,
  GroupDevices,
  Groups,
  User,
} from "$lib/api/common";

import { rawFiles } from "./UI";

// User
export type IUser = User["data"];

// Devices
export type IDevices = Devices["data"];
export type IDeviceInfo = Contacts["data"][0]["devices"][0];

// Contacts
export type IContact = Contacts["data"][0];

// Groups
export type IGroup = Groups["data"][0];
export type IGroupDevice = GroupDevices["data"][0];

// Conversion
export const arrayToFileList = (files: File[]) => {
  const dataTransfer = new DataTransfer();

  for (const file of files) {
    dataTransfer.items.add(file);
  }

  return dataTransfer.files;
};

// Service worker
export const handleMessage = (
  event: MessageEvent<{ data: any; action: string }>,
) => {
  if (event.data.action == "load-data") {
    rawFiles.set(arrayToFileList(event.data.data));

    get(page).url.searchParams.delete("share-target");
  }
};
